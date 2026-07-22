# GlobeJobbers — Estado do Projeto & Handoff

> Documento de continuidade. Se você abrir um chat novo, comece colando ou
> apontando para este arquivo. Ele resume O QUE existe, POR QUE as decisões
> foram tomadas, e O QUE falta. Não é o documento de fundação completo (esse é
> separado) — é o estado operacional atual.
>
> Última atualização: Fase 2 implementada (plataforma SaaS completa, código
> pronto e testado local — build/lint limpos). Pendem 3 ações manuais antes do
> login fechar o ciclo (ver §7). Branch: `feature/mobile-conversion-v2`, nada
> commitado ainda (36 arquivos como working tree changes).

---

## 1. O que é o produto

SaaS que ajuda profissionais brasileiros (2–10 anos de experiência) a conseguir
vagas internacionais remotas e ganhar em dólar, usando a profissão atual.
Público: UX/UI/Product Design, Marketing, Vendas (SDR/AE), Customer Success,
Tecnologia, Produto.

**Posicionamento:** vende-se a transformação (o salto de remuneração ao migrar
para empregador internacional), NÃO uma ferramenta de LinkedIn. Preço ancorado
no upside em dólar, não no custo de tokens.

**NÃO é:** "aprenda a programar". O ângulo é "use sua profissão atual para
ganhar em dólar".

**Tom:** estratégico, moderno, premium, direto. Sem cara de guru/infoproduto.

---

## 2. O que existe HOJE (Fase 2 — plataforma SaaS)

O produto deixou de ser uma ferramenta única anônima e virou uma plataforma
logada com múltiplas ferramentas, histórico e limites de uso gratuito
(preparado, não implementado, para monetização futura).

### Estrutura geral
- `/` — landing institucional nova (substituiu a página única antiga).
- Login via **Google OAuth** (Supabase Auth + `@supabase/ssr`): `/login` +
  `/auth/callback`.
- `middleware.ts` só refresca a sessão; a proteção de rotas de verdade fica em
  `app/(app)/layout.tsx`.
- Clients: `lib/supabase-browser.ts` e `lib/supabase-server.ts` — o client
  admin (service role) já existente continua sendo o único usado para
  gravação/leitura de dados.
- Dashboard mostra as últimas 5 análises reais do usuário.
- `/account` (existia como link morto desde a Etapa 1, resolvido na Etapa 6).

### Os dois fluxos anônimos originais (Fase 1) — preservados, só mudaram de rota
- Ato 2 (PDF completo do perfil) → `/preview/full-scan`
- Ato 1 (print da headline) → `/preview/headline`
- `/headline` antigo tem redirect 308 permanente para a nova rota.
- Nenhuma mudança de comportamento nesses dois fluxos — zero regressão
  confirmada em teste.

### Ferramentas logadas (3), cada uma com limite mensal via `lib/usage.ts`
(cálculo por `COUNT` na tabela `analyses`)

**`/tools/headline` — Headline Optimizer (3/mês)**
Dois modos, decisão explícita de não reaproveitar os fluxos de IA do Ato 1/2:
colar texto, ou perguntas guiadas (formulário curto → IA sintetiza a headline
do zero). Funções: `generateHeadlineFromText` / `generateHeadlineFromAnswers`
em `lib/anthropic.ts`. `ScoreMiniCard` extraído como componente reutilizável.

**`/tools/cv-tailor` — CV Tailor (2/mês)**
Input: cargo-alvo + job description + CV (texto ou PDF) + idioma de saída.
`generateCvTailoring` extrai keywords, compara com o CV, reescreve tudo, gera
bullets e recomendações. **Regra explícita: nunca inventar conquistas.**
`components/cv-tailor-result.tsx` com botão de copiar o CV adaptado.

**`/tools/linkedin-review` — LinkedIn Review (1/mês)**
Input: PDF ou texto colado do perfil completo. `generateLinkedinReview` cobre
8 categorias fixas: headline, about, experience, keywords,
internationalPositioning, recruiterClarity, proofOfImpact, englishReadiness —
cada uma com nota, diagnóstico, recomendação e exemplo.

### Histórico, limites e conversão
- `/history` e `/history/[id]` reabrem qualquer análise salva.
- `UpgradeModal` (overlay hand-rolled) substituiu o mailto stub nas 3
  ferramentas — um clique entra na lista de espera via `/api/waitlist` +
  tabela `waitlist`.

