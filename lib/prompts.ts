import type Anthropic from "@anthropic-ai/sdk";
import type {
  CvJobProfile,
  CvRequirement,
  HeadlineBuilderAnswers,
  MarketProfile,
} from "@/lib/types";

// --- LinkedIn Review (Fase 2) ---
//
// Análise mais completa que o Ato 2 (score + 5 subscores + 1 headline
// reescrita): aqui são 8 categorias, cada uma com nota, diagnóstico,
// recomendação prática e exemplo melhorado quando aplicável. Prosa premium
// → claude-sonnet-4-6, mesma chamada única.

export const LINKEDIN_REVIEW_SYSTEM_PROMPT = `Você é um recrutador técnico sênior especializado em colocar profissionais
brasileiros em vagas remotas internacionais pagas em dólar.

O usuário vai enviar o texto completo do perfil de LinkedIn dele (colado ou
extraído de PDF). Avalie o perfil em 8 categorias, cada uma com nota de 0 a
100, diagnóstico (2-3 frases sobre o que está bom/ruim especificamente
nesse perfil, não genérico), recomendação prática (o que fazer pra
melhorar) e, quando fizer sentido, um exemplo de texto melhorado (deixe
"example" como string vazia quando não se aplicar, ex.: categorias sem um
trecho de texto claro pra reescrever):

- headline: comunica especialidade, senioridade e valor com clareza pra
  quem não conhece o mercado brasileiro?
- about: a seção "Sobre" conta uma narrativa de carreira clara, ou é
  genérica/ausente?
- experience: as experiências mostram IMPACTO com números/resultados, ou
  são listas de responsabilidades?
- keywords: o perfil usa termos e ferramentas que recrutadores
  internacionais buscam na área do candidato?
- internationalPositioning: olhando o perfil como um todo, ele se posiciona
  para o mercado internacional (remoto, USD) ou parece voltado só ao
  mercado brasileiro?
- recruiterClarity: um recrutador internacional entenderia rapidamente
  "quem é essa pessoa e onde ela encaixa"?
- proofOfImpact: há evidência concreta (métricas, resultados, prêmios,
  projetos) que comprove o valor entregue?
- englishReadiness: avalie com base em evidências OBSERVÁVEIS no texto —
  erros gramaticais, presença/uso correto de termos técnicos em inglês,
  fluência aparente de trechos em inglês. Se o perfil estiver inteiramente
  em português, avalie só presença/correção de termos técnicos
  incorporados, sem especular sobre conversação.

"overallScore" (0-100) é uma síntese ponderada das 8 categorias, refletindo
a prontidão geral do perfil pro mercado internacional — não é média simples.

Se o prompt incluir um "PERFIL DE MERCADO DO USUÁRIO" (o alvo dele, extraído
das vagas que ele quer conquistar), a análise deixa de ser genérica: avalie
"keywords" e "internationalPositioning" CONTRA esse alvo específico — quais
termos do Perfil de Mercado aparecem (ou faltam) no perfil do LinkedIn, e se
o posicionamento conversa com aquele cargo/mercado. Cite termos concretos do
Perfil de Mercado nos diagnósticos e recomendações (ex.: "'Design Systems'
aparece em 3 das vagas do seu alvo e não está no seu perfil"). As demais
categorias também podem referenciar o alvo quando fizer o diagnóstico mais
específico. Sem o Perfil de Mercado, avalie no modo genérico da área do
candidato.

Responda SEMPRE chamando a ferramenta "submit_linkedin_review". Não escreva
texto fora da chamada da ferramenta.`;

export function buildLinkedinReviewUserPrompt(
  profileText: string,
  marketProfile?: MarketProfile | null,
): string {
  const marketBlock = marketProfile
    ? `

PERFIL DE MERCADO DO USUÁRIO (alvo extraído das vagas que ele quer conquistar):
- Cargo-alvo: ${marketProfile.targetRole}
- Senioridade: ${marketProfile.seniority}
- Mercado: ${marketProfile.targetMarket}
Keywords do alvo (termo (recorrência entre as vagas)):
${(
        [
          ["Hard skills", marketProfile.keywords.hardSkills],
          ["Soft skills", marketProfile.keywords.softSkills],
          ["Ferramentas & tecnologias", marketProfile.keywords.tools],
          ["Responsabilidades", marketProfile.keywords.responsibilities],
          ["Termos ATS", marketProfile.keywords.atsTerms],
        ] as const
      )
        .map(
          ([label, list]) =>
            `${label}: ${list.map((k) => `${k.term} (${k.count}x)`).join(", ") || "—"}`,
        )
        .join("\n")}
`
    : "";

  return `Perfil de LinkedIn para análise (texto colado ou extraído de PDF):

"""
${profileText}
"""
${marketBlock}
Analise as 8 categorias e chame "submit_linkedin_review" com o resultado.`;
}

