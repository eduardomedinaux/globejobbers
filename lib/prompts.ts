import type Anthropic from "@anthropic-ai/sdk";

// Prompt e schema usados pela Route Handler /api/analyze (ver lib/anthropic.ts).
//
// FUTURE (roteamento de modelo, ver CLAUDE.md "Regras inegociáveis #2):
// Hoje uma única chamada a claude-sonnet-4-6 faz tudo (scoring + reescrita).
// Quando o volume justificar, separar em duas chamadas:
//   1) claude-haiku-4-5-20251001 para extração estruturada (subscores,
//      headline original, keywords) — tarefa barata e bem definida.
//   2) claude-sonnet-4-6 só para a prosa premium (reescrita da headline),
//      recebendo o resultado da etapa 1 como contexto.
// Por ora, manter um único prompt simples é suficiente para o MVP.

export const ANALYSIS_SYSTEM_PROMPT = `Você é um recrutador técnico sênior especializado em colocar profissionais
brasileiros (2-10 anos de experiência) em vagas remotas internacionais pagas em
dólar, nas áreas de UX/UI/Product Design, Marketing, Vendas (SDR/AE), Customer
Success, Tecnologia e Produto.

Você vai analisar o texto de um perfil de LinkedIn (ou currículo) colado pelo
usuário e avaliar o quão pronto esse perfil está para chamar a atenção de
recrutadores e hiring managers internacionais (EUA/Europa, remoto, USD).

Sempre responda em português do Brasil nos campos de texto livre, EXCETO a
headline reescrita, que deve estar em inglês (idioma em que recrutadores
internacionais leem perfis no LinkedIn).

Critérios de avaliação (cada subscore vai de 0 a 100):
- headline: a headline atual comunica especialidade, nível de senioridade e
  valor de forma clara para quem não conhece o mercado brasileiro?
- impactClarity: as experiências comunicam IMPACTO com números/resultados, ou
  são só listas de responsabilidades genéricas?
- keywords: o perfil usa termos e ferramentas que recrutadores internacionais
  buscam na área do candidato (ex.: "B2B SaaS", "Figma", "PLG", "ARR",
  "outbound", "A/B testing")?
- recruiterReadiness: olhando o perfil como um todo, um recrutador
  internacional entenderia rapidamente "quem é essa pessoa e onde ela encaixa"?
- english: avalie com base em evidências OBSERVÁVEIS no texto, não em
  impressão geral. Considere:
  - Erros gramaticais ou de concordância em trechos escritos em inglês (cada
    erro reduz o score).
  - Presença e uso correto de termos técnicos/de mercado em inglês relevantes
    para a área do candidato (ex.: "stakeholder", "roadmap", "outbound",
    "churn", "A/B testing") — presença e uso correto aumentam o score; ausência
    total reduz.
  - Fluência aparente de trechos em inglês: frases naturais/idiomáticas vs.
    traduções literais e desajeitadas do português.
  Se o perfil estiver inteiramente em português sem nenhum trecho em inglês,
  avalie apenas a presença, frequência e correção de termos técnicos em inglês
  incorporados ao texto (nomes de ferramentas, frameworks, siglas de mercado),
  sem especular sobre a fluência do candidato em conversação.

O "score" geral (0-100) é uma síntese ponderada dos subscores, refletindo a
prontidão geral do perfil para o mercado internacional — não é uma média
simples.

Para a headline reescrita:
- Use a headline original como base, mas reescreva para o padrão de mercado
  internacional: especialidade + nicho/indústria + proposta de valor
  quantificada quando possível.
- Máximo de 220 caracteres (limite de headline do LinkedIn).
- Tom confiante e específico, sem buzzwords vazias ("passionate", "synergy",
  "rockstar").

Para keywordHighlights: liste de 3 a 6 keywords específicas e relevantes para o
mercado internacional do candidato, que estão ausentes ou pouco destacadas no
perfil original e que você incorporou (ou recomendaria incorporar) na
reescrita.

Responda SEMPRE chamando a ferramenta "submit_analysis" com o resultado
estruturado. Não escreva texto fora da chamada da ferramenta.`;

export function buildAnalysisUserPrompt(profileText: string): string {
  return `Perfil para análise (texto colado pelo usuário, pode incluir nome,
headline, seção "Sobre", experiências, etc.):

"""
${profileText}
"""

Analise este perfil e chame "submit_analysis" com o resultado.`;
}

/**
 * Tool com schema fixo, usado via tool_choice forçado para garantir que o
 * modelo devolva JSON estruturado e validável (ver lib/anthropic.ts).
 */
export const ANALYSIS_TOOL: Anthropic.Tool = {
  name: "submit_analysis",
  description:
    "Envia o resultado estruturado da análise do perfil: score internacional, subscores, headline original/reescrita e keywords em destaque.",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "integer",
        description: "Score Internacional geral, de 0 a 100.",
        minimum: 0,
        maximum: 100,
      },
      subscores: {
        type: "object",
        properties: {
          headline: { type: "integer", minimum: 0, maximum: 100 },
          impactClarity: { type: "integer", minimum: 0, maximum: 100 },
          keywords: { type: "integer", minimum: 0, maximum: 100 },
          recruiterReadiness: { type: "integer", minimum: 0, maximum: 100 },
          english: { type: "integer", minimum: 0, maximum: 100 },
        },
        required: [
          "headline",
          "impactClarity",
          "keywords",
          "recruiterReadiness",
          "english",
        ],
      },
      headline: {
        type: "object",
        properties: {
          original: {
            type: "string",
            description:
              "Headline atual extraída do perfil (texto literal, ou melhor inferência se não houver headline explícita).",
          },
          rewritten: {
            type: "string",
            description:
              "Headline reescrita em inglês, máximo 220 caracteres.",
          },
        },
        required: ["original", "rewritten"],
      },
      keywordHighlights: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 6,
      },
    },
    required: ["score", "subscores", "headline", "keywordHighlights"],
  },
};
