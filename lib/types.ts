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
export type ToolType =
  | "market_intel"
  | "headline"
  | "cv_tailor"
  | "linkedin_review"
  | "networking"
  | "post";

/** Label de exibição por ferramenta (ver app/(app)/history, dashboard). */
export const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  market_intel: "Market Intelligence",
  headline: "Headline Optimizer",
  cv_tailor: "CV Tailor",
  linkedin_review: "LinkedIn Review",
  networking: "Mensagens de Networking",
  post: "Criador de Posts",
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
  /** As vagas que montaram o perfil (só título/tamanho — texto fica no banco). */
  sourceJobs: { index: number; title: string; chars: number }[];
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

// --- CV Tailor v2 (JD como fonte de verdade + match auditável) ---
//
// Princípio de produto: o GlobeJobbers não escreve um CV genérico. Ele
// entende uma vaga, compara com a experiência REAL do candidato e
// reposiciona o CV sem inventar qualificações. O match é calculado em
// código (lib/match.ts), nunca pelo modelo.

export type CvRequirementGroup = "hardSkill" | "tool" | "softSkill" | "responsibility";
export type CvRequirementWeight = "must" | "nice";
export type CvRequirementStatus = "strong" | "weak" | "missing";

export const CV_REQUIREMENT_STATUS_LABELS: Record<CvRequirementStatus, string> = {
  strong: "Bem representadas no seu CV",
  weak: "Presentes, mas pouco evidentes",
  missing: "Não encontradas no CV",
};

/** O que a IA identifica LENDO a job description (nunca perguntado). */
export interface CvJobProfile {
  role: string;
  seniority: string;
  area: string;
  /** Contexto relevante da empresa/vaga em 1-2 frases. */
  context: string;
}

/** Um requisito da vaga, classificado contra o CV com evidência literal. */
export interface CvRequirement {
  term: string;
  group: CvRequirementGroup;
  /** "must" = a vaga exige; "nice" = desejável. Define o peso (2 vs 1). */
  weight: CvRequirementWeight;
  /** strong/weak exigem `evidence` (citação do CV); missing = sem evidência. */
  status: CvRequirementStatus;
  evidence: string;
}

/** Resultado da fórmula de lib/match.ts — todos os números auditáveis. */
export interface CvMatchBreakdown {
  percent: number;
  strong: number;
  weak: number;
  missing: number;
  earnedPoints: number;
  totalPoints: number;
}

/** Uma mudança da adaptação, explicada (seção → o que mudou e por quê). */
export interface CvChange {
  section: string;
  change: string;
}

/**
 * Resultado do CV Tailor v2. `kind` distingue do CvTailorResult legado em
 * `analyses.output_data` (ver app/(app)/history/[id]/page.tsx).
 */
export interface CvTailorResultV2 {
  kind: "cv_tailor_v2";
  job: CvJobProfile;
  requirements: CvRequirement[];
  /** Match do CV atual (calculado em código a partir de `requirements`). */
  matchBefore: CvMatchBreakdown;
  /** Projeção pós-adaptação: MESMA fórmula, promovendo só os weak evidenciados. */
  matchAfter: CvMatchBreakdown;
  /** Termos weak que a reescrita tornou evidentes (base da projeção). */
  evidencedTerms: string[];
  changes: CvChange[];
  rewrittenCv: string;
  recommendations: string[];
}

// --- Mensagens de Networking (apoio direto à mentoria) ---
//
// Metodologia: mensagem curta, específica e sem pedir emprego de cara.
// Consome o Perfil de Mercado quando existe (posicionamento pro alvo).

export type NetworkingRecipient = "recruiter" | "hiring_manager" | "employee" | "alumni";

export const NETWORKING_RECIPIENT_OPTIONS: { value: NetworkingRecipient; label: string }[] = [
  { value: "recruiter", label: "Recrutador(a)" },
  { value: "hiring_manager", label: "Hiring manager da vaga" },
  { value: "employee", label: "Funcionário(a) da empresa-alvo" },
  { value: "alumni", label: "Conexão em comum / alumni" },
];

export interface NetworkingResult {
  kind: "networking";
  /** Nota de conexão — máx. 300 caracteres (limite real do LinkedIn). */
  connectionNote: string;
  /** Mensagem de follow-up após o aceite (dar antes de pedir). */
  followUpMessage: string;
  /** Versão longa para InMail/e-mail. */
  inmailVersion: string;
  /** 1-2 frases (pt-BR) explicando a estratégia da abordagem. */
  rationale: string;
}

