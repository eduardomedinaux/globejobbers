# GlobeJobbers

> Contexto de projeto para o Claude Code. Leia isto antes de qualquer tarefa.
> A fonte completa de decisões é o documento de fundação de produto (anexar quando necessário).
> Este arquivo é o resumo operacional do que importa para construir.

---

## O que é

SaaS que ajuda profissionais brasileiros (2–10 anos de experiência) a conseguir
vagas internacionais remotas e ganhar em dólar, usando a profissão atual.
Público principal: UX/UI/Product Design, Marketing, Vendas (SDR/AE), Customer
Success, Tecnologia, Produto.

**Posicionamento:** vendemos transformação de carreira (o salto de remuneração ao
migrar para empregador internacional), NÃO uma ferramenta de LinkedIn. O preço é
ancorado no upside em dólar, não no custo de tokens.

**NÃO somos:** "aprenda a programar". O ângulo é "use sua profissão atual para
ganhar em dólar".

**Tom de produto e copy:** estratégico, moderno, premium, direto. Sem cara de
guru, sem urgência falsa, sem degradês berrantes de infoproduto.

---

## ESCOPO ATUAL — MVP de 1 semana (NÃO exceder)

A versão que estamos construindo AGORA é deliberadamente mínima. O objetivo é
medir o "aha" e falhar barato, não lançar o produto completo.

**Construir SÓ isto:**
- Página única, SEM login obrigatório, SEM Stripe/billing.
- Visitante cola o TEXTO do perfil de LinkedIn, ou faz upload de PDF (currículo
  ou o "Salvar como PDF" nativo do LinkedIn).
- Sistema retorna um **Score Internacional (0–100)** com 4–5 subscores
  (ex.: Headline, Clareza de impacto, Keywords, Prontidão para recrutador
  internacional, Inglês).
- Sistema retorna **UMA headline reescrita**, com comparação **antes/depois**
  visível lado a lado.

**NÃO construir agora** (são da visão completa, ficam para depois):
- As outras 9 ferramentas (about, reescrita de experiências, posts, networking
  engine, análise de vagas, etc.).
- Auth, dashboard, créditos, paywall, gamificação, referral.
- Banco de dados completo / multi-tenant. (Pode persistir mínimo se necessário,
  mas não montar o schema inteiro.)

> Regra de ouro: se uma tarefa não serve diretamente para "visitante vê score +
> headline reescrita", ela está fora do escopo desta semana. Pergunte antes de
> expandir.

---

## FASE 2 — Plataforma SaaS (implementada)

O escopo acima descreve o MVP original. Ele foi deliberadamente expandido pra
uma plataforma completa — decisão explícita do usuário, não desvio de escopo.
As regras inegociáveis abaixo continuam valendo integralmente; o que mudou é
que agora também existe:

- **Landing institucional em `/`** (Hero, Problema, Ferramentas, Como
  funciona, Mentoria, Pricing) — `/` deixou de ser o Ato 2.
- **Fluxos anônimos originais preservados como teasers públicos**, sem login:
  Ato 2 (PDF completo) em `/preview/full-scan`, Ato 1 (print da headline) em
  `/preview/headline`. `/headline` redireciona permanentemente pra
  `/preview/headline` (link já usado no Instagram).
- **Login via Google (Supabase Auth + `@supabase/ssr`)** em `/login`,
  callback em `/auth/callback`.
- **Dashboard logado** (`app/(app)/`, guarda de autenticação no layout) com
  nav (sidebar desktop / bottom nav mobile), 3 ferramentas, uso mensal e
  histórico recente.
- **3 ferramentas logadas**, cada uma com limite gratuito mensal
  (`lib/usage.ts`, calculado via `COUNT` em `analyses`, sem tabela de
  contador separada):
  - `/tools/headline` — Headline Optimizer (3/mês). Dois modos: colar texto
    ou responder perguntas guiadas (não reaproveita os prompts do Ato 1/2).
  - `/tools/cv-tailor` — CV Tailor (2/mês). CV colado ou PDF + job
    description + cargo-alvo; nunca inventa experiência/conquista.
  - `/tools/linkedin-review` — LinkedIn Review (1/mês). 8 categorias
    (headline, about, experience, keywords, international positioning,
    recruiter clarity, proof of impact, english readiness), cada uma com
    nota, diagnóstico, recomendação e exemplo.