### Analytics (PostHog)
- `signup_completed` disparado do **servidor** via `posthog-node`, detectando
  o primeiro login de verdade (mais confiável que evento client-side).
- `landing_viewed`, `dashboard_viewed`, `tool_card_clicked` via um
  `ViewTracker` reutilizável.
- Eventos antigos do MVP anônimo continuam ativos nos dois fluxos preservados:
  `analysis_clicked`, `score_viewed`, `headline_generated`, `analysis_failed`,
  tagueados `source: "ato1"` / `"ato2"`.
- Gotcha conhecido: toggle "Filter out internal and test users" no PostHog
  esconde eventos reais silenciosamente — manter desligado.

### Score Internacional (0–100) — lógica original, ainda em uso nos fluxos anônimos
**5 subscores** (chave no backend → rótulo na UI):
- `headline` → "Clareza da headline"
- `english` → "Inglês profissional"
- `recruiterReadiness` → "Prontidão para recrutador internacional"
- `keywords` → "Palavras-chave p/ recrutadores"
- `impactClarity` → "Prova de impacto"

**Estágios de prontidão** (em `lib/score-stages.ts`, faixas PROVISÓRIAS):
- 0–40: "Versão local"
- 41–65: "Em transição"
- 66–80: "Quase lá"
- 81–100: "Pronto para o mercado em dólar"

IMPORTANTE: o objetivo do usuário é a vaga em dólar; o score é só um proxy de
prontidão, não um fim. Não enquadrar como "chegar a 100". Frasear sempre como
"sua headline está [estágio]", nunca "você está [estágio]".

---

## 3. Stack & infraestrutura

- **Frontend/app:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui.
- **IA:** API Anthropic, chamada SEMPRE em Route Handler de servidor
  (`app/api/**`). Modelo atual: `claude-sonnet-4-6`. Stub de roteamento
  Haiku/Sonnet existe em `lib/anthropic.ts` mas não está implementado.
- **Extração de PDF:** `unpdf`, no servidor (PDF → texto). Nunca manda PDF como
  imagem para a IA.
- **Auth:** Supabase Auth (Google OAuth) + `@supabase/ssr`.
- **Banco:** Supabase (Postgres). RLS habilitada em todas as tabelas, sem
  policies — acesso só via client admin (service role). Tabelas:
  - `leads` (Fase 1 — id, email, raw_profile, score, created_at)
  - `profiles` (Fase 2 — Etapa 1)
  - `analyses` (Fase 2 — histórico + base do cálculo de limite mensal)
  - `waitlist` (Fase 2 — Etapa 5)
  - Schema completo em `supabase/schema.sql`, fonte de verdade.
  - Projeto na região West US (Oregon). Plano Free — pausa por inatividade,
    upgrade para Pro necessário antes de escalar tráfego de broadcast.
- **Deploy:** Vercel (plano Hobby/grátis — retenção de Runtime Logs de 1h, sem
  contagem histórica de chamadas de API sem o Pro). Repo GitHub PRIVADO:
  eduardomedinaux/globejobbers, branch `feature/mobile-conversion-v2`.
