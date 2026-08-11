import { createHmac, timingSafeEqual } from "crypto";

// Integração Stripe via REST puro (sem SDK): menos uma dependência, e o que
// usamos são 3 chamadas simples (checkout session, portal session) + a
// verificação de assinatura do webhook (HMAC documentado pelo Stripe).
// Server-only: STRIPE_SECRET_KEY vive em .env.local / Vercel env.
//
// PRINCÍPIO (ver plano aprovado em 07/ago): o Stripe nunca é fonte de
// verdade de acesso — ele só escreve em profiles.plan/plan_expires_at via
// webhook. Se o Stripe cair, ninguém perde acesso; o plano expira na data.

const STRIPE_API = "https://api.stripe.com/v1";

function requireKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada no ambiente.");
  return key;
}

async function stripeRequest<T>(path: string, params: URLSearchParams): Promise<T> {
  const res = await fetch(`${STRIPE_API}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    const message =
      typeof data?.error?.message === "string" ? data.error.message : `Stripe HTTP ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export type BillingPlan = "monthly" | "annual";

export function priceIdFor(plan: BillingPlan): string {
  const id = plan === "annual" ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY;
  if (!id) throw new Error(`Price do Stripe não configurado pro plano ${plan}.`);
  return id;
}

/**
 * Cria a Checkout Session de assinatura. Promo codes habilitados (cupons de
 * VIP/teste nascem no painel do Stripe). client_reference_id carrega o
 * user_id pro webhook casar o customer com o profile.
 */
export async function createCheckoutSession(options: {
  userId: string;
  userEmail: string;
  /** Customer existente (renovação/troca de plano) — senão o Stripe cria. */
  customerId: string | null;
  plan: BillingPlan;
  origin: string;
}): Promise<{ url: string }> {
  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceIdFor(options.plan),
    "line_items[0][quantity]": "1",
    success_url: `${options.origin}/dashboard?checkout=success`,
    cancel_url: `${options.origin}/assinatura`,
    allow_promotion_codes: "true",
    client_reference_id: options.userId,
    "subscription_data[metadata][user_id]": options.userId,
  });
  if (options.customerId) params.set("customer", options.customerId);
  else params.set("customer_email", options.userEmail);

  const session = await stripeRequest<{ url?: string }>("checkout/sessions", params);
  if (!session.url) throw new Error("Stripe não retornou a URL do checkout.");
  return { url: session.url };
}

/** Customer Portal: trocar cartão, cancelar, faturas — zero UI nossa. */
export async function createPortalSession(customerId: string, origin: string): Promise<{ url: string }> {
  const params = new URLSearchParams({
    customer: customerId,
    return_url: `${origin}/account`,
  });
  const session = await stripeRequest<{ url?: string }>("billing_portal/sessions", params);
  if (!session.url) throw new Error("Stripe não retornou a URL do portal.");
  return { url: session.url };
}

/**
 * Verificação da assinatura do webhook (formato documentado: header
 * "Stripe-Signature: t=...,v1=...,v1=..."; esperado = HMAC-SHA256 do
 * payload "t.corpo" com o signing secret). Tolerância de 5 min contra
 * replay. Comparação em tempo constante.
 */
export function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  let timestamp = "";
  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value ?? "";
    if (key === "v1" && value) signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, "utf8");
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
}
