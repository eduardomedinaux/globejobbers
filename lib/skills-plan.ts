import type { MarketProfile, SkillsPlan, SkillsPlanItem } from "@/lib/types";

/**
 * Plano de skills do LinkedIn (17/set): quais skills garantir na lista e
 * quais fixar no topo. 100% DETERMINÍSTICO — cruza as keywords do Perfil de
 * Mercado (com recorrência nas vagas reais do usuário) com o texto do
 * perfil. Zero chamada de IA: sem custo por análise, sem variância, e cada
 * recomendação é auditável ("pedida 4x nas suas vagas").
 *
 * Regra de honestidade (a mesma NÃO INVENTAR das outras ferramentas):
 * - evidenciada no perfil → pode ir pra lista/topo;
 * - pedida nas vagas mas SEM evidência no perfil → é gap de
 *   desenvolvimento, NUNCA "adicione essa skill" (quebra na entrevista).
 */

const PIN_TOP = 5;
const MAX_EVIDENCED = 12;
const MAX_GAPS = 10;

/** minúsculas + sem acentos, pro match não falhar em "Gestão"/"gestao". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** O termo aparece no texto como palavra/expressão (não como pedaço de outra)? */
function appearsIn(normalizedText: string, normalizedTerm: string): boolean {
  if (!normalizedTerm) return false;
  const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}([^a-z0-9]|$)`);
  return re.test(normalizedText);
}

export function buildSkillsPlan(profileText: string, profile: MarketProfile): SkillsPlan {
  const text = normalize(profileText);

  // Grupos que fazem sentido como "skill" no LinkedIn (responsabilidades e
  // termos ATS ficam de fora — são frases, não skills de lista).
  const groups = [
    profile.keywords.hardSkills,
    profile.keywords.tools,
    profile.keywords.softSkills,
  ];

  const seen = new Set<string>();
  const candidates: SkillsPlanItem[] = [];
  for (const group of groups) {
    for (const keyword of group) {
      const key = normalize(keyword.term);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      candidates.push({ term: keyword.term, count: keyword.count });
    }
  }

  // Mais recorrente nas vagas primeiro — essa ordem É a recomendação.
  candidates.sort((a, b) => b.count - a.count);

  const evidenced: SkillsPlanItem[] = [];
  const gaps: SkillsPlanItem[] = [];
  for (const item of candidates) {
    (appearsIn(text, normalize(item.term)) ? evidenced : gaps).push(item);
  }

  return {
    pinTop: evidenced.slice(0, PIN_TOP),
    evidenced: evidenced.slice(PIN_TOP, PIN_TOP + MAX_EVIDENCED),
    gaps: gaps.slice(0, MAX_GAPS),
  };
}
