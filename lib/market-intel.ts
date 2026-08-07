import type {
  MarketIntelCount,
  MarketIntelJobExtraction,
  MarketIntelRegion,
  MarketIntelReport,
  MarketIntelSeniority,
} from "@/lib/types";

// Agregação do Market Intelligence — 100% código, zero modelo. Mesmo
// princípio do Match do CV Tailor: todo número que o usuário vê tem que ser
// reproduzível a partir das extrações. O Sonnet só ESCREVE sobre esses
// números (bloco 6), nunca os produz.

const TOP_TITLES = 6;
const TOP_SKILLS = 15;
const TOP_TOOLS = 10;
const TOP_RESPONSIBILITIES = 8;

/**
 * Normalização leve de termos pra contagem: caixa baixa, espaços colapsados,
 * pontuação de borda removida. (Canonicalização ESCO fica pra v2 — decisão
 * do MVP em claude/MVP-MARKET-INTELLIGENCE.md.)
 */
function termKey(term: string): string {
  return term
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[^a-z0-9à-ú]+|[^a-z0-9à-ú+#)]+$/gi, "")
    .trim();
}

/** Conta termos de um campo em todas as extrações; devolve top N com %. */
function countTerms(
  extractions: MarketIntelJobExtraction[],
  pick: (e: MarketIntelJobExtraction) => string[],
  top: number,
): MarketIntelCount[] {
  const counts = new Map<string, { display: string; count: number }>();
  for (const e of extractions) {
    // Set por vaga: o mesmo termo repetido numa JD conta uma vez.
    const perJob = new Set(pick(e).map(termKey).filter((t) => t.length > 1));
    perJob.forEach((key) => {
      const existing = counts.get(key);
      if (existing) existing.count++;
      else {
        // Display: primeira forma vista, com a capitalização original.
        const original = pick(e).find((t) => termKey(t) === key) ?? key;
        counts.set(key, { display: original.trim(), count: 1 });
      }
    });
  }
  const total = extractions.length || 1;
  const values: { display: string; count: number }[] = [];
  counts.forEach((v) => values.push(v));
  return values
    .sort((a, b) => b.count - a.count)
    .slice(0, top)
    .map(({ display, count }) => ({
      term: display,
      count,
      percent: Math.round((100 * count) / total),
    }));
}

export interface MarketIntelAggregates {
  jobsAnalyzed: number;
  titles: MarketIntelCount[];
  skills: MarketIntelCount[];
  tools: MarketIntelCount[];
  responsibilities: MarketIntelCount[];
  seniority: { level: MarketIntelSeniority; count: number; percent: number }[];
}

export function aggregateExtractions(extractions: MarketIntelJobExtraction[]): MarketIntelAggregates {
  const relevant = extractions.filter((e) => e.relevant);
  const total = relevant.length || 1;

  const seniorityCounts = new Map<MarketIntelSeniority, number>();
  for (const e of relevant) {
    seniorityCounts.set(e.seniority, (seniorityCounts.get(e.seniority) ?? 0) + 1);
  }
  const seniority: { level: MarketIntelSeniority; count: number; percent: number }[] = [];
  seniorityCounts.forEach((count, level) => {
    seniority.push({ level, count, percent: Math.round((100 * count) / total) });
  });
  seniority.sort((a, b) => b.count - a.count);

  return {
    jobsAnalyzed: relevant.length,
    titles: countTerms(relevant, (e) => [e.normalizedTitle], TOP_TITLES),
    skills: countTerms(relevant, (e) => e.skills, TOP_SKILLS),
    tools: countTerms(relevant, (e) => e.tools, TOP_TOOLS),
    responsibilities: countTerms(relevant, (e) => e.responsibilities, TOP_RESPONSIBILITIES),
    seniority,
  };
}

export function buildReport(
  role: string,
  region: MarketIntelRegion,
  jobsCollected: number,
  aggregates: MarketIntelAggregates,
  insights: string,
): MarketIntelReport {
  return {
    kind: "market_intel",
    role,
    region,
    jobsAnalyzed: aggregates.jobsAnalyzed,
    jobsCollected,
    generatedAt: new Date().toISOString(),
    titles: aggregates.titles,
    skills: aggregates.skills,
    tools: aggregates.tools,
    responsibilities: aggregates.responsibilities,
    seniority: aggregates.seniority,
    insights,
  };
}

/** Cargo normalizado pra chave de cache (cargo × região, TTL na tabela). */
export function cacheKeyRole(role: string): string {
  return role.toLowerCase().replace(/\s+/g, " ").trim();
}