- **Histórico** em `/history` e `/history/[id]` (reabre qualquer análise
  salva).
- **UpgradeModal + waitlist** (`/api/waitlist`, tabela `waitlist`) quando o
  limite mensal é atingido — sem Stripe, só captura de interesse.

Tabelas novas em `supabase/schema.sql`: `profiles`, `analyses`, `waitlist`
(mesmo padrão de `leads`: RLS habilitado sem policies, acesso só via service
role). **Pendência manual:** rodar esse SQL no Supabase e habilitar o
provider Google em Authentication → Providers antes do login funcionar de
ponta a ponta.

Arquitetura completa (rotas, schema, riscos, ordem de implementação):
`/Users/eduardomedina/.claude/plans/snuggly-sniffing-sonnet.md`.

---

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui.
- **IA:** API da Anthropic, chamada SEMPRE numa Route Handler do servidor.
- **Extração de PDF:** biblioteca local (ex.: `unpdf` ou `pdf-parse`) — extrai
  TEXTO do PDF no servidor. NÃO mandar PDF como imagem para a IA.
- **Auth:** Supabase Auth (Google OAuth) via `@supabase/ssr` — ver "FASE 2"
  acima. Client admin (service role) em `lib/supabase.ts` continua sendo o
  único a ler/escrever dados; `lib/supabase-browser.ts` e
  `lib/supabase-server.ts` são só pra sessão/autenticação.
- **Analytics:** PostHog (`posthog-js` no client, `posthog-node` pra eventos
  server-side como `signup_completed` — ver `lib/analytics.ts` e
  `lib/posthog-server.ts`).
- (Futuro, não agora: Stripe, Resend, pgvector, Sentry, Helicone.)

---

## Regras inegociáveis

### 1. IA sempre no servidor
A API key NUNCA vai para o cliente. Toda chamada de modelo passa por uma Route
Handler. Isso protege a key e é onde, no futuro, entram débito de crédito e
registro de custo.

### 2. Roteamento de modelo (disciplina de margem)
- **Prosa premium** (headline, e no futuro about/experiências/posts):
  `claude-sonnet-4-6`. Qualidade quase-Opus a custo bem menor no output.
  Só considerar `claude-opus-4-8` se teste cego provar que vale o custo extra.
- **Tarefas estruturadas** (extração de keywords, classificação, parsing,
  scoring): `claude-haiku-4-5-20251001`. Barato e suficiente.
- Validar formato dos outputs no código (ex.: headline ≤ limite de caracteres).

Strings de API atuais (jun/2026): `claude-opus-4-8`, `claude-sonnet-4-6`,
`claude-haiku-4-5-20251001`. (Confirmar em docs.claude.com se houver dúvida —
nomes mudam.)

### 3. Margem desde o dia 1 (preparar ganchos, não implementar agora)
- Deixar comentado/stub onde futuramente entram: registro de `cost_usd` por
  geração, débito de crédito transacional (debitar só após sucesso; reembolsar
  em falha), e cache de outputs determinísticos.
- Prompt caching (até 90% de economia no input cacheado) e Batch API (50%) são
  as alavancas de margem a usar quando escalar.

### 4. ZERO scraping do LinkedIn
- Nunca automatizar a conta do LinkedIn do usuário, nunca pedir senha, nunca
  fazer scraping logado. Viola ToS e arrisca banir a conta do usuário.
- Ingestão de perfil é SEMPRE human-in-the-loop: o usuário cola texto ou sobe
  PDF. (No futuro, o Networking Engine também é human-in-the-loop: o sistema
  gera mensagens e cadência, mas o usuário envia.)
- Enquadramento de marca: "construímos seu pipeline sem nunca pedir sua senha
  nem automatizar sua conta — nenhuma vaga em dólar vale o risco de perder seu
  LinkedIn."

### 5. Segredos
- Variáveis sensíveis em `.env.local`, nunca commitadas. `ANTHROPIC_API_KEY` no
  servidor apenas.

