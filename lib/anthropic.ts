import Anthropic from "@anthropic-ai/sdk";
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_TOOL,
  buildAnalysisUserPrompt,
  buildHeadlineBuilderUserPrompt,
  buildHeadlineTextUserPrompt,
  buildLinkedinReviewUserPrompt,
  CV_JOB_ANALYSIS_SYSTEM_PROMPT,
  CV_JOB_ANALYSIS_TOOL,
  CV_REWRITE_SYSTEM_PROMPT,
  CV_REWRITE_TOOL,
  buildCvJobAnalysisUserPrompt,
  buildCvRewriteUserPrompt,
  HEADLINE_BUILDER_SYSTEM_PROMPT,
  HEADLINE_TEXT_SYSTEM_PROMPT,
  HEADLINE_TEXT_TOOL,
  HEADLINE_FROM_MARKET_SYSTEM_PROMPT,
  HEADLINE_FROM_MARKET_TOOL,
  HEADLINE_VISION_SYSTEM_PROMPT,
  HEADLINE_VISION_TOOL,
  LINKEDIN_REVIEW_SYSTEM_PROMPT,
  LINKEDIN_REVIEW_TOOL,
  MARKET_PROFILE_SYSTEM_PROMPT,
  MARKET_PROFILE_TOOL,
  NETWORKING_SYSTEM_PROMPT,
  NETWORKING_TOOL,
  POST_SYSTEM_PROMPT,
  POST_TOOL,
  buildNetworkingUserPrompt,
  buildPostUserPrompt,
  buildHeadlineFromMarketUserPrompt,
  buildMarketProfileUserPrompt,
} from "@/lib/prompts";
import {
  LINKEDIN_REVIEW_CATEGORY_KEYS,
  type AnalysisResult,
  type CvChange,
  type CvJobProfile,
  type CvRequirement,
  type HeadlineAnalysisResult,
  type HeadlineBuilderAnswers,
  type LinkedinReviewCategory,
  type LinkedinReviewResult,
  type MarketHeadlineResult,
  type MarketHeadlineVariant,
  type MarketKeyword,
  type MarketProfile,
  type MarketProfileExtraction,
  type MarketProfileIdentified,
  type MarketProfileKeywords,
  type NetworkingResult,
  type PostResult,
  type PostVariant,
  type Subscores,
  type TargetMarket,
} from "@/lib/types";

// Cliente único do servidor. NUNCA importar este módulo de um Client
// Component — a key só existe em runtime de servidor (Route Handlers).
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Modelo para prosa premium (headline). Ver CLAUDE.md "Regras inegociáveis #2".
//
// FUTURE (roteamento de modelo): quando a etapa de scoring/extração for
// separada da reescrita da headline, usar claude-haiku-4-5-20251001 para a
// primeira (tarefa estruturada/barata) e manter este modelo só para a
// reescrita (prosa premium).
const ANALYSIS_MODEL = "claude-sonnet-4-6";

const MAX_HEADLINE_LENGTH = 220;

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Valida e normaliza o input bruto da tool call. O schema da tool já guia o
 * modelo, mas não garante 100% (ex.: limites de string, ranges) — então
 * validamos/saneamos aqui antes de devolver ao cliente ou salvar no banco.
 */
function validateAnalysisResult(raw: unknown): AnalysisResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Resposta da IA não é um objeto.");
  }
  const obj = raw as Record<string, unknown>;

  const rawSubscores = (obj.subscores as Record<string, unknown>) ?? {};
  const subscores: Subscores = {
    headline: clampScore(rawSubscores.headline),
    impactClarity: clampScore(rawSubscores.impactClarity),
    keywords: clampScore(rawSubscores.keywords),
    recruiterReadiness: clampScore(rawSubscores.recruiterReadiness),
    english: clampScore(rawSubscores.english),
  };

  const rawHeadline = (obj.headline as Record<string, unknown>) ?? {};
  const original = typeof rawHeadline.original === "string" ? rawHeadline.original : "";
  const rewritten = (typeof rawHeadline.rewritten === "string" ? rawHeadline.rewritten : "").slice(
    0,
    MAX_HEADLINE_LENGTH,
  );

  const keywordHighlights = Array.isArray(obj.keywordHighlights)
    ? obj.keywordHighlights.filter((k): k is string => typeof k === "string").slice(0, 6)
    : [];

  return {
    score: clampScore(obj.score),
    subscores,
    headline: { original, rewritten },
    keywordHighlights,
  };
}