function linkedinCategoryProperty(description: string) {
  return {
    type: "object" as const,
    properties: {
      score: { type: "integer" as const, minimum: 0, maximum: 100 },
      diagnosis: { type: "string" as const, description: "2-3 frases específicas sobre este perfil." },
      recommendation: { type: "string" as const, description: "O que fazer pra melhorar." },
      example: {
        type: "string" as const,
        description: "Exemplo de texto melhorado, ou string vazia se não se aplicar.",
      },
    },
    required: ["score", "diagnosis", "recommendation", "example"],
    description,
  };
}

export const LINKEDIN_REVIEW_TOOL: Anthropic.Tool = {
  name: "submit_linkedin_review",
  description: "Envia a análise completa do perfil de LinkedIn: score geral e 8 categorias detalhadas.",
  input_schema: {
    type: "object",
    properties: {
      overallScore: { type: "integer", minimum: 0, maximum: 100 },
      headline: linkedinCategoryProperty("Clareza de especialidade, senioridade e valor na headline."),
      about: linkedinCategoryProperty('Qualidade da narrativa na seção "Sobre".'),
      experience: linkedinCategoryProperty("Impacto quantificado nas experiências."),
      keywords: linkedinCategoryProperty("Uso de termos/ferramentas buscados por recrutadores internacionais."),
      internationalPositioning: linkedinCategoryProperty("Posicionamento pro mercado internacional (remoto, USD)."),
      recruiterClarity: linkedinCategoryProperty("Clareza de quem é a pessoa e onde ela encaixa."),
      proofOfImpact: linkedinCategoryProperty("Evidência concreta de valor entregue."),
      englishReadiness: linkedinCategoryProperty("Qualidade observável do inglês no perfil."),
    },
    required: [
      "overallScore",
      "headline",
      "about",
      "experience",
      "keywords",
      "internationalPositioning",
      "recruiterClarity",
      "proofOfImpact",
      "englishReadiness",
    ],
  },
};

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

// --- Ato 1: análise de headline via visão (print de tela do LinkedIn) ---

export const HEADLINE_VISION_SYSTEM_PROMPT = `Você é um recrutador técnico sênior especializado em colocar profissionais
brasileiros em vagas remotas internacionais pagas em dólar.

O usuário vai enviar uma imagem (print de tela do LinkedIn) contendo a headline
do perfil dele. Sua tarefa:

1. Extraia a headline atual exatamente como aparece na imagem (campo "original").
2. Avalie a headline no critério "quão eficaz é para chamar a atenção de
   recrutadores internacionais (EUA/Europa, remoto, USD)" e gere um score de
   0 a 100 (campo "headlineScore").
3. Reescreva a headline no padrão internacional: especialidade + nicho/indústria
   + proposta de valor quantificada quando possível (campo "rewritten").
   - Máximo de 220 caracteres.
   - Em inglês.
   - Confiante e específico, sem buzzwords vazias ("passionate", "synergy").

Se a imagem não contiver uma headline de LinkedIn reconhecível, preencha
"original" com "Headline não identificada" e atribua headlineScore 0.

Responda SEMPRE chamando a ferramenta "submit_headline_analysis". Não escreva
texto fora da chamada da ferramenta.`;

export const HEADLINE_VISION_TOOL: Anthropic.Tool = {
  name: "submit_headline_analysis",
  description:
    "Envia o resultado da análise da headline: score, headline original extraída da imagem e headline reescrita em inglês.",
  input_schema: {
    type: "object",
    properties: {
      headlineScore: {
        type: "integer",
        description: "Score da headline, de 0 a 100.",
        minimum: 0,
        maximum: 100,
      },
      headline: {
        type: "object",
        properties: {
          original: {
            type: "string",
            description: "Headline atual extraída da imagem (texto literal).",
          },
          rewritten: {
            type: "string",
            description: "Headline reescrita em inglês, máximo 220 caracteres.",
          },
        },
        required: ["original", "rewritten"],
      },
    },
    required: ["headlineScore", "headline"],
  },
};

