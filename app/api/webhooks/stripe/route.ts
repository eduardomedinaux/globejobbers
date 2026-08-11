import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyStripeSignature } from "@/lib/stripe";

// Carência sobre o fim do período pago: cobre atraso de renovação/retry de
// cartão sem derrubar o acesso no minuto exato.
const GRACE_DAYS = 3;

/**
 * Webhook do Stripe — a ÚNICA porta por onde pagamento vira acesso.
 *
 * Eventos tratados:
 * - checkout.session.completed → grava stripe_customer_id no profile
 *   (client_reference_id = user_id, setado no checkout).
 * - invoice.paid → plan = 'pro' e plan_expires_at = MAX(expiração atual,
 *   fim do período pago) + carência. Usar a data do período (e não "+30d")
 *   torna o handler IDEMPOTENTE: reprocessar o mesmo evento não estende
 *   duas vezes. O MAX preserva bônus de mentoria — grants e assinatura
 *   somam, nunca competem.
 *
 * Cancelamento não precisa de código: o plano expira sozinho na data e a
 * leitura degrada pra degustação (lib/plan.ts).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET ausente — webhook rejeitado.");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  // Assinatura é calculada sobre o corpo BRUTO — ler como texto, nunca json().
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(payload, signature, secret)) {
    console.error("STRIPE_WEBHOOK_BAD_SIGNATURE");
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }
  const object = event.data?.object ?? {};
  const admin = getSupabaseAdmin();

  if (event.type === "checkout.session.completed") {
    const userId = typeof object.client_reference_id === "string" ? object.client_reference_id : null;
    const customerId = typeof object.customer === "string" ? object.customer : null;
    if (userId && customerId) {
      const { error } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
      if (error) console.error("STRIPE_CUSTOMER_LINK_FAILED", { userId, customerId, error });
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === "invoice.paid") {
    const customerId = typeof object.customer === "string" ? object.customer : null;
    const customerEmail = typeof object.customer_email === "string" ? object.customer_email : null;

    // Fim do período pago: maior period.end entre as linhas da fatura.
    const lines = (object.lines as { data?: { period?: { end?: number } }[] } | undefined)?.data ?? [];
    const periodEndSec = lines.reduce((max, line) => Math.max(max, line.period?.end ?? 0), 0);
    if (!customerId || periodEndSec === 0) {
      console.error("STRIPE_INVOICE_UNPARSEABLE", { customerId, periodEndSec });
      return NextResponse.json({ received: true });
    }

    // Acha o profile: por customer id; fallback por e-mail (o invoice.paid
    // pode chegar antes do checkout.session.completed) — e faz o backfill.
    let { data: profile } = await admin
      .from("profiles")
      .select("id, plan_expires_at")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (!profile && customerEmail) {
      const { data: byEmail } = await admin
        .from("profiles")
        .select("id, plan_expires_at")
        .ilike("email", customerEmail)
        .maybeSingle();
      if (byEmail) {
        profile = byEmail;
        await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", byEmail.id);
      }
    }

    if (!profile) {
      // Pagou mas não achamos a conta — recuperação manual via logs.
      console.error("STRIPE_PAID_PROFILE_NOT_FOUND", { customerId, customerEmail });
      return NextResponse.json({ received: true });
    }

    const paidUntil = new Date(periodEndSec * 1000 + GRACE_DAYS * 24 * 60 * 60 * 1000);
    const current = profile.plan_expires_at ? new Date(profile.plan_expires_at as string) : null;
    const newExpiry = current && current > paidUntil ? current : paidUntil;

    const { error } = await admin
      .from("profiles")
      .update({ plan: "pro", plan_expires_at: newExpiry.toISOString() })
      .eq("id", profile.id);
    if (error) {
      console.error("STRIPE_PLAN_UPDATE_FAILED", { userId: profile.id, error });
      // 500 → o Stripe reentrega o evento (retry automático).
      return NextResponse.json({ error: "db error" }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  }

  // Evento não tratado: 200 pro Stripe não ficar reentregando.
  return NextResponse.json({ received: true });
}