---

## UX — o que faz este MVP funcionar

- **Time-to-value < 3 min.** O score aparece ANTES de qualquer cadastro. A
  primeira reescrita de headline é grátis. Fricção vem depois do valor, nunca
  antes.
- **Antes/depois sempre visível.** Nunca mostrar só o output novo — o cérebro
  precifica a melhora, não o resultado isolado. O componente BeforeAfter é a
  assinatura do produto.
- **Especificidade e números.** "Adicionei 4 keywords que recrutadores de SaaS
  dos EUA buscam: X, Y, Z" vale mais que "melhorei seu perfil". O score e os
  subscores são prova quantificada.
- **1 CTA por tela.** Reduzir paralisia de escolha.
- **Skeleton durante a geração** com mensagem do que está acontecendo
  ("Analisando contra vagas internacionais…") para transformar espera em valor.
- **Empty state / estado inicial:** oferecer um "testar com exemplo" (perfil de
  amostra pré-preenchido) para quem não quer colar o próprio ainda.

---

## Design

### App logado (fintech premium — base atual)
Direção visual: "fintech séria encontra ferramenta de produtividade premium".
Referências: Stripe, Linear, Notion, Perplexity, Arc, Framer.
- Base quase-monocromática (off-white / quase-preto), 1 cor de marca sóbria
  (verde profundo ou azul-petróleo evocando confiança/dólar, não verde-dinheiro
  clichê). Cor de destaque só em CTAs, deltas e score.
- Tipografia sans moderna (Geist — carregada no `app/layout.tsx` raiz),
  números tabulares no score.
- Cantos suaves (8–12px), sombras quase imperceptíveis, bordas finas.
- Motion rápido (150–250ms) a serviço da compreensão. Score animando de 0 ao
  valor no reveal. Confete só em marcos reais, nunca em ação trivial.
- UX writing: confiante, específico, adulto, português nativo.

### Landing `/` (design system v2 — "editorial premium com sotaque brasileiro")
Reskin visual da landing Fase 2 (só `/` — o app logado NÃO usa este sistema).
Fonte de verdade: `globejobbers-handoff/landing-reference.html` (gitignored).
- **Paleta** (tokens aditivos em `tailwind.config.ts`): papel `#FAF4E8`,
  papel-card `#FFFBF2`, tinta `#17130C`, gj-teal `#0F4D4A`, laranja `#E05A26`,
  amarelo `#F2B23A`, jeans/jeans-escuro, folha, terracota.
- **Fontes ESCOPADAS à landing** (não globais): Fraunces (títulos), Space
  Grotesk (UI/corpo), Space Mono (dados/rótulos) — carregadas em `app/page.tsx`
  e aplicadas no wrapper `.gj-landing`. O layout raiz continua em Geist.
  Chaves Tailwind: `font-display`, `font-grotesk`, `font-spacemono`.
- **Botões pílula**: borda 2px tinta, hover `translate(-2px,-2px)` + sombra
  dura (`shadow-dura`, 4px 4px 0 sem blur). Nada de sombra difusa/glass.
- **Ilustrações 3D** em `public/illustrations/` (`gj-cast.png` no hero,
  `gj-hero-duo.png` na Mentoria).
- Cantos 18–26px; fundo cream; motion rápido (100–120ms nos botões).

---

## Métrica que importa nesta fase

**Aha rate:** % de visitantes que colam o perfil, veem o score E aplicam (ou ao
menos visualizam com intenção) a headline reescrita. Tudo neste MVP existe para
medir e maximizar isso. Se possível, instrumentar eventos básicos
(score_viewed, headline_generated) desde já.

---

## Como trabalhar comigo (Claude Code)

- Antes de criar arquivos numa tarefa grande, **mostre o plano primeiro**.
- Se algo empurrar para fora do escopo do MVP de 1 semana, **pergunte antes**.
- Prefira soluções simples e legíveis a abstrações prematuras (sem
  microserviços, sem schema completo, sem otimização precoce).
- Mantenha os ganchos de futuro (margem, créditos) como comentários/stubs
  claros, sem implementá-los.