/**
 * Analisa o perfil colado/extraído e devolve o Score Internacional, os
 * subscores e a headline reescrita.
 *
 * FUTURE (margem, ver CLAUDE.md "Regras inegociáveis #3):
 * - Registrar cost_usd desta geração a partir de `response.usage`
 *   (input_tokens/output_tokens * pricing do modelo) numa tabela
 *   `generations`, junto com o lead.
 * - Débito de crédito transacional: debitar o crédito do usuário só após
 *   `response` ser obtido com sucesso; em caso de erro, não debitar
 *   (ou reembolsar se o débito já tiver ocorrido antes da chamada).
 * - Prompt caching: ANALYSIS_SYSTEM_PROMPT é fixo entre chamadas — marcar
 *   o bloco de system com `cache_control: { type: "ephemeral" }` quando o
 *   volume justificar (até 90% de economia no input cacheado).
 */
export async function generateAnalysis(profileText: string): Promise<AnalysisResult> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1500,
    // temperature 0: o score é uma medida, não prosa — precisa ser
    // reprodutível entre chamadas para o mesmo input.
    temperature: 0,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildAnalysisUserPrompt(profileText) }],
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: ANALYSIS_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validateAnalysisResult(toolUse.input);
}

// Media types suportados pela API de visão da Anthropic.
type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function validateHeadlineAnalysisResult(raw: unknown): HeadlineAnalysisResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Resposta da IA não é um objeto.");
  }
  const obj = raw as Record<string, unknown>;
  const rawHeadline = (obj.headline as Record<string, unknown>) ?? {};
  return {
    headlineScore: clampScore(obj.headlineScore),
    headline: {
      original: typeof rawHeadline.original === "string" ? rawHeadline.original : "",
      rewritten: (typeof rawHeadline.rewritten === "string" ? rawHeadline.rewritten : "").slice(
        0,
        MAX_HEADLINE_LENGTH,
      ),
    },
  };
}

/**
 * Analisa a headline de um perfil LinkedIn a partir de uma imagem (print de
 * tela), usando a API de visão do claude-sonnet-4-6.
 *
 * FUTURE (margem, ver CLAUDE.md "Regras inegociáveis #3"):
 * - Registrar cost_usd desta geração a partir de `response.usage`.
 * - Prompt caching: HEADLINE_VISION_SYSTEM_PROMPT é fixo — marcar com
 *   cache_control quando o volume justificar.
 */
export async function analyzeHeadlineFromImage(
  imageBase64: string,
  mediaType: ImageMediaType,
): Promise<HeadlineAnalysisResult> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 800,
    temperature: 0,
    system: HEADLINE_VISION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: 'Analise a headline do LinkedIn neste print e chame "submit_headline_analysis" com o resultado.',
          },
        ],
      },
    ],
    tools: [HEADLINE_VISION_TOOL],
    tool_choice: { type: "tool", name: HEADLINE_VISION_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validateHeadlineAnalysisResult(toolUse.input);
}

/**
 * Headline Optimizer logado, modo "colar texto" (ver lib/prompts.ts — não
 * reaproveita o prompt de visão do Ato 1 nem o de perfil completo do Ato 2).
 */
export async function generateHeadlineFromText(headlineText: string): Promise<HeadlineAnalysisResult> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 800,
    temperature: 0,
    system: HEADLINE_TEXT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildHeadlineTextUserPrompt(headlineText) }],
    tools: [HEADLINE_TEXT_TOOL],
    tool_choice: { type: "tool", name: HEADLINE_TEXT_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validateHeadlineAnalysisResult(toolUse.input);
}

const MAX_CATEGORY_TEXT_LENGTH = 1000;

