import { getSupabaseAdmin } from "@/lib/supabase";

// Plano efetivo do usuário. "Pro" só vale se não estiver expirado
// (plan_expires_at no futuro, ou null = sem prazo, controle manual).
// Pro expirado degrada pra "free" NA LEITURA — não fazemos downgrade de
// escrita no banco (o registro fica como histórico; um novo grant só
// estende a partir de agora).

export type Plan = "free" | "pro";

export interface PlanStatus {
  plan: Plan;
  /** ISO string ou null (sem prazo). Preenchido mesmo quando expirado. */
  expiresAt: string | null;
}

export function resolveEffectivePlan(plan: unknown, expiresAt: unknown): PlanStatus {
  const raw: Plan = plan === "pro" ? "pro" : "free";
  const exp = typeof expiresAt === "string" ? expiresAt : null;
  if (raw === "pro" && exp && new Date(exp).getTime() < Date.now()) {
    return { plan: "free", expiresAt: exp };
  }
  return { plan: raw, expiresAt: exp };
}

/** Fail-open pra "free": erro de leitura nunca trava o usuário num plano errado pra baixo. */
export async function getPlanStatus(userId: string): Promise<PlanStatus> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("PLAN_FETCH_FAILED", { userId, error });
    return { plan: "free", expiresAt: null };
  }
  return resolveEffectivePlan(data.plan, data.plan_expires_at);
}
