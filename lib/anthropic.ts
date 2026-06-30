import Anthropic from "@anthropic-ai/sdk";
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_TOOL,
  buildAnalysisUserPrompt,
  HEADLINE_VISION_SYSTEM_PROMPT,
  HEADLINE_VISION_TOOL,
} from "@/lib/prompts";
import type { AnalysisResult, HeadlineAnalysisResult, Subscores } from "@/lib/types";

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