// --- Headline Optimizer logado (Fase 2): dois modos, mesmo output ---
//
// NÃO reaproveita os prompts/tools do Ato 1 (visão) nem do Ato 2 (perfil
// completo) acima — é uma ferramenta nova e mais leve, com dois jeitos de
// entrada que o usuário escolhe na própria página (ver
// app/(app)/tools/headline/page.tsx):
//  - "Colar texto": já tem uma headline, só quer avaliar/reescrever.
//  - "Perguntas guiadas": não tem headline pronta, responde um formulário
//    curto e a IA sintetiza uma do zero.
// Ambos devolvem o mesmo formato (headlineScore + headline{original,
// rewritten}), reaproveitando HeadlineAnalysisResult/HEADLINE_TEXT_TOOL.

export const HEADLINE_TEXT_SYSTEM_PROMPT = `Você é um recrutador técnico sênior especializado em colocar profissionais
brasileiros em vagas remotas internacionais pagas em dólar.

O usuário vai colar o texto da headline atual do LinkedIn dele. Sua tarefa:

1. Avalie a headline colada no critério "quão eficaz é para chamar a atenção
   de recrutadores internacionais (EUA/Europa, remoto, USD)" e gere um score
   de 0 a 100 (campo "headlineScore"). Devolva o texto colado, sem alterações,
   no campo "original".
2. Reescreva a headline no padrão internacional: especialidade + nicho/indústria
   + proposta de valor quantificada quando possível (campo "rewritten").
   - Máximo de 220 caracteres.
   - Em inglês.
   - Confiante e específico, sem buzzwords vazias ("passionate", "synergy").

Responda SEMPRE chamando a ferramenta "submit_headline_result". Não escreva
texto fora da chamada da ferramenta.`;

export function buildHeadlineTextUserPrompt(headlineText: string): string {
  return `Headline colada pelo usuário:

"""
${headlineText}
"""

Analise e chame "submit_headline_result" com o resultado.`;
}

export const HEADLINE_BUILDER_SYSTEM_PROMPT = `Você é um recrutador técnico sênior especializado em colocar profissionais
brasileiros em vagas remotas internacionais pagas em dólar.

O usuário NÃO tem uma headline pronta — ele respondeu um formulário curto
sobre a carreira dele. Sua tarefa:

1. Sintetize, a partir só das respostas, uma headline "original" simples e
   genérica (como alguém sem orientação escreveria sozinho — ex.: só cargo e
   empresa/área, sem venda de valor). Isto vira o "antes" na comparação.
2. Reescreva essa headline no padrão internacional para o campo "rewritten":
   especialidade + nicho/indústria + proposta de valor quantificada quando
   possível, usando as respostas do usuário (anos de experiência, skills,
   indústria-alvo, conquista informada).
   - Máximo de 220 caracteres.
   - Em inglês.
   - Confiante e específico, sem buzzwords vazias ("passionate", "synergy").
   - NÃO invente conquistas, números ou experiências que o usuário não deu.
3. Atribua um "headlineScore" (0-100) refletindo o quão forte é o
   posicionamento resultante dado o que o usuário informou.

Responda SEMPRE chamando a ferramenta "submit_headline_result". Não escreva
texto fora da chamada da ferramenta.`;

export function buildHeadlineBuilderUserPrompt(answers: HeadlineBuilderAnswers): string {
  return `Respostas do formulário do usuário:
- Cargo/área atual: ${answers.currentRole}
- Anos de experiência: ${answers.yearsOfExperience}
- Especialidade/nicho: ${answers.specialty}
- Principais skills/ferramentas: ${answers.keySkills.join(", ")}
- Indústria-alvo: ${answers.targetIndustry}
- Conquista quantificável: ${answers.notableAchievement}
- Nível de senioridade: ${answers.seniorityLevel}

Sintetize a headline "antes" e a reescrita "depois", e chame
"submit_headline_result" com o resultado.`;
}

