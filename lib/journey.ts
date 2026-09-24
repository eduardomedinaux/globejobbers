import { getSupabaseAdmin } from "@/lib/supabase";

// Jornada do dashboard (19/set, referência fal.ai "Getting started"): cada
// passo tem um check VERIFICÁVEL no banco — nada de estado declarado.
// "LinkedIn no ponto" usa a régua que já existe no produto: score 80+
// (estágio "Pronto para o mercado em dólar" começa em 81; 80 é o teto de
// "Quase lá" — arredondamos pra baixo de propósito, meta alcançável).

export const JOURNEY_READY_SCORE = 80;

export interface JourneyStatus {
  hasReview: boolean;
  /** Score do Review MAIS RECENTE (não o melhor) — a jornada mede o agora. */
  latestReviewScore: number | null;
  hasCvTailor: boolean;
  hasInterviewPrep: boolean;
}

export async function getJourneyStatus(userId: string): Promise<JourneyStatus> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("analyses")
    .select("tool_type, score, created_at")
    .eq("user_id", userId)
    .in("tool_type", ["linkedin_review", "cv_tailor", "interview_prep"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    // Fail-open: sem dados a jornada aparece zerada — nunca quebra o dashboard.
    if (error) console.error("JOURNEY_STATUS_FAILED", { userId, error });
    return { hasReview: false, latestReviewScore: null, hasCvTailor: false, hasInterviewPrep: false };
  }

  const latestReview = data.find((row) => row.tool_type === "linkedin_review");
  return {
    hasReview: Boolean(latestReview),
    latestReviewScore: typeof latestReview?.score === "number" ? latestReview.score : null,
    hasCvTailor: data.some((row) => row.tool_type === "cv_tailor"),
    hasInterviewPrep: data.some((row) => row.tool_type === "interview_prep"),
  };
}
