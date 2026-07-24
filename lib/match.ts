import type { CvMatchBreakdown, CvRequirement } from "@/lib/types";

// Fórmula do "Match com a vaga" (metodologia aprovada em 24/jul/2026):
//
//   peso:   obrigatório (must) = 2 · desejável (nice) = 1
//   fator:  strong = 100% · weak = 50% · missing = 0%
//   match = pontos obtidos / pontos totais
//
// Calculado AQUI, em código puro — nunca pelo modelo. O número é a soma
// visível da tabela de requisitos que o usuário vê na tela, e por isso é
// auditável ("74% = 8 bem representados · 3 parciais · 2 não encontrados").
//
// A projeção pós-adaptação usa a MESMA fórmula, promovendo a strong apenas
// os termos `weak` que a reescrita evidenciou (`promotedTerms`). Termos
// missing NUNCA sobem por reescrita — evidenciar o que existe é a única
// melhoria honesta possível.

const WEIGHT_POINTS: Record<CvRequirement["weight"], number> = {
  must: 2,
  nice: 1,
};

const STATUS_FACTOR: Record<CvRequirement["status"], number> = {
  strong: 1,
  weak: 0.5,
  missing: 0,
};

export function computeMatch(
  requirements: CvRequirement[],
  promotedTerms?: Set<string>,
): CvMatchBreakdown {
  let earnedPoints = 0;
  let totalPoints = 0;
  const counts = { strong: 0, weak: 0, missing: 0 };

  for (const req of requirements) {
    const points = WEIGHT_POINTS[req.weight];
    totalPoints += points;

    // Promoção só se aplica a weak → strong (missing nunca sobe aqui).
    const status =
      req.status === "weak" && promotedTerms?.has(req.term.toLowerCase())
        ? "strong"
        : req.status;

    counts[status] += 1;
    earnedPoints += points * STATUS_FACTOR[status];
  }

  return {
    percent: totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100),
    strong: counts.strong,
    weak: counts.weak,
    missing: counts.missing,
    earnedPoints,
    totalPoints,
  };
}