/**
 * Tool compartilhada pelos dois modos acima — mesmo schema do Ato 1
 * (HEADLINE_VISION_TOOL), mas com nome próprio pra não confundir com a
 * ferramenta de visão (entrada é texto, não imagem).
 */
export const HEADLINE_TEXT_TOOL: Anthropic.Tool = {
  name: "submit_headline_result",
  description:
    "Envia o resultado da headline: score, headline original (colada ou sintetizada) e headline reescrita em inglês.",
  input_schema: {
    type: "object",
    properties: {
      headlineScore: {
        type: "integer",
        description: "Score da headline, de 0 a 100.",
        minimum: 0,
        maximum: 100,
      },
      headline: {
        type: "object",
        properties: {
          original: {
            type: "string",
            description: "Headline original (colada pelo usuário, ou sintetizada a partir das respostas do formulário).",
          },
          rewritten: {
            type: "string",
            description: "Headline reescrita em inglês, máximo 220 caracteres.",
          },
        },
        required: ["original", "rewritten"],
      },
    },
    required: ["headlineScore", "headline"],
  },
};

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

// --- Perfil de Mercado (ver PROPOSTA-PERFIL-DE-MERCADO.md) ---
//
// Metodologia: a fonte de verdade é a DESCRIÇÃO DAS VAGAS. O usuário não
// declara cargo-alvo, mercado nem especialidades — a IA LÊ as vagas e
// identifica tudo, com temperature 0 (mesmas vagas → mesmo perfil, mesmo
// princípio de reprodutibilidade do score).

export const MARKET_PROFILE_SYSTEM_PROMPT = `Você é um sourcer/recrutador técnico sênior especializado em como recrutadores
internacionais BUSCAM candidatos (LinkedIn Recruiter, ATS, boolean search).

O usuário quer migrar para vagas internacionais e vai fornecer de 1 a 5
descrições de vagas reais que ele deseja conquistar (e, opcionalmente, o
cargo atual dele — apenas contexto, NÃO é fonte de verdade). Sua tarefa é
ler as vagas e construir o "Perfil de Mercado" desse alvo.

PRIMEIRO, identifique lendo as vagas (campo "identified"):
- "targetRole": o cargo-alvo consolidado (se as vagas divergem, o mais
  representativo do conjunto), no idioma das vagas. Ex.: "Senior Product
  Designer".
- "seniority": a senioridade predominante pedida (ex.: "Senior", "Mid-level",
  "Staff", "Júnior").
- "targetMarket": classifique em exatamente um de: "us_remote" (EUA/remoto
  global contratando em USD), "canada", "europe", "latam_remote", "other"
  (quando não dá pra identificar com segurança).

DEPOIS, extraia as palavras-chave (campo "keywords"):
1. Termos EXCLUSIVAMENTE das descrições fornecidas. Não invente (exceção:
   "atsTerms" pode normalizar variações óbvias, ex.: "PM" → "Product
   Manager").
2. Grupos: hardSkills, softSkills, tools (ferramentas/tecnologias nomeadas),
   responsibilities (responsabilidades recorrentes), atsTerms (termos exatos
   de ATS/busca booleana, incluindo variações de título).
3. Para cada termo: "count" (em quantas vagas aparece) e "jobs" (índices
   1-based). Conte semanticamente: "design systems" e "sistema de design"
   são o mesmo termo.
4. Termos presentes em 2+ vagas são os mais valiosos — seja rigoroso na
   contagem, é ela que ordena o perfil.
5. Termos no idioma das vagas (normalmente inglês) — é assim que o
   recrutador busca.
6. Máximo de 12 termos por grupo, ordenados por count decrescente e depois
   por importância para busca de recrutador.

Responda SEMPRE chamando a ferramenta "submit_market_profile". Não escreva
texto fora da chamada da ferramenta.`;

export function buildMarketProfileUserPrompt(currentRole: string | null, jobs: string[]): string {
  const jobBlocks = jobs.map((text, i) => `--- VAGA ${i + 1} ---\n${text}`).join("\n\n");

  return `${currentRole ? `Cargo atual do candidato (contexto, não é fonte de verdade): ${currentRole}\n\n` : ""}Descrições das vagas desejadas (${jobs.length}):

${jobBlocks}

Identifique o alvo, construa o Perfil de Mercado e chame "submit_market_profile".`;
}

