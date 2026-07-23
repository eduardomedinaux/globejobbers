// Tipos compartilhados entre o front (page.tsx, componentes) e as Route
// Handlers (app/api/**). Mantém o contrato da API em um único lugar.

export interface Subscores {
  headline: number;
  impactClarity: number;
  keywords: number;
  recruiterReadiness: number;
  english: number;
}

export interface AnalysisResult {
  /** Score Internacional, 0-100. */
  score: number;
  subscores: Subscores;
  headline: {
    /** Headline atual, extraída do perfil colado/PDF. */
    original: string;
    /** Headline reescrita, otimizada para recrutadores internacionais. */
    rewritten: string;
  };
  /** Keywords específicas identificadas/adicionadas (para UX de especificidade). */
  keywordHighlights: string[];
}

// Rótulos alinhados ao handoff de design. "recruiterReadiness" não tem
// equivalente exato no design (que chama essa posição de "Experiência
// remota", critério que o backend não calcula) — mantemos o rótulo real do
// que é avaliado em vez de nomear algo que não medimos.
/** Metadados para renderizar os subscores na UI, na ordem desejada. */
export const SUBSCORE_META: { key: keyof Subscores; label: string }[] = [
  { key: "headline", label: "Clareza da headline" },
  { key: "english", label: "Inglês profissional" },
  { key: "recruiterReadiness", label: "Prontidão para recrutador internacional" },
  { key: "keywords", label: "Palavras-chave p/ recrutadores" },
  { key: "impactClarity", label: "Prova de impacto" },
];

export interface HeadlineAnalysisResult {
  headlineScore: number;
  headline: {
    original: string;
    rewritten: string;
  };
}

export interface LeadPayload {
  email: string;
  rawProfile: string;
  score: number;
  source?: "ato1" | "ato2";
}

// --- Fase 2 (SaaS): ferramentas logadas, histórico e limites de uso ---

/** Identifica a ferramenta em `analyses.tool_type` e em lib/usage.ts. */
export type ToolType = "headline" | "cv_tailor" | "linkedin_review";

/** Label de exibição por ferramenta (ver app/(app)/history, dashboard). */
export const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  headline: "Headline Optimizer",
  cv_tailor: "CV Tailor",
  linkedin_review: "LinkedIn Review",
};

/**
 * Respostas do modo "perguntas guiadas" do Headline Optimizer logado —
 * usado quando o usuário ainda não tem uma headline pra colar (ver
 * lib/prompts.ts e app/api/tools/headline/route.ts).
 */
export interface HeadlineBuilderAnswers {
  currentRole: string;
  yearsOfExperience: number;
  specialty: string;
  keySkills: string[];
  targetIndustry: string;
  notableAchievement: string;
  seniorityLevel: string;
}

/** Resultado do CV Tailor (ver lib/prompts.ts e lib/anthropic.ts). */
export interface CvTailorResult {
  /** 0-100: o quão compatível o CV atual é com a vaga informada. */
  compatibilityScore: number;
  compatibilitySummary: string;
  keywordsFound: string[];
  keywordsMissing: string[];
  /** Versão adaptada do CV (texto completo, pronta pra copiar). */
  rewrittenCv: string;
  improvedBullets: string[];
  recommendations: string[];
}

// --- LinkedIn Review (Fase 2) ---

export type LinkedinReviewCategoryKey =
  | "headline"
  | "about"
  | "experience"
  | "keywords"
  | "internationalPositioning"
  | "recruiterClarity"
  | "proofOfImpact"
  | "englishReadiness";

/** Única fonte da ordem/lista das 8 categorias — usada tanto na validação
 * do output da IA (lib/anthropic.ts) quanto nos labels de exibição abaixo. */
export const LINKEDIN_REVIEW_CATEGORY_KEYS: LinkedinReviewCategoryKey[] = [
  "headline",
  "about",
  "experience",
  "keywords",
  "internationalPositioning",
  "recruiterClarity",
  "proofOfImpact",
  "englishReadiness",
];

export interface LinkedinReviewCategory {
  key: LinkedinReviewCategoryKey;
  score: number;
  diagnosis: string;
  recommendation: string;
  /** Exemplo melhorado — string vazia quando não se aplica à categoria. */
  example: string;
}

export interface LinkedinReviewResult {
  overallScore: number;
  categories: LinkedinReviewCategory[];
}

const LINKEDIN_REVIEW_CATEGORY_LABELS: Record<LinkedinReviewCategoryKey, string> = {
  headline: "Headline",
  about: "Seção Sobre",
  experience: "Experiências",
  keywords: "Palavras-chave",
  internationalPositioning: "Posicionamento internacional",
  recruiterClarity: "Clareza para recrutadores",
  proofOfImpact: "Prova de impacto",
  englishReadiness: "Prontidão em inglês",
};

