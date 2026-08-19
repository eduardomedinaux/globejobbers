import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Bônus da mentoria Carreira em Dólar: 30 dias de Pro (decisão de 05/ago).
const GRANT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Webhook da Hotmart (Webhook 2.0) — a ponte mentoria → GlobeJobbers Pro.
 *
 * Autenticação: a Hotmart manda o "hottok" (token fixo mostrado na tela de
 * configuração do webhook) no header X-HOTMART-HOTTOK. Comparação em tempo
 * constante contra HOTMART_HOTTOK (env). Não é HMAC como o Stripe — é o
 * mecanismo que a Hotmart oferece.
 *
 * Eventos tratados:
 * - PURCHASE_APPROVED → insere grant de 30 dias em pro_grants (email do
 *   comprador, source='hotmart', external_ref=transação). O resgate em si
 *   acontece no próximo login com aquele e-mail (app/auth/callback) — mesma
 *   fila dos grants de beta. IDEMPOTENTE por external_ref: a Hotmart
 *   reentrega até 5x e reprocessar não duplica o bônus.
 * - PURCHASE_REFUNDED / PURCHASE_CHARGEBACK → revoga o grant da transação
 *   (arrependimento nos 7 dias do CDC = perde o bônus). Se ainda não foi
 *   resgatado, marcar revoked_at basta (o resgate ignora revogados); se já
 *   foi, desconta os dias do plan_expires_at de quem resgatou — como grants
 *   e assinatura SOMAM, o desconto remove exatamente a extensão do bônus,
 *   nunca tempo pago no Stripe.
 * - "Reembolso solicitado" (PURCHASE_PROTEST) NÃO revoga — só o reembolso
 *   consumado. Demais eventos: 200 sem ação (senão a Hotmart fica
 *   reentregando).
 *
 * Payload 2.0 (campos que usamos — parser tolerante; validar com o evento
 * de teste do painel antes de venda real): { event, data: { buyer: { email },
 * purchase: { transaction } } }.
 */

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

type HotmartEvent = {
  event?: string;
  data?: {
    buyer?: { email?: string };
    purchase?: { transaction?: string };
    product?: { id?: number | string; name?: string };
  };
};

export async function POST(request: NextRequest) {
  const hottok = process.env.HOTMART_HOTTOK;
  if (!hottok) {
    console.error("HOTMART_HOTTOK ausente — webhook rejeitado.");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const received = request.headers.get("x-hotmart-hottok");
  if (!received || !safeEqual(received, hottok)) {
    console.error("HOTMART_WEBHOOK_BAD_HOTTOK");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let event: HotmartEvent;
  try {
    event = (await request.json()) as HotmartEvent;
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const type = typeof event.event === "string" ? event.event : "";
  const email = (event.data?.buyer?.email ?? "").trim();
  const transaction = (event.data?.purchase?.transaction ?? "").trim();
  const admin = getSupabaseAdmin();

  if (type === "PURCHASE_APPROVED") {
    if (!email || !transaction) {
      // Payload fora do esperado: reentregar não vai melhorar — loga pra
      // recuperação manual (Runtime Logs) e devolve 200.
      console.error("HOTMART_APPROVED_UNPARSEABLE", { email, transaction });
      return NextResponse.json({ received: true });
    }

    const { data: existing } = await admin
      .from("pro_grants")
      .select("id")
      .eq("external_ref", transaction)
      .limit(1)
      .maybeSingle();
    if (existing) {
      // Reentrega da Hotmart — grant já existe, nada a fazer.
      return NextResponse.json({ received: true });
    }

    const { error } = await admin.from("pro_grants").insert({
      email,
      days: GRANT_DAYS,
      source: "hotmart",
      external_ref: transaction,
    });
    if (error) {
      console.error("HOTMART_GRANT_INSERT_FAILED", { email, transaction, error });
      // 500 → a Hotmart reentrega (retry automático).
      return NextResponse.json({ error: "db error" }, { status: 500 });
    }
    console.log("HOTMART_GRANT_CREATED", { email, transaction, days: GRANT_DAYS });
    return NextResponse.json({ received: true });
  }

  if (type === "PURCHASE_REFUNDED" || type === "PURCHASE_CHARGEBACK") {
    if (!transaction) {
      console.error("HOTMART_REFUND_UNPARSEABLE", { type, email });
      return NextResponse.json({ received: true });
    }

    const { data: grant } = await admin
      .from("pro_grants")
      .select("id, days, claimed_at, claimed_by, revoked_at")
      .eq("external_ref", transaction)
      .limit(1)
      .maybeSingle();

    if (!grant) {
      // Compra anterior ao webhook (grant manual sem external_ref) ou
      // transação desconhecida — resolver à mão via Runtime Logs.
      console.error("HOTMART_REFUND_GRANT_NOT_FOUND", { type, transaction, email });
      return NextResponse.json({ received: true });
    }
    if (grant.revoked_at) {
      // Reentrega — já revogado (e o desconto, se houve, já foi aplicado).
      return NextResponse.json({ received: true });
    }

    const { error: revokeError } = await admin
      .from("pro_grants")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", grant.id);
    if (revokeError) {
      console.error("HOTMART_REVOKE_FAILED", { transaction, revokeError });
      return NextResponse.json({ error: "db error" }, { status: 500 });
    }

    // Já resgatado → desconta os dias do bônus da expiração de quem resgatou.
    if (grant.claimed_at && grant.claimed_by) {
      const { data: profile } = await admin
        .from("profiles")
        .select("plan_expires_at")
        .eq("id", grant.claimed_by)
        .maybeSingle();
      if (profile?.plan_expires_at) {
        const days = Number(grant.days) || GRANT_DAYS;
        const newExpiry = new Date(
          new Date(profile.plan_expires_at as string).getTime() - days * DAY_MS,
        ).toISOString();
        const { error: expiryError } = await admin
          .from("profiles")
          .update({ plan_expires_at: newExpiry, updated_at: new Date().toISOString() })
          .eq("id", grant.claimed_by);
        if (expiryError) {
          // Grant já está revogado (não volta a somar); só o desconto falhou.
          // Corrigir à mão via Runtime Logs em vez de arriscar reentrega
          // descontando duas vezes.
          console.error("HOTMART_REVOKE_DISCOUNT_FAILED", {
            transaction,
            userId: grant.claimed_by,
            expiryError,
          });
        }
      }
    }
    console.log("HOTMART_GRANT_REVOKED", {
      type,
      transaction,
      claimed: Boolean(grant.claimed_at),
    });
    return NextResponse.json({ received: true });
  }

  // Evento não tratado (PURCHASE_COMPLETE, PROTEST, boleto etc.): 200.
  return NextResponse.json({ received: true });
}
