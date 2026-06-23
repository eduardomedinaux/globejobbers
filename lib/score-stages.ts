import { SUBSCORE_META, type Subscores } from "@/lib/types";

// PROVISÓRIO: cortes e textos definidos sem dados reais de tráfego (ver
// CLAUDE.md "Métrica que importa nesta fase"). Recalibrar quando houver
// distribuição real de scores. Única fonte destes números — não duplicar em
// outro arquivo.
//
// Faixas fecham em `max` (inclusive) e são contínuas: a próxima faixa começa
// implicitamente em `max + 1` da anterior. getScoreStage() depende dessa
// ordem crescente para nunca deixar um score sem faixa.
export const SCORE_STAGES = [
  {
    max: 40,
    label: "Versão local",
    description:
      "Seu perfil fala com o mercado brasileiro; recrutador internacional ainda não entende seu valor.",
  },
  {
    max: 65,
    label: "Em transição",
    description: "Dá para começar, mas há lacunas claras que vão te filtrar.",
  },
  {
    max: 80,
    label: "Quase lá",
    description: "Competitivo; ajustes pontuais te colocam no radar.",
  },
  {
    max: 100,
    label: "Pronto para o mercado em dólar",
    description: "Seu perfil compete de igual para igual.",
  },
] as const;

export type ScoreStage = (typeof SCORE_STAGES)[number];

/** Sempre retorna uma faixa — o score é "clampado" a [0,100] por segurança. */
export function getScoreStage(score: number): ScoreStage {
  const clamped = Math.min(100, Math.max(0, score));
  return SCORE_STAGES.find((stage) => clamped <= stage.max) ?? SCORE_STAGES[SCORE_STAGES.length - 1];
}

// PROVISÓRIO, junto com SCORE_STAGES acima: só apontamos um "ponto mais
// fraco" quando ele de fato está baixo — abaixo disso, não inventamos um gap
// que não existe.
export const WEAK_SUBSCORE_THRESHOLD = 70;

export interface WeakestSubscore {
  key: keyof Subscores;
  label: string;
  value: number;
}

/** Retorna o subscore mais baixo, ou null se nenhum estiver abaixo do limite. */
export function getWeakestSubscore(subscores: Subscores): WeakestSubscore | null {
  let weakest: WeakestSubscore | null = null;

  for (const { key, label } of SUBSCORE_META) {
    const value = subscores[key];
    if (weakest === null || value < weakest.value) {
      weakest = { key, label, value };
    }
  }

  if (weakest === null || weakest.value >= WEAK_SUBSCORE_THRESHOLD) {
    return null;
  }
  return weakest;
}
