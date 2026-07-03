# GlobeJobbers — Estado do Projeto & Handoff

> Documento de continuidade. Se você abrir um chat novo, comece colando ou
> apontando para este arquivo. Ele resume O QUE existe, POR QUE as decisões
> foram tomadas, e O QUE falta. Não é o documento de fundação completo (esse é
> separado) — é o estado operacional atual.
>
> Última atualização: pós-lançamento, tráfego inicial rodando (Instagram ads),
> instrumentação de funil (PostHog) confirmada em produção.

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

## 2. O que o MVP faz HOJE (escopo atual, no ar)

Dois fluxos coexistem em produção:

### Ato 1 — `/headline` (mobile, entrada principal via Instagram)
1. Usuário sobe um **print (imagem) da headline do LinkedIn** — JPEG/PNG/WebP,
   máx. 5MB. NÃO é PDF (decisão revertida — ver §5).
2. A imagem vai direto para a IA (vision), sem extração de texto intermediária.
3. Retorna um **Score da Headline (0–100)** + headline reescrita, exibidos
   juntos, sem gate de e-mail bloqueando a visualização.
4. Captura de e-mail acontece DEPOIS do resultado já visível, como oferta de
   conteúdo semanal (não como gate).

### Ato 2 — `/` (desktop, upsell do perfil completo)
1. Usuário sobe o **PDF do perfil completo do LinkedIn**.
2. O sistema extrai o texto do PDF no servidor e chama a IA para analisar.
3. Retorna um **Score Internacional (0–100)** com 5 subscores.
4. Mostra a headline reescrita **borrada atrás de um gate de e-mail** — revela
   após o usuário deixar o e-mail.

Ambos os fluxos gravam o lead no Supabase (tabela `leads`) e usam o mesmo
modelo de IA (`claude-sonnet-4-6`), via `ANALYSIS_MODEL` em `lib/anthropic.ts`.

**Os 5 subscores do Ato 2** (chave no backend → rótulo na UI):
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

A tela mostra o estágio junto ao número + aponta o subscore mais fraco.
IMPORTANTE: o objetivo do usuário é a vaga em dólar; o score é só um proxy de
prontidão, não um fim. Não enquadrar como "chegar a 100".

---

## 3. Stack & infraestrutura