function validateLinkedinCategory(key: LinkedinReviewCategory["key"], raw: unknown): LinkedinReviewCategory {
  const obj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    key,
    score: clampScore(obj.score),
    diagnosis: (typeof obj.diagnosis === "string" ? obj.diagnosis : "").slice(0, MAX_CATEGORY_TEXT_LENGTH),
    recommendation: (typeof obj.recommendation === "string" ? obj.recommendation : "").slice(
      0,
      MAX_CATEGORY_TEXT_LENGTH,
    ),
    example: (typeof obj.example === "string" ? obj.example : "").slice(0, MAX_CATEGORY_TEXT_LENGTH),
  };
}

function validateLinkedinReviewResult(raw: unknown): LinkedinReviewResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Resposta da IA não é um objeto.");
  }
  const obj = raw as Record<string, unknown>;

  return {
    overallScore: clampScore(obj.overallScore),
    categories: LINKEDIN_REVIEW_CATEGORY_KEYS.map((key) => validateLinkedinCategory(key, obj[key])),
  };
}

/**
 * LinkedIn Review: análise completa do perfil em 8 categorias (ver
 * lib/prompts.ts). Prosa premium → claude-sonnet-4-6, chamada única.
 * Com marketProfile, keywords/posicionamento são avaliados CONTRA o alvo
 * do usuário (as vagas dele) em vez do genérico da área.
 */
export async function generateLinkedinReview(
  profileText: string,
  marketProfile?: MarketProfile | null,
): Promise<LinkedinReviewResult> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 3000,
    temperature: 0,
    system: LINKEDIN_REVIEW_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildLinkedinReviewUserPrompt(profileText, marketProfile) }],
    tools: [LINKEDIN_REVIEW_TOOL],
    tool_choice: { type: "tool", name: LINKEDIN_REVIEW_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validateLinkedinReviewResult(toolUse.input);
}

/** Headline Optimizer logado, modo "perguntas guiadas" (sem headline pronta). */
export async function generateHeadlineFromAnswers(
  answers: HeadlineBuilderAnswers,
): Promise<HeadlineAnalysisResult> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 800,
    temperature: 0,
    system: HEADLINE_BUILDER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildHeadlineBuilderUserPrompt(answers) }],
    tools: [HEADLINE_TEXT_TOOL],
    tool_choice: { type: "tool", name: HEADLINE_TEXT_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validateHeadlineAnalysisResult(toolUse.input);
}


// --- Perfil de Mercado (ver PROPOSTA-PERFIL-DE-MERCADO.md) ---

// Primeiro uso real do roteamento de modelo planejado no FUTURE acima:
// extração/identificação é tarefa estruturada/barata e bem definida → haiku.
// A prosa premium (headline) continua no ANALYSIS_MODEL (sonnet).
const EXTRACTION_MODEL = "claude-haiku-4-5-20251001";

const MAX_KEYWORDS_PER_GROUP = 12;
const MAX_JOBS_FOR_EXTRACTION = 5;

const VALID_TARGET_MARKETS: TargetMarket[] = [
  "us_remote",
  "canada",
  "europe",
  "latam_remote",
  "other",
];

function validateMarketKeywords(raw: unknown): MarketKeyword[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      term: typeof item.term === "string" ? item.term.trim().slice(0, 80) : "",
      count: Math.min(MAX_JOBS_FOR_EXTRACTION, Math.max(0, Math.round(Number(item.count)) || 0)),
      jobs: Array.isArray(item.jobs)
        ? item.jobs
            .map((j) => Math.round(Number(j)))
            .filter((j) => Number.isFinite(j) && j >= 1 && j <= MAX_JOBS_FOR_EXTRACTION)
            .slice(0, MAX_JOBS_FOR_EXTRACTION)
        : [],
    }))
    .filter((k) => k.term.length > 0)
    .slice(0, MAX_KEYWORDS_PER_GROUP);
}