// --- Criador de Posts (apoio direto à mentoria) ---
//
// Posts que constroem autoridade nas keywords do mercado-alvo, a partir de
// uma história/tema REAL contado pelo usuário — nunca inventamos vivência.

export interface PostVariant {
  /** "story": narrativa pessoal; "insight": opinião/lição direta. */
  style: "story" | "insight";
  text: string;
}

export const POST_STYLE_LABELS: Record<PostVariant["style"], string> = {
  story: "Narrativa pessoal",
  insight: "Insight direto",
};

export interface PostResult {
  kind: "post";
  variants: PostVariant[];
  hashtags: string[];
  /** 1-2 frases (pt-BR) explicando o posicionamento escolhido. */
  rationale: string;
}

/** Referência leve às vagas que montaram o perfil (sem o texto completo). */
export interface MarketProfileJobRef {
  index: number;
  /** Primeira linha da vaga — normalmente o título. */
  title: string;
  chars: number;
}

// --- Market Intelligence (passo 1 da jornada — ver claude/MVP-MARKET-INTELLIGENCE.md) ---
//
// O usuário informa cargo + região; o sistema coleta centenas de vagas
// reais (JSearch), extrai estrutura com IA e AGREGA EM CÓDIGO (números
// auditáveis, mesmo princípio do Match). O bloco de insight (Sonnet) é
// escrito A PARTIR dos percentuais calculados — nunca inventa números.
// Exatamente 6 blocos. Sem gráficos, sem PDF, sem empresas, sem salário.

export type MarketIntelRegion = "us" | "europe" | "latam" | "br";

export const MARKET_INTEL_REGION_OPTIONS: { value: MarketIntelRegion; label: string }[] = [
  { value: "us", label: "Estados Unidos (remoto)" },
  { value: "europe", label: "Europa (remoto)" },
  { value: "latam", label: "LATAM (remoto)" },
  { value: "br", label: "Brasil" },
];

export const MARKET_INTEL_REGION_LABELS: Record<MarketIntelRegion, string> = Object.fromEntries(
  MARKET_INTEL_REGION_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<MarketIntelRegion, string>;

export type MarketIntelSeniority = "junior" | "mid" | "senior" | "lead_plus" | "unclear";

export const MARKET_INTEL_SENIORITY_LABELS: Record<MarketIntelSeniority, string> = {
  junior: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
  lead_plus: "Lead / Principal+",
  unclear: "Não especificada",
};

/** Extração estruturada de UMA vaga (Haiku, em lotes — ver lib/anthropic.ts). */
export interface MarketIntelJobExtraction {
  /** false = a vaga não é do cargo pesquisado (ex.: Apparel Designer em busca de Product Designer). */
  relevant: boolean;
  /** Título normalizado (sem senioridade/localização): "Product Designer". */
  normalizedTitle: string;
  seniority: MarketIntelSeniority;
  skills: string[];
  tools: string[];
  responsibilities: string[];
}

/** Um item de ranking com a contagem auditável. */
export interface MarketIntelCount {
  term: string;
  count: number;
  /** % sobre as vagas relevantes analisadas. */
  percent: number;
}

/** O relatório final — `kind` discrimina em `analyses.output_data`. */
export interface MarketIntelReport {
  kind: "market_intel";
  role: string;
  region: MarketIntelRegion;
  /** Vagas únicas e relevantes que sustentam os números. */
  jobsAnalyzed: number;
  /** Vagas únicas coletadas antes do filtro de relevância. */
  jobsCollected: number;
  generatedAt: string;
  /** Bloco 1 — como o mercado chama esse cargo. */
  titles: MarketIntelCount[];
  /** Bloco 2 — skills mais pedidas. */
  skills: MarketIntelCount[];
  /** Bloco 3 — ferramentas mais pedidas. */
  tools: MarketIntelCount[];
  /** Bloco 4 — responsabilidades mais frequentes. */
  responsibilities: MarketIntelCount[];
  /** Bloco 5 — distribuição de senioridade. */
  seniority: { level: MarketIntelSeniority; count: number; percent: number }[];
  /** Bloco 6 — "O que mais chamou atenção" (Sonnet, a partir dos números acima). */
  insights: string;
}
