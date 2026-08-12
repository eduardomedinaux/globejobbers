import { getSupabaseAdmin } from "@/lib/supabase";
import { fetchActiveSubscriptionPeriodEnd, findCustomerIdByEmail } from "@/lib/stripe";

// Mesma carência do webhook (app/api/webhooks/stripe).
const GRACE_DAYS = 3;

/**
 * Plano B do pagamento: consulta o Stripe DIRETAMENTE e aplica o plano.
 * Usado quando o usuário volta do checkout (dashboard?checkout=success) —
 * o acesso não fica refém da entrega do webhook no momento em que a pessoa
 * está olhando pra tela. O webhook segue como caminho primário (renovações).
 * Fail-open: qualquer erro aqui só loga — nunca quebra o dashboard.
 */
export async function syncStripeForUser(userId: string, email: string): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("plan_expires_at, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    let customerId: string | null = (profile?.stripe_customer_id as string | null) ?? null;
    if (!customerId && email) {
      customerId = await findCustomerIdByEmail(email);
      if (customerId) {
        await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
      }
    }
    if (!customerId) {
      console.warn("BILLING_SYNC_NO_CUSTOMER", { userId, email });
      return;
    }

    const periodEndSec = await fetchActiveSubscriptionPeriodEnd(customerId);
    if (!periodEndSec) {
      console.warn("BILLING_SYNC_NO_ACTIVE_SUBSCRIPTION", { userId, customerId });
      return;
    }

    const paidUntil = new Date(periodEndSec * 1000 + GRACE_DAYS * 24 * 60 * 60 * 1000);
    const current = profile?.plan_expires_at ? new Date(profile.plan_expires_at as string) : null;
    const newExpiry = current && current > paidUntil ? current : paidUntil;

    const { error } = await admin
      .from("profiles")
      .update({ plan: "pro", plan_expires_at: newExpiry.toISOString() })
      .eq("id", userId);
    if (error) console.error("BILLING_SYNC_UPDATE_FAILED", { userId, error });
    else console.log("BILLING_SYNC_APPLIED", { userId, customerId, until: newExpiry.toISOString() });
  } catch (error) {
    console.error("BILLING_SYNC_FAILED", { userId, error: String(error) });
  }
}
