import { getSupabaseAdmin } from "@/lib/supabase";
import { captureServerEvent } from "@/lib/posthog-server";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Resgata as concessões de Pro pendentes (`pro_grants`) pro e-mail do
 * usuário e estende o plano. Chamado no login (app/auth/callback) E a cada
 * render da área logada (app/(app)/layout) — o segundo caso existe por causa
 * dos grants com `starts_at` no futuro (workshop: o bônus só começa no dia
 * da aula). Quem comprou antes e já está logado não passa de novo pelo
 * callback; sem o resgate no layout, o bônus nunca entraria.
 *
 * Resgatável = não resgatado, não revogado e (sem starts_at OU starts_at já
 * passou). O resgate marca claimed_at com um UPDATE condicionado a
 * `claimed_at is null` e só soma os dias das linhas que ESTE request
 * conseguiu marcar — dois renders simultâneos não estendem duas vezes.
 *
 * Nunca lança: erro aqui não pode bloquear login nem a área logada.
 */
export async function claimPendingGrants(userId: string, rawEmail: string | null | undefined): Promise<void> {
  const email = (rawEmail ?? "").trim();
  if (!email) return;
  const admin = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  try {
    // .ilike sem curinga = igualdade case-insensitive.
    const { data: pending, error: pendingError } = await admin
      .from("pro_grants")
      .select("id")
      .is("claimed_at", null)
      .is("revoked_at", null)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .ilike("email", email);
    if (pendingError) {
      console.error("PRO_GRANT_LOOKUP_FAILED", { userId, pendingError });
      return;
    }
    if (!pending || pending.length === 0) return;

    const { data: claimed, error: claimError } = await admin
      .from("pro_grants")
      .update({ claimed_at: nowIso, claimed_by: userId })
      .in(
        "id",
        pending.map((g) => g.id),
      )
      .is("claimed_at", null)
      .select("id, days");
    if (claimError) {
      console.error("PRO_GRANT_CLAIM_FAILED", { userId, claimError });
      return;
    }
    if (!claimed || claimed.length === 0) return; // outro request levou

    const totalDays = claimed.reduce((sum, g) => sum + (Number(g.days) || 30), 0);

    const { data: profile } = await admin
      .from("profiles")
      .select("plan, plan_expires_at")
      .eq("id", userId)
      .maybeSingle();
    // Estende a partir da expiração futura existente (grants somam), ou de agora.
    const currentExpiry =
      profile?.plan === "pro" && profile.plan_expires_at ? new Date(profile.plan_expires_at as string) : null;
    const base = currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
    const expiresAt = new Date(base.getTime() + totalDays * DAY_MS).toISOString();

    const { error: planError } = await admin
      .from("profiles")
      .update({ plan: "pro", plan_expires_at: expiresAt, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (planError) {
      // Desfaz a marcação pra o grant voltar à fila no próximo render.
      console.error("PRO_GRANT_APPLY_FAILED", { userId, planError, grantIds: claimed.map((g) => g.id) });
      await admin
        .from("pro_grants")
        .update({ claimed_at: null, claimed_by: null })
        .in(
          "id",
          claimed.map((g) => g.id),
        );
      return;
    }

    await captureServerEvent(userId, "pro_grant_claimed", { grants: claimed.length, days: totalDays });
  } catch (err) {
    console.error("PRO_GRANT_UNEXPECTED", { userId, err });
  }
}