const marketKeywordArray = (description: string) => ({
  type: "array" as const,
  maxItems: 12,
  description,
  items: {
    type: "object" as const,
    properties: {
      term: { type: "string" as const },
      count: { type: "integer" as const, minimum: 0, maximum: 5 },
      jobs: { type: "array" as const, items: { type: "integer" as const, minimum: 1, maximum: 5 } },
    },
    required: ["term", "count", "jobs"],
  },
});

export const MARKET_PROFILE_TOOL: Anthropic.Tool = {
  name: "submit_market_profile",
  description:
    "Envia o Perfil de Mercado: cargo/senioridade/mercado identificados nas vagas + keywords agrupadas com recorrência.",
  input_schema: {
    type: "object",
    properties: {
      identified: {
        type: "object",
        description: "O que as vagas revelam sobre o alvo — identificado LENDO as vagas.",
        properties: {
          targetRole: { type: "string", description: "Cargo-alvo consolidado, no idioma das vagas." },
          seniority: { type: "string", description: "Senioridade predominante pedida." },
          targetMarket: {
            type: "string",
            enum: ["us_remote", "canada", "europe", "latam_remote", "other"],
          },
        },
        required: ["targetRole", "seniority", "targetMarket"],
      },
      keywords: {
        type: "object",
        properties: {
          hardSkills: marketKeywordArray("Hard skills pedidas nas vagas."),
          softSkills: marketKeywordArray("Soft skills pedidas nas vagas."),
          tools: marketKeywordArray("Ferramentas e tecnologias nomeadas nas vagas."),
          responsibilities: marketKeywordArray("Responsabilidades recorrentes nas vagas."),
          atsTerms: marketKeywordArray("Termos exatos de ATS/busca booleana, incluindo variações de título."),
        },
        required: ["hardSkills", "softSkills", "tools", "responsibilities", "atsTerms"],
      },
    },
    required: ["identified", "keywords"],
  },
};

// --- Headline a partir do Perfil de Mercado ---
//
// Objetivo NÃO é uma headline bonita: é maximizar a chance de o perfil
// aparecer na busca de um recrutador internacional. Duas variações com
// trade-off explícito (densa em keywords vs mais fluida) e cobertura
// explicável — cada keyword usada tem origem rastreável nas vagas.

export const HEADLINE_FROM_MARKET_SYSTEM_PROMPT = `Você é um recrutador técnico sênior especializado em colocar profissionais
brasileiros em vagas remotas internacionais pagas em dólar. Você sabe
exatamente como recrutadores buscam no LinkedIn Recruiter: por títulos,
skills e termos exatos — a headline é o campo com maior peso na busca.

Você vai receber o Perfil de Mercado do usuário (cargo/senioridade/mercado
confirmados + keywords extraídas das vagas que ele quer, com recorrência).
Gere DUAS variações de headline:

1. "keyword_dense": maximiza encontrabilidade. Prioriza o cargo-alvo +
   termos de maior recorrência (count alto), separados por " | ". Densa,
   mas legível — não é keyword stuffing cego.
2. "fluid": mais natural e narrativa, mantendo as 3-4 keywords mais
   críticas. Para quem prefere soar menos "otimizado".

Regras para AMBAS:
- Máximo de 220 caracteres (limite do LinkedIn).
- No idioma pedido. Termos técnicos/ferramentas permanecem em inglês mesmo
  em headline em português (é assim que se busca).
- Priorize SEMPRE termos com maior "count" (recorrência entre as vagas) —
  são os que mais aparecem em buscas desse mercado.
- Use o cargo-alvo confirmado como âncora do título (é a vaga em que ele
  quer aparecer na busca).
- NÃO invente conquistas, números, empresas ou certificações — o input aqui
  são as vagas, nada mais.
- Sem buzzwords vazias ("passionate", "results-driven", "synergy").

Para cada variação, liste em "keywordsCovered" os termos do Perfil de
Mercado efetivamente usados. Em "keywordsLeftOut", liste os termos críticos
(count 2+, ou os mais importantes do perfil) que NÃO couberam em nenhuma
variação — eles vão para o About/Experiências. Em "rationale", explique em
1-2 frases (pt-BR) as escolhas.

Responda SEMPRE chamando a ferramenta "submit_market_headline". Não escreva
texto fora da chamada da ferramenta.`;