- **Frontend/app:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui.
- **IA:** API Anthropic, chamada SEMPRE em Route Handler de servidor
  (app/api/**: `analyze-headline` para Ato 1, `analyze` para Ato 2, `leads`
  para captura de e-mail). Modelo atual: `claude-sonnet-4-6` (uma chamada faz
  scoring + reescrita). Strings de API (jun/2026): `claude-opus-4-8`,
  `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`.
- **Extração de PDF (só Ato 2):** `unpdf`, no servidor (PDF → texto).
- **Ato 1 usa vision AI diretamente sobre a imagem** — sem extração intermediária.
- **Banco:** Supabase (Postgres). Tabela `leads` (id, email, raw_profile,
  score, created_at, source). RLS habilitada. Projeto na região West US (Oregon).
- **Analytics de produto:** PostHog instalado (client-side, `posthog-js`),
  região EU. Eventos: `analysis_clicked`, `score_viewed`, `headline_generated`,
  `analysis_failed` — todos com prop `source: "ato1" | "ato2"` para segmentar
  os dois fluxos. Instrumentação centralizada em `lib/analytics.ts` (função
  `track()`). Produtos ativos: Product Analytics, Session Replay, Web Analytics.
  Confirmado funcionando em produção. NOTA: o toggle "Filter out internal and
  test users" no painel do PostHog pode esconder eventos reais — desligar ao
  investigar dados que "não aparecem".
- **Deploy:** Vercel (plano Hobby/grátis). Repo GitHub PRIVADO:
  eduardomedinaux/globejobbers, branch main.
- **Design:** handoff do Claude Design recriado no Next.js. Paleta navy
  (#011C49) + verde (#8CE39B) — substituiu a paleta teal (#0F4D4A) usada nas
  telas já construídas; migração visual pendente (ver §7). Tipografia Geist
  (UI). Wordmark NÃO usa Kaushan Script. Referências: Stripe/Linear/Notion.

---

## 4. Credenciais & segredos (COMO LIDAR)

- Vivem em `.env.local` (local) e nas Environment Variables da Vercel (produção).
  NUNCA no git (`.env.local` está no `.gitignore`; confirmado fora do
  `git status` antes do push).
- Variáveis server-only: `ANTHROPIC_API_KEY`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`. Nenhuma com prefixo `NEXT_PUBLIC_`.
- Variáveis públicas (client-side, ok expor): `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`,
  `NEXT_PUBLIC_POSTHOG_HOST`.
- **PRINCÍPIO:** segredo nenhum passa pelo chat com o agente nem por mensagem.
  Chaves são coladas à mão direto nos arquivos de ambiente / painel da Vercel.
- ⚠️ **AÇÃO PENDENTE:** `ANTHROPIC_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY` foram
  expostas acidentalmente em uma sessão de chat (via `cat .env.local` colado).
  Risco assumido temporariamente — **rotacionar as duas chaves** assim que
  possível (Anthropic Console → Settings → API Keys; Supabase → Project
  Settings → API Keys) e atualizar `.env.local` + Vercel com os novos valores.
- Conta Anthropic: pré-paga (pay-as-you-go), limite mensal baixo, recarga
  automática DESLIGADA (segurança na fase de teste).
- Supabase service_role IGNORA as policies de RLS, mas ainda precisa de GRANT de
  privilégio na tabela — por isso o `schema.sql` inclui
  `grant insert, select on public.leads to service_role;` (resolveu o erro 42501).

---

## 5. Decisões-chave e POR QUÊ (não reabrir sem motivo)

- **Zero scraping do LinkedIn.** Nunca automatizar a conta, pedir senha ou fazer
  scraping logado — viola ToS e arrisca banir a conta do usuário. É também
  argumento de marca ("não pedimos sua senha").
- **Ato 1 usa imagem, não PDF (decisão revertida).** PDF-only era incompatível
  com tráfego mobile do Instagram — LinkedIn mobile não tem "Salvar como PDF"
  nativo. Pivô para screenshot + vision AI antes do lançamento, especificamente
  para viabilizar a campanha de Instagram. Ato 2 (desktop) manteve PDF, onde
  o atrito de exportar é menor.
- **Gate de e-mail só no Ato 2.** No Ato 1, o resultado aparece sem gate —
  prioriza a "aha rate" e reduz fricção em tráfego frio de anúncio. No Ato 2,
  o gate se justifica pelo público (quem já veio disposto a investir mais
  esforço no PDF).
- **Score com temperature 0.** Necessário para reprodutibilidade — o subscore
  english variava ±10 entre execuções idênticas; baixar a temperature + ancorar
  o prompt em critérios objetivos resolveu (variância caiu para ±2).
- **Estágios de prontidão com faixas provisórias.** Dar significado ao número
  sem fingir calibração que ainda não existe. Recalibrar com dados reais.
- **MVP mínimo, validar antes de expandir.** Construir 1 ferramenta validada
  antes das 10. NÃO adicionar features sem dados de tráfego que justifiquem.
- **PostHog em vez de instrumentação manual via Supabase.** Resolve funil,
  UTM por campanha, session replay e tempo entre etapas de uma vez, sem
  precisar desenhar/manter eventos e queries à mão.

---

## 6. Princípios de trabalho com Claude Code (e com agentes em geral)

- Antes de tarefas grandes: pedir o PLANO antes de escrever arquivos.
- Não deixar o agente varrer diretórios fora do projeto (home, sistema) —
  apontar o caminho exato. Acesso mínimo necessário.
- Ao alterar código já validado (rota de análise, gate de e-mail), exigir que a
  lógica testada NÃO regrida — mudança deve ser cirúrgica.
- Schema do banco é fonte de verdade: toda mudança feita no painel do Supabase
  deve ser refletida em `supabase/schema.sql`.
- TESTAR com os próprios olhos no navegador antes de dar por pronto — não
  confiar só no relato do agente. Incluir teste no mobile.
- **Nunca colar o conteúdo de `.env.local` (ou qualquer segredo) no chat com o
  agente** — se acontecer, tratar a chave como comprometida e rotacionar.
- Antes de commits, sempre rodar `git status` e conferir que não há arquivos
  `deleted:` inesperados (já aconteceu por engano nesta sessão — restaurados
  com `git restore`).

---

## 7. O que está PENDENTE / próximos passos

### Imediato
- [ ] **Rotacionar `ANTHROPIC_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY`** (ver §4)
      — expostas em chat, ainda não trocadas.
- [ ] **Migrar paleta visual** de teal (#0F4D4A) para navy/verde
      (#011C49 / #8CE39B) nas telas já construídas — hoje só o handoff de
      marca foi atualizado, o código ainda usa a paleta antiga.
- [ ] Montar funil visual no PostHog (Product Analytics → Funnels):
      `$pageview` → `analysis_clicked` → `score_viewed` → `headline_generated`.
- [ ] Configurar UTM por campanha nos anúncios (ex.: variante Homem vs. Mulher)
      para segmentar performance por criativo dentro do PostHog.

### Métricas de funil (agora medíveis via PostHog, ver §3)
Eventos disponíveis para montar funil completo por fonte (`ato1` vs `ato2`):
`$pageview` → `analysis_clicked` → `score_viewed` → `headline_generated`
(e-mail).

Baseline pré-PostHog (medido manualmente, 24h, plano Hobby sem Runtime Logs
históricos): 109 visitas em `/headline` → 4 e-mails capturados (~3,7%
visita→e-mail). Etapa intermediária ("chegaram ao score") não pôde ser
medida com precisão nesse período — só estimada via volume de tokens no
console Anthropic (imprecisa, não usar como referência definitiva). A partir
de agora, usar os dados do PostHog como fonte de verdade do funil.

### Melhorias pós-tráfego (NÃO fazer antes de validar com dados do PostHog)
1. **Recalibrar as faixas dos estágios** com a distribuição real de scores.
2. **Tornar o score geral reproduzível/auditável:** hoje o número geral é uma
   "síntese ponderada" decidida pelo modelo (caixa-preta, pesos não definidos).
   Definir pesos explícitos no código e calcular o total a partir dos 5
   subscores, para o número virar explicável ("seu 75 é baixo porque impacto e
   inglês puxaram"). É meio pré-requisito de #1.
3. Só então: próximas ferramentas da visão completa (ordem sugerida: Gerador de
   About → Reescritor de Experiências → keywords/análise de vagas → … →
   Networking Engine human-in-the-loop).

---

## 8. Endurecimento já feito (não regredir)

- Score estável (temperature 0 + prompt do inglês ancorado).
- PDF ilegível/escaneado (Ato 2): valida texto mínimo extraído; se vazio,
  mensagem amigável em vez de score-lixo.
- ⚠️ Ato 1 (imagem) ainda NÃO tem o equivalente para imagem não-LinkedIn —
  imagens que não são print de headline retornam score 0 em vez de erro
  amigável. Mesma categoria de problema do PDF escaneado, mas não corrigido.
- /api/leads: valida e-mail no servidor; e-mail duplicado não quebra (insert
  simples = histórico de análises, NÃO upsert); se a gravação no banco falhar, a
  headline ainda revela (não pune o lead) e loga `LEAD_INSERT_FAILED` com
  e-mail+score para recuperação manual via Runtime Logs.

---

## 9. Arquivos/locais de referência

- `CLAUDE.md` (raiz) — regras para o Claude Code ler a cada sessão.
- `supabase/schema.sql` — schema da tabela leads (com o GRANT). Fonte de verdade.
- `lib/prompts.ts` — system prompt + schema da tool de análise (critérios do score).
- `lib/score-stages.ts` — faixas dos estágios (PROVISÓRIAS).
- `lib/anthropic.ts` — chamada de IA + stubs de futuro (roteamento de modelo,
  cost_usd, débito de crédito, prompt caching).
- `lib/analytics.ts` — instrumentação PostHog centralizada (função `track()`).
- `app/providers.tsx` — inicialização do PostHog (client-side).
- `app/headline/page.tsx` — Ato 1 (screenshot).
- `app/page.tsx` — Ato 2 (PDF).
- `design/` (ou onde foi colocado) — handoff do Claude Design.
- Documento de fundação de produto — o doc estratégico completo (separado deste).