- **Domínio:** `globejobbers.com`, registrado na Squarespace.
- **Identidade visual:** globo navy (#011C49) com traço de órbita verde
  (#8CE39B); wordmark não usa mais Kaushan Script; paleta migrou do teal antigo
  (#0F4D4A). Favicon suite instalada em `app/` (multi-res `.ico`, `icon.png`
  512px, `apple-icon.png` 180px com fundo off-white). Símbolo do globo borra em
  16px — versão simplificada é melhoria futura. Referências de design:
  Stripe/Linear/Notion.

---

## 4. Credenciais & segredos (COMO LIDAR)

- Vivem em `.env.local` (local) e nas Environment Variables da Vercel (produção).
  NUNCA no git (`.env.local` está no `.gitignore`; confirmado fora do
  `git status` antes do push).
- Variáveis server-only: `ANTHROPIC_API_KEY`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`. Client-side (intencional):
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Etapa 1, Fase 2), vars do PostHog com
  prefixo `NEXT_PUBLIC_`.
- **PRINCÍPIO:** segredo nenhum passa pelo chat com o agente nem por mensagem.
  Chaves são coladas à mão direto nos arquivos de ambiente / painel da Vercel.
- **Ação pendente de segurança:** `ANTHROPIC_API_KEY` e
  `SUPABASE_SERVICE_ROLE_KEY` foram expostas em uma sessão de chat — rotação
  de chave documentada como pendente (commit `144c7ef`), ainda não feita.
- Conta Anthropic: pré-paga (pay-as-you-go), começou com US$ 5 de crédito,
  limite mensal baixo, recarga automática DESLIGADA (segurança na fase de teste).
- Supabase service_role IGNORA as policies de RLS, mas ainda precisa de GRANT de
  privilégio na tabela — por isso o schema inclui
  `grant insert, select on public.leads to service_role;` (mesmo padrão
  replicado para `profiles`, `analyses`, `waitlist`).

---

## 5. Decisões-chave e POR QUÊ (não reabrir sem motivo)

- **Zero scraping do LinkedIn.** Nunca automatizar a conta, pedir senha ou fazer
  scraping logado — viola ToS e arrisca banir a conta do usuário. É também
  argumento de marca ("não pedimos sua senha").
- **Input PDF-only nos fluxos anônimos.** Colar texto do LinkedIn é input de
  qualidade imprevisível → score impreciso → mina a credibilidade do número.
  O PDF nativo do LinkedIn é o perfil completo e estruturado. Trade-off
  aceito: mais atrito de upload em troca de input confiável.
- **Login via Google OAuth (não mais só gate de e-mail).** O e-mail capturado
  na Fase 1 era a semente da conta futura — a Fase 2 entrega essa conta.
  Auth social se justifica agora porque existe área logada com estado real
  (dashboard, histórico, limites).
- **Dois modos de IA separados no Headline Optimizer** (não reaproveitar os
  fluxos do Ato 1/2). Decisão explícita — os fluxos anônimos são produto de
  aquisição; a ferramenta logada é produto de retenção, com lógica própria.
- **CV Tailor nunca inventa conquistas.** Regra explícita no prompt — a IA
  reescreve e reposiciona o que já existe no CV, não fabrica resultados.
- **Score com temperature 0.** Necessário para reprodutibilidade — o subscore
  english variava ±10 entre execuções idênticas; baixar a temperature + ancorar
  o prompt em critérios objetivos resolveu (variância caiu para ±2).
- **Estágios de prontidão com faixas provisórias.** Dar significado ao número
  sem fingir calibração que ainda não existe. Recalibrar com dados reais.
- **MVP mínimo, validar antes de expandir** (princípio herdado da Fase 1,
  ainda vale para a Fase 2: as 3 ferramentas + histórico + limites foram o
  próximo passo validado, não uma expansão especulativa).

---

## 6. Princípios de trabalho com Claude Code (e com agentes em geral)

- Antes de tarefas grandes: pedir o PLANO antes de escrever arquivos. (O plano
  completo da Fase 2 está em
  `/Users/eduardomedina/.claude/plans/snuggly-sniffing-sonnet.md`.)
- Não deixar o agente varrer diretórios fora do projeto (home, sistema) —
  apontar o caminho exato. Acesso mínimo necessário.
- Ao alterar código já validado (rota de análise, gate de e-mail, fluxos
  anônimos preservados), exigir que a lógica testada NÃO regrida — mudança
  deve ser cirúrgica.
- Schema do banco é fonte de verdade: toda mudança feita no painel do Supabase
  deve ser refletida em `supabase/schema.sql`.
- TESTAR com os próprios olhos no navegador antes de dar por pronto — não
  confiar só no relato do agente. Incluir teste no mobile.
- `CLAUDE.md` tem uma seção "FASE 2 — Plataforma SaaS (implementada)" que não
  altera as regras inegociáveis do projeto (IA sempre no servidor, roteamento
  de modelo, zero scraping, segredos só no servidor).

---

## 7. O que está PENDENTE / próximos passos

### Bloqueio imediato — só o usuário consegue fazer (login não fecha o ciclo sem isso)
- [ ] Rodar o SQL das 3 tabelas novas (`profiles`, `analyses`, `waitlist`) no
      SQL Editor do Supabase.
- [ ] Configurar Google OAuth: credenciais no Google Cloud Console + habilitar
      provider no Supabase Dashboard + adicionar
      `http://localhost:3000/auth/callback` nas Redirect URLs.
- [ ] Colar a `NEXT_PUBLIC_SUPABASE_ANON_KEY` real em `.env.local` (ainda
      placeholder).
- [ ] Rotacionar `ANTHROPIC_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` (expostas em
      sessão de chat anterior — ver §4).

Fora essas 4 coisas, todo o resto (build, lint, rotas, guards, regressão zero
nos fluxos anônimos) já foi testado e está funcionando.

### Ativo em desenvolvimento — branch `feature/mobile-conversion-v2`
Experimento de UX mobile, hipótese: atrito de upload imediato causa
abandono no tráfego mobile do Instagram (~360 pageviews, baixa conversão em
`analysis_clicked`). Plano de implementação:
- `lib/use-is-mobile.ts` — hook de detecção de viewport.
- `components/headline-value-prop.tsx` — tela de convencimento "Step 1".
- `app/headline/page.tsx` — novo step `"intro"` + `DetectingSkeleton` (evita
  flash) + `handleStartFromIntro()` disparando `value_prop_cta_clicked`.
- Uma linha nova em `lib/analytics.ts`.
- Comportamento desktop inalterado.
- `Linked_Sample_Mobile.png` a ser adicionado em `public/`.

### Lançamento (campanha ManyChat, ainda não confirmado)
- [ ] Teste de fumaça em produção: PDF real → score → e-mail/login → confirmar
      linha no Supabase.
- [ ] Campanha comment-to-DM no Instagram via ManyChat
      (`aguardando-lancamento` tag). Free = 25 contatos ativos/mês; lançamento
      provavelmente exige plano Essential (~US$ 14/mês).

### Melhorias pós-tráfego (NÃO fazer antes de validar)
1. Recalibrar as faixas dos estágios de prontidão com a distribuição real de
   scores.
2. Tornar o score geral reproduzível/auditável: hoje é uma "síntese
   ponderada" decidida pelo modelo (caixa-preta, pesos não definidos). Definir
   pesos explícitos no código e calcular o total a partir dos 5 subscores
   ("seu 75 é baixo porque impacto e inglês puxaram").
3. Web Share Target via PWA (compartilhar screenshot direto pro GlobeJobbers
   sem trocar de app manualmente). Testar Android primeiro (Chromium registra
   sem instalação formal); iOS exige adicionar à tela inicial.
4. Favicon simplificado para 16px.
5. Endurecimento: imagens que não são de LinkedIn retornam score zero em vez
   de erro amigável.
6. Roteamento de modelo Haiku/Sonnet (stub existe, não implementado).
7. Próximas ferramentas da visão completa além das 3 já implementadas
   (ordem sugerida: keywords/análise de vagas → Networking Engine
   human-in-the-loop → …).

---

## 8. Endurecimento já feito (não regredir)

- Score estável (temperature 0 + prompt do inglês ancorado).
- PDF ilegível/escaneado: valida texto mínimo extraído; se vazio, mensagem
  amigável em vez de score-lixo.
- `/api/leads`: valida e-mail no servidor; e-mail duplicado não quebra (insert
  simples = histórico de análises, NÃO upsert); se a gravação no banco falhar,
  a headline ainda revela (não pune o lead) e loga `LEAD_INSERT_FAILED` com
  e-mail+score para recuperação manual via Runtime Logs.
- Zero regressão nos dois fluxos anônimos (`/preview/full-scan`,
  `/preview/headline`) após a migração da Fase 2 — confirmado em teste manual.
- `npm run build` e `npm run lint` passam limpos no estado atual da branch.

---

## 9. Arquivos/locais de referência

- `CLAUDE.md` (raiz) — regras para o Claude Code ler a cada sessão, inclui
  seção "FASE 2 — Plataforma SaaS (implementada)".
- `supabase/schema.sql` — schema de `leads`, `profiles`, `analyses`,
  `waitlist` (com os GRANTs). Fonte de verdade.
- `lib/prompts.ts` — system prompts + schemas das tools de análise (critérios
  de score, das 3 ferramentas logadas).
- `lib/score-stages.ts` — faixas dos estágios (PROVISÓRIAS).
- `lib/anthropic.ts` — chamadas de IA (score original + 3 ferramentas novas) +
  stubs de futuro (roteamento de modelo, cost_usd, débito de crédito, prompt
  caching).
- `lib/usage.ts` — cálculo de limite mensal por ferramenta via `COUNT` em
  `analyses`.
- `lib/supabase-browser.ts` / `lib/supabase-server.ts` — clients de auth.
- `/Users/eduardomedina/.claude/plans/snuggly-sniffing-sonnet.md` — plano
  completo da Fase 2 (arquitetura, schema, riscos, ordem das etapas).
- `design/` (ou onde foi colocado) — handoff do Claude Design.
- Documento de fundação de produto — o doc estratégico completo (separado
  deste).