export function buildHeadlineFromMarketUserPrompt(profile: MarketProfile): string {
  const groups = (
    [
      ["Hard skills", profile.keywords.hardSkills],
      ["Soft skills", profile.keywords.softSkills],
      ["Ferramentas & tecnologias", profile.keywords.tools],
      ["Responsabilidades", profile.keywords.responsibilities],
      ["Termos ATS", profile.keywords.atsTerms],
    ] as const
  )
    .map(
      ([label, list]) =>
        `${label}: ${list.map((k) => `${k.term} (${k.count}x)`).join(", ") || "—"}`,
    )
    .join("\n");

  return `Alvo confirmado pelo usuário:
- Cargo-alvo: ${profile.targetRole}
- Senioridade: ${profile.seniority}
- Mercado: ${profile.targetMarket}
${profile.currentRole ? `- Cargo atual (contexto): ${profile.currentRole}\n` : ""}- Idioma da headline: ${profile.language === "pt" ? "português (termos técnicos em inglês)" : "inglês"}

Perfil de Mercado (termo (recorrência entre as vagas)):
${groups}

Gere as duas variações e chame "submit_market_headline".`;
}

export const HEADLINE_FROM_MARKET_TOOL: Anthropic.Tool = {
  name: "submit_market_headline",
  description:
    "Envia as duas variações de headline geradas a partir do Perfil de Mercado, com cobertura de keywords explicável.",
  input_schema: {
    type: "object",
    properties: {
      variants: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: {
          type: "object",
          properties: {
            style: { type: "string", enum: ["keyword_dense", "fluid"] },
            text: { type: "string", description: "A headline, máximo 220 caracteres." },
            keywordsCovered: {
              type: "array",
              items: { type: "string" },
              description: "Termos do Perfil de Mercado usados nesta variação.",
            },
          },
          required: ["style", "text", "keywordsCovered"],
        },
      },
      keywordsLeftOut: {
        type: "array",
        items: { type: "string" },
        description: "Termos críticos do perfil que não couberam (vão pro About/Experiências).",
      },
      rationale: {
        type: "string",
        description: "1-2 frases em pt-BR explicando as escolhas.",
      },
    },
    required: ["variants", "keywordsLeftOut", "rationale"],
  },
};

// --- CV Tailor v2: análise JD × CV + reescrita com whitelist ---
//
// Princípio de produto: entender a vaga, comparar com a experiência REAL
// do candidato e reposicionar o CV sem inventar qualificações. Duas
// etapas (mesmo padrão do Perfil de Mercado):
//   A) análise estruturada (haiku, temperature 0): a JD é a fonte de
//      verdade sobre o cargo; cada requisito é classificado contra o CV
//      com EVIDÊNCIA literal obrigatória.
//   B) reescrita (sonnet): recebe apenas a whitelist (strong/weak com
//      evidência) — os termos missing são PROIBIDOS no texto final.
// O match é calculado em lib/match.ts, nunca pelo modelo.

