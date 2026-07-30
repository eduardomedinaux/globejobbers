import { getSupabaseAdmin } from "@/lib/supabase";
import { getPlanStatus, type Plan } from "@/lib/plan";
import type { ToolType } from "@/lib/types";

/** Limites gratuitos mensais por ferramenta (ver CLAUDE.md / spec da Fase 2). */
export const FREE_LIMITS: Record<ToolType, number> = {
  headline: 3,
  cv_tailor: 2,
  linkedin_review: 1,
  networking: 3,
  post: 3,
};

/**
 * Limites do plano Pro (mentoria/beta — decisão de 24/jul/2026): altos o
 * bastante pra parecerem ilimitados no uso real, com teto que protege o
 * custo de API (conta Anthropic pré-paga, recarga automática desligada).
 */
export const PRO_LIMITS: Record<ToolType, number> = {
  headline: 30,
  cv_tailor: 20,
  linkedin_review: 10,
  networking: 30,
  post: 30,
};

export const PLAN_LIMITS: Record<Plan, Record<ToolType, number>> = {
  free: FREE_LIMITS,
  pro: PRO_LIMITS,
};

function startOfCurrentMonthUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * Conta quantas análises dessa ferramenta o usuário já rodou no mês
 * corrente (calendário, UTC). Sem tabela `usage_limits` separada — mais
 * simples que manter um contador replicado (ver plano da Fase 2).
 */
export async function getMonthlyUsage(userId: string, toolType: ToolType): Promise<number> {
  const admin = getSupabaseAdmin();
  const { count, error } = await admin
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("tool_type", toolType)
    .gte("created_at", startOfCurrentMonthUTC());

  if (error) {
    // Fail-open: erro ao contar não deve travar o usuário num limite falso.
    // Mesma tolerância a falha usada em /api/leads.
    console.error("USAGE_COUNT_FAILED", { userId, toolType, error });
    return 0;
  }
  return count ?? 0;
}

export interface UsageStatus {
  used: number;
  limit: number;
  remaining: number;
  limitReached: boolean;
  plan: Plan;
}

/**
 * Status de uso considerando o PLANO EFETIVO do usuário (pro expirado
 * conta como free — ver lib/plan.ts). `plan` pode ser passado quando o
 * chamador já o tem (evita a query extra); sem ele, buscamos aqui.
 */
export async function getUsageStatus(
  userId: string,
  toolType: ToolType,
  plan?: Plan,
): Promise<UsageStatus> {
  const effectivePlan = plan ?? (await getPlanStatus(userId)).plan;
  const limit = PLAN_LIMITS[effectivePlan][toolType];
  const used = await getMonthlyUsage(userId, toolType);
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    limitReached: used >= limit,
    plan: effectivePlan,
  };
}