function validateMarketProfileExtraction(raw: unknown): MarketProfileExtraction {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Resposta da IA não é um objeto.");
  }
  const obj = raw as Record<string, unknown>;

  const rawIdentified = (obj.identified as Record<string, unknown>) ?? {};
  const targetMarket = rawIdentified.targetMarket as TargetMarket;
  const identified: MarketProfileIdentified = {
    targetRole:
      typeof rawIdentified.targetRole === "string"
        ? rawIdentified.targetRole.trim().slice(0, 120)
        : "",
    seniority:
      typeof rawIdentified.seniority === "string"
        ? rawIdentified.seniority.trim().slice(0, 60)
        : "",
    targetMarket: VALID_TARGET_MARKETS.includes(targetMarket) ? targetMarket : "other",
  };
  if (!identified.targetRole) {
    throw new Error("A IA não identificou o cargo-alvo nas vagas.");
  }

  const rawKeywords = (obj.keywords as Record<string, unknown>) ?? {};
  const keywords: MarketProfileKeywords = {
    hardSkills: validateMarketKeywords(rawKeywords.hardSkills),
    softSkills: validateMarketKeywords(rawKeywords.softSkills),
    tools: validateMarketKeywords(rawKeywords.tools),
    responsibilities: validateMarketKeywords(rawKeywords.responsibilities),
    atsTerms: validateMarketKeywords(rawKeywords.atsTerms),
  };

  const totalTerms = Object.values(keywords).reduce(
    (sum: number, list: MarketKeyword[]) => sum + list.length,
    0,
  );
  if (totalTerms === 0) {
    // Vagas ilegíveis/vazias não devem virar perfil-lixo — mesmo princípio
    // do PDF ilegível no fluxo público.
    throw new Error("Nenhuma keyword extraída das vagas.");
  }

  return { identified, keywords };
}

/**
 * Lê as 1-5 vagas desejadas e devolve o Perfil de Mercado: cargo-alvo,
 * senioridade e mercado IDENTIFICADOS nas vagas + keywords agrupadas.
 * temperature 0: mesmas vagas → mesmo perfil (mesmo princípio de
 * reprodutibilidade do score). currentRole é só contexto, opcional.
 */
export async function extractMarketProfile(
  currentRole: string | null,
  jobs: string[],
): Promise<MarketProfileExtraction> {
  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 3000,
    temperature: 0,
    system: MARKET_PROFILE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildMarketProfileUserPrompt(currentRole, jobs) }],
    tools: [MARKET_PROFILE_TOOL],
    tool_choice: { type: "tool", name: MARKET_PROFILE_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validateMarketProfileExtraction(toolUse.input);
}

function validateMarketHeadlineResult(raw: unknown, marketProfileId: string): MarketHeadlineResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Resposta da IA não é um objeto.");
  }
  const obj = raw as Record<string, unknown>;

  const toStringArray = (value: unknown, max: number): string[] =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, max)
      : [];

  const variants: MarketHeadlineVariant[] = (Array.isArray(obj.variants) ? obj.variants : [])
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      style: v.style === "fluid" ? ("fluid" as const) : ("keyword_dense" as const),
      text: (typeof v.text === "string" ? v.text : "").slice(0, MAX_HEADLINE_LENGTH),
      keywordsCovered: toStringArray(v.keywordsCovered, 15),
    }))
    .filter((v) => v.text.length > 0)
    .slice(0, 2);

  if (variants.length === 0) {
    throw new Error("A IA não retornou nenhuma variação de headline.");
  }

  return {
    kind: "market",
    marketProfileId,
    variants,
    keywordsLeftOut: toStringArray(obj.keywordsLeftOut, 12),
    rationale: (typeof obj.rationale === "string" ? obj.rationale : "").slice(0, 600),
  };
}

/**
 * Gera as 2 variações de headline a partir do Perfil de Mercado confirmado.
 * Prosa premium → ANALYSIS_MODEL (sonnet).
 */
export async function generateHeadlineFromMarketProfile(
  profile: MarketProfile,
): Promise<MarketHeadlineResult> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1200,
    temperature: 0,
    system: HEADLINE_FROM_MARKET_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildHeadlineFromMarketUserPrompt(profile) }],
    tools: [HEADLINE_FROM_MARKET_TOOL],
    tool_choice: { type: "tool", name: HEADLINE_FROM_MARKET_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validateMarketHeadlineResult(toolUse.input, profile.id);
}

// --- CV Tailor v2 (ver plano aprovado em 24/jul/2026) ---
//
// Etapa A (haiku, temperature 0): JD é a fonte de verdade; requisitos
// classificados contra o CV com evidência literal obrigatória.
// Etapa B (sonnet): reescrita com whitelist — termos missing PROIBIDOS.
// O match é calculado em lib/match.ts, nunca aqui.