/** Metadados pra renderizar as categorias na ordem certa (ver components/linkedin-review-result.tsx). */
export const LINKEDIN_REVIEW_CATEGORY_META: { key: LinkedinReviewCategoryKey; label: string }[] =
  LINKEDIN_REVIEW_CATEGORY_KEYS.map((key) => ({ key, label: LINKEDIN_REVIEW_CATEGORY_LABELS[key] }));


// --- Perfil de Mercado (ativo central — ver PROPOSTA-PERFIL-DE-MERCADO.md) ---
//
// Metodologia: a fonte de verdade é a DESCRIÇÃO DAS VAGAS que o usuário quer
// conquistar. O usuário informa só o cargo atual (opcional) e cola 1-5 vagas
// (texto ou URL); cargo-alvo, senioridade e mercado são INFERIDOS das vagas
// e apenas confirmados/editados na tela "Perfil identificado". Consumido
// pela headline hoje; CV Tailor, LinkedIn Review, Cover Letter e Interview
// Prep consomem o mesmo perfil no futuro.

export type TargetMarket = "us_remote" | "canada" | "europe" | "latam_remote" | "other";

export const TARGET_MARKET_OPTIONS: { value: TargetMarket; label: string }[] = [
  { value: "us_remote", label: "US Remote" },
  { value: "canada", label: "Canadá" },
  { value: "europe", label: "Europa" },
  { value: "latam_remote", label: "LatAm Remote" },
  { value: "other", label: "Outro / não identificado" },
];

export const TARGET_MARKET_LABELS: Record<TargetMarket, string> = Object.fromEntries(
  TARGET_MARKET_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<TargetMarket, string>;

export type HeadlineLanguage = "en" | "pt";

/** O que a IA identifica LENDO as vagas (nunca perguntado ao usuário). */
export interface MarketProfileIdentified {
  targetRole: string;
  seniority: string;
  targetMarket: TargetMarket;
}

/** Um termo extraído das vagas, com a prova da recorrência. */
export interface MarketKeyword {
  term: string;
  /** Em quantas das vagas fornecidas o termo aparece (1-5). */
  count: number;
  /** Índices 1-based das vagas onde o termo aparece. */
  jobs: number[];
}

export interface MarketProfileKeywords {
  hardSkills: MarketKeyword[];
  softSkills: MarketKeyword[];
  tools: MarketKeyword[];
  responsibilities: MarketKeyword[];
  atsTerms: MarketKeyword[];
}

/** Única fonte da ordem/labels dos grupos de keywords na UI. */
export const MARKET_KEYWORD_GROUP_META: { key: keyof MarketProfileKeywords; label: string }[] = [
  { key: "hardSkills", label: "Hard skills" },
  { key: "tools", label: "Ferramentas & tecnologias" },
  { key: "responsibilities", label: "Responsabilidades" },
  { key: "softSkills", label: "Soft skills" },
  { key: "atsTerms", label: "Termos ATS" },
];

/** Output da extração (lib/anthropic.ts → extractMarketProfile). */
export interface MarketProfileExtraction {
  identified: MarketProfileIdentified;
  keywords: MarketProfileKeywords;
}

/** Linha de `market_profiles` já normalizada pro front. */
export interface MarketProfile extends MarketProfileIdentified {
  id: string;
  /** Cargo atual informado pelo usuário (opcional — pode ser string vazia). */
  currentRole: string;
  language: HeadlineLanguage;
  keywords: MarketProfileKeywords;
  createdAt: string;
}

/** Uma das 2 variações de headline geradas a partir do perfil. */
export interface MarketHeadlineVariant {
  /** "keyword_dense": prioriza encontrabilidade; "fluid": mais natural. */
  style: "keyword_dense" | "fluid";
  text: string;
  /** Termos do Perfil de Mercado cobertos por esta variação. */
  keywordsCovered: string[];
}

export const MARKET_HEADLINE_STYLE_LABELS: Record<MarketHeadlineVariant["style"], string> = {
  keyword_dense: "Densa em keywords",
  fluid: "Mais fluida",
};

/**
 * Resultado da geração via Perfil de Mercado. `kind` distingue do
 * HeadlineAnalysisResult legado em `analyses.output_data` (ver
 * app/(app)/history/[id]/page.tsx).
 */
export interface MarketHeadlineResult {
  kind: "market";
  marketProfileId: string;
  variants: MarketHeadlineVariant[];
  /** Keywords críticas que NÃO couberam — vão pro About/Experiências. */
  keywordsLeftOut: string[];
  /** 1-2 frases explicando as escolhas (em pt-BR). */
  rationale: string;
}