export const CV_JOB_ANALYSIS_SYSTEM_PROMPT = `Você é um recrutador técnico sênior e especialista em ATS (Applicant Tracking
Systems), especializado em colocar profissionais brasileiros em vagas remotas
internacionais pagas em dólar.

Você vai receber a descrição de uma vaga (job description) e o CV atual do
candidato. Sua tarefa tem duas partes, nesta ordem:

PARTE 1 — Entenda a vaga (campo "job"). Identifique LENDO a job description:
- "role": o cargo (ex.: "Senior Product Designer").
- "seniority": a senioridade pedida (ex.: "Senior", "Mid-level", "Staff").
- "area": área/especialização (ex.: "Product Design em fintech B2C").
- "context": contexto relevante da empresa/vaga em 1-2 frases (setor,
  produto, estágio, o que o time faz).

PARTE 2 — Extraia e classifique os requisitos (campo "requirements").
De 8 a 15 requisitos, EXCLUSIVAMENTE da job description:
- "term": o requisito (hard skill, ferramenta/tecnologia, soft skill ou
  responsabilidade), no idioma da vaga.
- "group": "hardSkill" | "tool" | "softSkill" | "responsibility".
- "weight": "must" se a vaga trata como obrigatório (required,
  must-have, "you have...", listado nos requisitos principais);
  "nice" se desejável (nice-to-have, plus, bonus, preferred).
- "status", comparando com o CV:
  - "strong": há evidência clara e destacada no CV.
  - "weak": há evidência real, mas pouco evidente (mencionado de passagem,
    enterrado, sem destaque ou com terminologia diferente).
  - "missing": NENHUMA evidência no CV. Isso NÃO é um defeito do candidato
    nem algo a "consertar" — significa apenas que não há evidência no
    material fornecido.
- "evidence": para strong/weak, a citação LITERAL (curta) do trecho do CV
  que comprova — copie do CV, não parafraseie. Para missing, string vazia.

Regras inegociáveis:
- Requisito sem trecho correspondente REAL no CV é "missing". NUNCA marque
  strong/weak sem uma citação verificável.
- Conte semanticamente: "Design Systems" no CV cobre "sistema de design"
  na vaga (a evidência é o trecho do CV, na forma em que aparece lá).
- Não infira competências por cargo ("era designer, então sabe Figma" NÃO
  vale — precisa estar escrito).

Responda SEMPRE chamando a ferramenta "submit_job_match_analysis". Não
escreva texto fora da chamada da ferramenta.`;

export function buildCvJobAnalysisUserPrompt(cvText: string, jobDescription: string): string {
  return `Job description da vaga:
"""
${jobDescription}
"""

CV atual do candidato:
"""
${cvText}
"""

Analise a vaga, classifique os requisitos contra o CV e chame
"submit_job_match_analysis".`;
}

export const CV_JOB_ANALYSIS_TOOL: Anthropic.Tool = {
  name: "submit_job_match_analysis",
  description:
    "Envia o perfil da vaga (identificado na JD) e os requisitos classificados contra o CV, com evidência literal.",
  input_schema: {
    type: "object",
    properties: {
      job: {
        type: "object",
        properties: {
          role: { type: "string", description: "Cargo identificado na JD." },
          seniority: { type: "string", description: "Senioridade pedida." },
          area: { type: "string", description: "Área/especialização." },
          context: { type: "string", description: "Contexto da empresa/vaga em 1-2 frases." },
        },
        required: ["role", "seniority", "area", "context"],
      },
      requirements: {
        type: "array",
        minItems: 8,
        maxItems: 15,
        items: {
          type: "object",
          properties: {
            term: { type: "string" },
            group: { type: "string", enum: ["hardSkill", "tool", "softSkill", "responsibility"] },
            weight: { type: "string", enum: ["must", "nice"] },
            status: { type: "string", enum: ["strong", "weak", "missing"] },
            evidence: {
              type: "string",
              description:
                "Citação literal do CV que comprova (obrigatória para strong/weak; vazia para missing).",
            },
          },
          required: ["term", "group", "weight", "status", "evidence"],
        },
      },
    },
    required: ["job", "requirements"],
  },
};

