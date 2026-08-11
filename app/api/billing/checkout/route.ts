import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createCheckoutSession, type BillingPlan } from "@/lib/stripe";

/**
 * Abre o Stripe Checkout pra assinatura (mensal/anual). O acesso em si só
 * é concedido pelo WEBHOOK (invoice.paid) — esta rota apenas leva a pessoa
 * pro pagamento.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  let plan: BillingPlan;
  try {
    const body = await request.json();
    plan = body.plan === "annual" ? "annual" : "monthly";
  } catch {
    plan = "monthly";
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("email, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const email = (profile?.email as string) || user.email || "";

  try {
    const { url } = await createCheckoutSession({
      userId: user.id,
      userEmail: email,
      customerId: (profile?.stripe_customer_id as string) ?? null,
      plan,
      origin: request.nextUrl.origin,
    });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("BILLING_CHECKOUT_FAILED", { userId: user.id, plan, error: String(error) });
    return NextResponse.json(
      { error: "Não foi possível abrir o pagamento agora. Tente novamente em instantes." },
      { status: 502 },
    );
  }
}
