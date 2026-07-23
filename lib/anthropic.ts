import Anthropic from "@anthropic-ai/sdk";
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_TOOL,
  buildAnalysisUserPrompt,
  buildCvTailorUserPrompt,
  buildHeadlineBuilderUserPrompt,
  buildHeadlineTextUserPrompt,
  buildLinkedinReviewUserPrompt,
  CV_TAILOR_SYSTEM_PROMPT,
  CV_TAILOR_TOOL,
  HEADLINE_BUILDER_SYSTEM_PROMPT,
  HEADLINE_TEXT_SYSTEM_PROMPT,
  HEADLINE_TEXT_TOOL,
  HEADLINE_FROM_MARKET_SYSTEM_PROMPT,
  HEADLINE_FROM_MARKET_TOOL,
  HEADLINE_VISION_SYSTEM_PROMPT,
  HEADLINE_VISION_TOOL,
  LINKEDIN_REVIEW_SYSTEM_PROMPT,
  LINKEDIN_REVIEW_TOOL,
  MARKET_PROFILE_SYNTHETIC_SYSTEM_PROMPT,
  MARKET_PROFILE_SYSTEM_PROMPT,
  MARKET_PROFILE_TOOL,
  buildHeadlineFromMarketUserPrompt,
  buildMarketProfileUserPrompt,
  buildSyntheticMarketProfileUserPrompt,
} from "@/lib/prompts";
import {
  LINKEDIN_REVIEW_CATEGORY_KEYS,
  type AnalysisResult,
  type CvTailorResult,
  type HeadlineAnalysisResult,
  type HeadlineBuilderAnswers,
  type LinkedinReviewCategory,
  type LinkedinReviewResult,
  type MarketHeadlineResult,
  type MarketHeadlineVariant,
  type MarketKeyword,
  type MarketProfile,
  type MarketProfileExtraction,
  type MarketProfileKeywords,
  type MarketProfileTarget,
  type Subscores,
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

const MAX_REWRITTEN_CV_LENGTH = 8000;

function validateCvTailorResult(raw: unknown): CvTailorResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Resposta da IA não é um objeto.");
  }
  const obj = raw as Record<string, unknown>;

  const toStringArray = (value: unknown, max: number): string[] =>
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, max)
      : [];

  return {
    compatibilityScore: clampScore(obj.compatibilityScore),
    compatibilitySummary:
      typeof obj.compatibilitySummary === "string" ? obj.compatibilitySummary : "",
    keywordsFound: toStringArray(obj.keywordsFound, 12),
    keywordsMissing: toStringArray(obj.keywordsMissing, 12),
    rewrittenCv:
      (typeof obj.rewrittenCv === "string" ? obj.rewrittenCv : "").slice(0, MAX_REWRITTEN_CV_LENGTH),
    improvedBullets: toStringArray(obj.improvedBullets, 8),
    recommendations: toStringArray(obj.recommendations, 6),
  };
}

/**
 * CV Tailor: extração de keywords da vaga, comparação com o CV e reescrita
 * numa chamada só (mesmo padrão de generateAnalysis — separar em
 * haiku+sonnet fica pra quando o volume justificar).
 */
export async function generateCvTailoring(
  cvText: string,
  jobDescription: string,
  targetRole: string,
  language: "en" | "pt",
): Promise<CvTailorResult> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 3000,
    temperature: 0,
    system: CV_TAILOR_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildCvTailorUserPrompt(cvText, jobDescription, targetRole, language) },
    ],
    tools: [CV_TAILOR_TOOL],
    tool_choice: { type: "tool", name: CV_TAILOR_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validateCvTailorResult(toolUse.input);
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
 */
export async function generateLinkedinReview(profileText: string): Promise<LinkedinReviewResult> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 3000,
    temperature: 0,
    system: LINKEDIN_REVIEW_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildLinkedinReviewUserPrompt(profileText) }],
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
// extração de keywords é tarefa estruturada/barata e bem definida → haiku.
// A prosa premium (headline) continua no ANALYSIS_MODEL (sonnet).
const EXTRACTION_MODEL = "claude-haiku-4-5-20251001";

const MAX_KEYWORDS_PER_GROUP = 12;
const MAX_SPECIALTIES = 6;

function validateMarketKeywords(raw: unknown): MarketKeyword[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      term: typeof item.term === "string" ? item.term.trim().slice(0, 80) : "",
      count: Math.min(3, Math.max(0, Math.round(Number(item.count)) || 0)),
      jobs: Array.isArray(item.jobs)
        ? item.jobs
            .map((j) => Math.round(Number(j)))
            .filter((j) => Number.isFinite(j) && j >= 1 && j <= 3)
            .slice(0, 3)
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
  const rawKeywords = (obj.keywords as Record<string, unknown>) ?? {};

  const keywords: MarketProfileKeywords = {
    hardSkills: validateMarketKeywords(rawKeywords.hardSkills),
    tools: validateMarketKeywords(rawKeywords.tools),
    responsibilities: validateMarketKeywords(rawKeywords.responsibilities),
    softSkills: validateMarketKeywords(rawKeywords.softSkills),
    atsTerms: validateMarketKeywords(rawKeywords.atsTerms),
  };

  const totalTerms = Object.values(keywords).reduce((sum, list) => sum + list.length, 0);
  if (totalTerms === 0) {
    // Vagas ilegíveis/vazias não devem virar perfil-lixo — mesmo princípio
    // do PDF ilegível no fluxo público.
    throw new Error("Nenhuma keyword extraída das vagas.");
  }

  const inferredSpecialties = Array.isArray(obj.inferredSpecialties)
    ? obj.inferredSpecialties
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 60))
        .slice(0, MAX_SPECIALTIES)
    : [];

  return { keywords, inferredSpecialties };
}

/**
 * Extrai o Perfil de Mercado de 1-3 vagas (ou estima, quando jobs === null,
 * no fallback "não tenho vagas"). temperature 0: mesmas vagas → mesmo
 * perfil (mesmo princípio de reprodutibilidade do score).
 */
export async function extractMarketProfile(
  target: MarketProfileTarget,
  jobs: string[] | null,
): Promise<MarketProfileExtraction> {
  const synthetic = jobs === null || jobs.length === 0;
  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 2500,
    temperature: 0,
    system: synthetic ? MARKET_PROFILE_SYNTHETIC_SYSTEM_PROMPT : MARKET_PROFILE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: synthetic
          ? buildSyntheticMarketProfileUserPrompt(target)
          : buildMarketProfileUserPrompt(target, jobs),
      },
    ],
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
 * Gera as 2 variações de headline a partir do Perfil de Mercado salvo +
 * especialidades confirmadas. Prosa premium → ANALYSIS_MODEL (sonnet).
 */
export async function generateHeadlineFromMarketProfile(
  profile: MarketProfile,
  confirmedSpecialties: string[],
): Promise<MarketHeadlineResult> {
  const response = await anthropic.messages.create({
    model: ANALYSIS_MODEL,
    max_tokens: 1200,
    temperature: 0,
    system: HEADLINE_FROM_MARKET_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildHeadlineFromMarketUserPrompt(profile, confirmedSpecialties) },
    ],
    tools: [HEADLINE_FROM_MARKET_TOOL],
    tool_choice: { type: "tool", name: HEADLINE_FROM_MARKET_TOOL.name },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("A IA não retornou o resultado estruturado esperado.");
  }

  return validateMarketHeadlineResult(toolUse.input, profile.id);
}