const MAX_CV_REQUIREMENTS = 15;
const MAX_REWRITTEN_CV_LENGTH = 12000;

const VALID_REQ_GROUPS: CvRequirement["group"][] = [
  "hardSkill",
  "tool",
  "softSkill",
  "responsibility",
];

export interface CvJobAnalysis {
  job: CvJobProfile;
  requirements: CvRequirement[];
}

function validateCvJobAnalysis(raw: unknown): CvJobAnalysis {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Resposta da IA não é um objeto.");
  }
  const obj = raw as Record<string, unknown>;

  const rawJob = (obj.job as Record<string, unknown>) ?? {};
  const job: CvJobProfile = {
    role: typeof rawJob.role === "string" ? rawJob.role.trim().slice(0, 120) : "",
    seniority: typeof rawJob.seniority === "string" ? rawJob.seniority.trim().slice(0, 60) : "",
    area: typeof rawJob.area === "string" ? rawJob.area.trim().slice(0, 120) : "",
    context: typeof rawJob.context === "string" ? rawJob.context.trim().slice(0, 400) : "",
  };
  if (!job.role) {
    throw new Error("A IA não identificou o cargo na job description.");
  }

  const requirements: CvRequirement[] = (Array.isArray(obj.requirements) ? obj.requirements : [])
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const status: CvRequirement["status"] =
        item.status === "strong" || item.status === "weak" ? item.status : "missing";
      const evidence =
        typeof item.evidence === "string" ? item.evidence.trim().slice(0, 300) : "";
      return {
        term: typeof item.term === "string" ? item.term.trim().slice(0, 80) : "",
        group: VALID_REQ_GROUPS.includes(item.group as CvRequirement["group"])
          ? (item.group as CvRequirement["group"])
          : "hardSkill",
        weight: item.weight === "must" ? ("must" as const) : ("nice" as const),
        // Regra de evidência aplicada TAMBÉM aqui: strong/weak sem citação
        // vira missing — sem evidência verificável, não há crédito.
        status: status !== "missing" && evidence.length === 0 ? "missing" : status,
        evidence: status === "missing" ? "" : evidence,
      };
    })
    .filter((r) => r.term.length > 0)
    .slice(0, MAX_CV_REQUIREMENTS);

  if (requirements.length === 0) {
    throw new Error("Nenhum requisito extraído da job description.");
  }

  return { job, requirements };
}

/** Etapa A: entende a vaga e classifica os requisitos contra o CV. */
export async function analyzeCvAgainstJob(
  cvText: string,
  jobDescription: string,
): Promise<CvJobAnalysis> {
  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 3000,
    temperature: 0,
    system: CV_JOB_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildCvJobAnalysisUserPrompt(cvText, jobDescription) }],
    tools: [CV_JOB_ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: CV_JOB_ANALYSIS_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validateCvJobAnalysis(toolUse.input);
}

export interface CvRewriteOutput {
  rewrittenCv: string;
  changes: CvChange[];
  evidencedTerms: string[];
  recommendations: string[];
}

function validateCvRewriteOutput(raw: unknown, requirements: CvRequirement[]): CvRewriteOutput {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Resposta da IA não é um objeto.");
  }
  const obj = raw as Record<string, unknown>;

  const toStringArray = (value: unknown, max: number): string[] =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, max)
      : [];

  const rewrittenCv = (typeof obj.rewrittenCv === "string" ? obj.rewrittenCv : "").slice(
    0,
    MAX_REWRITTEN_CV_LENGTH,
  );
  if (rewrittenCv.trim().length === 0) {
    throw new Error("A IA não retornou o CV adaptado.");
  }

  const changes: CvChange[] = (Array.isArray(obj.changes) ? obj.changes : [])
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      section: typeof item.section === "string" ? item.section.trim().slice(0, 80) : "",
      change: typeof item.change === "string" ? item.change.trim().slice(0, 400) : "",
    }))
    .filter((c) => c.section.length > 0 && c.change.length > 0)
    .slice(0, 8);

  // Só termos realmente classificados como weak podem ser "evidenciados" —
  // é isso que impede a projeção de subir por qualquer outro caminho.
  const weakTerms = new Set(
    requirements.filter((r) => r.status === "weak").map((r) => r.term.toLowerCase()),
  );
  const evidencedTerms = toStringArray(obj.evidencedTerms, MAX_CV_REQUIREMENTS).filter((t) =>
    weakTerms.has(t.toLowerCase()),
  );

  return {
    rewrittenCv,
    changes,
    evidencedTerms,
    recommendations: toStringArray(obj.recommendations, 5),
  };
}