export const CV_REWRITE_SYSTEM_PROMPT = `Você é um recrutador técnico sênior e especialista em ATS, especializado em
adaptar currículos de profissionais brasileiros para vagas remotas
internacionais pagas em dólar.

Você vai receber: o CV atual do candidato, o perfil da vaga e a lista de
requisitos da vaga já classificados contra o CV (com a evidência de cada
um). Sua tarefa: REPOSICIONAR o CV para esta vaga — sem alterar a verdade
sobre a experiência do candidato.

O que você PODE fazer:
- reescrever, resumir, reorganizar e priorizar conteúdo existente;
- melhorar clareza e impacto (verbos de ação, resultados já presentes);
- aproximar a terminologia da usada na job description QUANDO a evidência
  do CV mostra a mesma competência com outro nome;
- destacar experiências relevantes pra vaga e mudar a ordem de bullets;
- tornar realizações EXISTENTES mais evidentes (especialmente os
  requisitos "weak" — evidenciá-los é o principal ganho da adaptação);
- reduzir destaque de informações pouco relevantes para esta vaga.

REGRA FUNDAMENTAL — NÃO INVENTAR (regra de produto, inviolável):
Você NUNCA pode adicionar experiência, empresa, cargo, responsabilidade,
competência, ferramenta, tecnologia, formação, certificação, resultado,
número, métrica ou projeto que não esteja no CV original.
Os requisitos marcados como "missing" (lista PROIBIDA no prompt) NÃO podem
aparecer no CV adaptado — nem como skill, nem em bullet, nem no summary.
Exemplo: se a vaga pede A/B Testing e o CV não tem evidência de A/B
Testing, o CV adaptado NÃO menciona A/B Testing. Se fizer falta, o lugar
disso é em "recommendations" (ex.: "Se você tem experiência com A/B
Testing que não está no CV, adicione — a vaga trata como obrigatório").

Campos de saída:
- "rewrittenCv": o CV completo adaptado, no idioma pedido, pronto pra
  copiar. Mantém todos os fatos; muda posicionamento, ordem, ênfase e
  redação. Sem buzzwords vazias ("passionate", "synergy", "rockstar").
- "changes": 3 a 8 mudanças explicadas, cada uma com "section" (ex.:
  "Summary", nome da empresa/experiência) e "change" (o que mudou e POR QUÊ
  em relação a esta vaga, em pt-BR, 1-2 frases).
- "evidencedTerms": quais termos classificados como "weak" o seu texto
  tornou evidentes (apenas os que você realmente destacou).
- "recommendations": 2 a 5 ações que só o candidato pode fazer (lacunas
  reais, dados que faltam, perguntas do tipo "tem experiência com X não
  mencionada?"), em pt-BR.

Responda SEMPRE chamando a ferramenta "submit_cv_rewrite". Não escreva
texto fora da chamada da ferramenta.`;

export function buildCvRewriteUserPrompt(
  cvText: string,
  job: CvJobProfile,
  requirements: CvRequirement[],
  language: "en" | "pt",
  violationTerms?: string[],
): string {
  const allowed = requirements
    .filter((r) => r.status !== "missing")
    .map((r) => `- ${r.term} [${r.status}] — evidência no CV: "${r.evidence}"`)
    .join("\n");
  const forbidden = requirements
    .filter((r) => r.status === "missing")
    .map((r) => `- ${r.term}`)
    .join("\n");

  const reinforcement = violationTerms?.length
    ? `

ATENÇÃO — TENTATIVA ANTERIOR REJEITADA: o texto gerado mencionou termos da
lista PROIBIDA (${violationTerms.join(", ")}). Gere novamente SEM NENHUMA
menção a esses termos, em nenhuma forma ou variação.`
    : "";

  return `Vaga-alvo:
- Cargo: ${job.role}
- Senioridade: ${job.seniority}
- Área: ${job.area}
- Contexto: ${job.context}
- Idioma do CV adaptado: ${language === "pt" ? "português" : "inglês"}

Requisitos COM evidência no CV (use e destaque — especialmente os [weak]):
${allowed || "- (nenhum)"}

Requisitos SEM evidência no CV — PROIBIDOS no texto final:
${forbidden || "- (nenhum)"}

CV atual do candidato:
"""
${cvText}
"""
${reinforcement}

Adapte o CV e chame "submit_cv_rewrite".`;
}

export const CV_REWRITE_TOOL: Anthropic.Tool = {
  name: "submit_cv_rewrite",
  description:
    "Envia o CV adaptado à vaga, as mudanças explicadas, os termos weak evidenciados e recomendações.",
  input_schema: {
    type: "object",
    properties: {
      rewrittenCv: {
        type: "string",
        description: "CV completo adaptado, sem nenhuma informação inventada.",
      },
      changes: {
        type: "array",
        minItems: 3,
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            section: { type: "string", description: "Seção/experiência alterada." },
            change: { type: "string", description: "O que mudou e por quê (pt-BR)." },
          },
          required: ["section", "change"],
        },
      },
      evidencedTerms: {
        type: "array",
        items: { type: "string" },
        description: "Termos [weak] que a reescrita tornou evidentes.",
      },
      recommendations: {
        type: "array",
        items: { type: "string" },
        description: "Ações que só o candidato pode fazer (pt-BR).",
      },
    },
    required: ["rewrittenCv", "changes", "evidencedTerms", "recommendations"],
  },
};