/**
 * Etapa B: reescreve o CV com whitelist (strong/weak com evidência) e lista
 * proibida (missing). `violationTerms` é o reforço da 2ª tentativa quando o
 * check anti-invenção da rota detecta violação (ver a rota).
 */
export async function rewriteCvForJob(
  cvText: string,
  job: CvJobProfile,
  requirements: CvRequirement[],
  language: "en" | "pt",
  violationTerms?: string[],
): Promise<CvRewriteOutput> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 4000,
    temperature: 0,
    system: CV_REWRITE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildCvRewriteUserPrompt(cvText, job, requirements, language, violationTerms),
      },
    ],
    tools: [CV_REWRITE_TOOL],
    tool_choice: { type: "tool", name: CV_REWRITE_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validateCvRewriteOutput(toolUse.input, requirements);
}

// --- Mensagens de Networking + Criador de Posts (apoio à mentoria) ---

function validateNetworkingResult(raw: unknown): NetworkingResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Resposta da IA não é um objeto.");
  }
  const obj = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  // 300 chars é o limite REAL da nota de conexão do LinkedIn — cortar aqui
  // garante que o usuário nunca copia algo que não cabe.
  const connectionNote = str(obj.connectionNote, 300);
  const followUpMessage = str(obj.followUpMessage, 1500);
  const inmailVersion = str(obj.inmailVersion, 3000);
  if (!connectionNote || !followUpMessage || !inmailVersion) {
    throw new Error("A IA não retornou as três mensagens.");
  }

  return {
    kind: "networking",
    connectionNote,
    followUpMessage,
    inmailVersion,
    rationale: str(obj.rationale, 400),
  };
}

/** Mensagens de networking (conexão ≤300 chars + follow-up + InMail). */
export async function generateNetworkingMessages(
  recipient: string,
  company: string,
  jobContext: string,
  personalContext: string,
  language: "en" | "pt",
  profile: MarketProfile | null,
): Promise<NetworkingResult> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1500,
    temperature: 0,
    system: NETWORKING_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildNetworkingUserPrompt(
          recipient,
          company,
          jobContext,
          personalContext,
          language,
          profile,
        ),
      },
    ],
    tools: [NETWORKING_TOOL],
    tool_choice: { type: "tool", name: NETWORKING_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validateNetworkingResult(toolUse.input);
}

const MAX_POST_LENGTH = 3000; // limite do LinkedIn

function validatePostResult(raw: unknown): PostResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Resposta da IA não é um objeto.");
  }
  const obj = raw as Record<string, unknown>;

  const variants: PostVariant[] = (Array.isArray(obj.variants) ? obj.variants : [])
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      style: v.style === "insight" ? ("insight" as const) : ("story" as const),
      text: (typeof v.text === "string" ? v.text : "").trim().slice(0, MAX_POST_LENGTH),
    }))
    .filter((v) => v.text.length > 0)
    .slice(0, 2);

  if (variants.length === 0) {
    throw new Error("A IA não retornou nenhum post.");
  }

  const hashtags = (Array.isArray(obj.hashtags) ? obj.hashtags : [])
    .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
    .map((h) => h.trim().replace(/^#/, "").slice(0, 40))
    .slice(0, 5);

  return {
    kind: "post",
    variants,
    hashtags,
    rationale: (typeof obj.rationale === "string" ? obj.rationale : "").slice(0, 400),
  };
}

/** Criador de posts (2 variações: story + insight) a partir de tema real do usuário. */
export async function generatePost(
  topic: string,
  language: "en" | "pt",
  profile: MarketProfile | null,
): Promise<PostResult> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 2000,
    temperature: 0,
    system: POST_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPostUserPrompt(topic, language, profile) }],
    tools: [POST_TOOL],
    tool_choice: { type: "tool", name: POST_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validatePostResult(toolUse.input);
}
