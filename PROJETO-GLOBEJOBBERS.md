# GlobeJobbers — Estado do Projeto & Handoff

> Documento de continuidade. Se você abrir um chat novo, comece colando ou
> apontando para este arquivo. Ele resume O QUE existe, POR QUE as decisões
> foram tomadas, e O QUE falta. Não é o documento de fundação completo (esse é
> separado) — é o estado operacional atual.
>
> Última atualização: MVP no ar em produção, domínio ativo, primeiros stories
> de anúncio disparados (baixo volume). Fase: validar aha rate com tráfego real.

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

Arquitetura de dois atos, pensada para tráfego mobile de Instagram.

### Act 1 — entrada por screenshot (caminho mobile, validado)
1. Usuário manda um **print (screenshot) da headline do LinkedIn** — não precisa
   exportar PDF. Caminho pensado para o mobile, onde o LinkedIn não oferece
   "Salvar como PDF".
2. A IA (vision) **lê a headline direto da imagem** e devolve uma **headline
   reescrita** (antes/depois).
3. A reescrita aparece borrada atrás de um **gate de e-mail** — revela após o
   usuário deixar o e-mail.
4. O lead é gravado no Supabase.
5. Rota pública do Act 1: **`/headline`** (é o link que a campanha aponta).

### Act 2 — análise completa por PDF
- Usuário sobe o **PDF do perfil do LinkedIn**; o servidor extrai o texto
  (`unpdf`) e a IA analisa o perfil inteiro.
- Retorna o **Score Internacional (0–100)** com 5 subscores.
- [CONFIRMAR estado atual: o Act 2/PDF continua ativo no produto no ar em
  paralelo ao Act 1, ou o screenshot passou a ser o único caminho? Ajustar esta
  seção conforme a resposta.]

**Os 5 subscores** (chave no backend → rótulo na UI):
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
prontidão, não um fim. Enquadrar como "sua headline está [estágio]", não "você
está [estágio]". Não enquadrar como "chegar a 100".

---

## 3. Stack & infraestrutura

- **Frontend/app:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui.
- **IA:** API Anthropic, chamada SEMPRE em Route Handler de servidor
  (app/api/**). Act 1 usa **vision** (`analyzeHeadlineFromImage`, lê a headline
  da imagem); Act 2 usa texto extraído do PDF (`generateAnalysis`). AMBOS usam
  `claude-sonnet-4-6` (constante `ANALYSIS_MODEL` em `lib/anthropic.ts`). O
  roteamento Haiku (tarefa estruturada) + Sonnet (prosa) é stub FUTURE, ainda
  não implementado. Strings de API (jun/2026): `claude-opus-4-8`,
  `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`.
- **Extração de PDF (Act 2):** `unpdf`, no servidor (PDF → texto). Nunca manda
  PDF como imagem para a IA.
- **Banco:** Supabase (Postgres). Tabela `leads` (id, email, raw_profile,
  score, created_at). RLS habilitada. Projeto na região West US (Oregon).
  ATENÇÃO: plano **Free** — pausa por inatividade. Com tráfego pingado, risco
  real de pausar bem na hora de um lead. Subir para Pro ou manter ativo antes
  de escalar anúncio. (Ver §7.)
  NOTA sobre scores: o Act 1 produz `headlineScore` (1 dimensão, via
  `HEADLINE_VISION_TOOL`) e o Act 2 produz `score` completo + 5 subscores (via
  `ANALYSIS_TOOL`) — são campos distintos no código, não o mesmo número. Ao
  recalibrar as faixas dos estágios (§7), separar as duas origens; um score de
  headline não é comparável a um score de perfil completo.
- **Deploy:** Vercel. Repo GitHub PRIVADO: eduardomedinaux/globejobbers,
  branch main.
- **Domínio:** `globejobbers.com` registrado no Squarespace (DNS gerido lá,
  apontando para a Vercel). No ar com HTTPS. `globejobbers.com` → 308 →
  `www.globejobbers.com` (produção). Registros DNS: A `@` → 216.198.79.1;
  CNAME `www` → hash vercel-dns do projeto.
- **Design:** paleta off-white + **azul-marinho #011C49** com detalhe de
  **verde #8CE39B** (órbita do símbolo). NÃO é mais o teal #0F4D4A antigo.
  Símbolo: globo estilizado marinho com traço verde de órbita. Wordmark NÃO usa
  mais Kaushan Script. Favicon (favicon.ico multi-res 16/32/48, icon.png 512,
  apple-icon.png 180 com fundo off-white) na pasta `app/`. Referências:
  Stripe/Linear/Notion/Perplexity/Arc.

---

## 4. Credenciais & segredos (COMO LIDAR)

- Vivem em `.env.local` (local) e nas Environment Variables da Vercel (produção).
  NUNCA no git (`.env.local` está no `.gitignore`; confirmado fora do
  `git status` antes do push).
- Variáveis: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Nenhuma com prefixo `NEXT_PUBLIC_` (são segredos de servidor).
- **PRINCÍPIO:** segredo nenhum passa pelo chat com o agente nem por mensagem.
  Chaves são coladas à mão direto nos arquivos de ambiente / painel da Vercel.
- Conta Anthropic: pré-paga (pay-as-you-go), começou com US$ 5 de crédito,
  limite mensal baixo, recarga automática DESLIGADA (segurança na fase de teste).
- Supabase service_role IGNORA as policies de RLS, mas ainda precisa de GRANT de
  privilégio na tabela — por isso o `schema.sql` inclui
  `grant insert, select on public.leads to service_role;` (resolveu o erro 42501).

---

## 5. Decisões-chave e POR QUÊ (não reabrir sem motivo)

- **Zero scraping do LinkedIn.** Nunca automatizar a conta, pedir senha ou fazer
  scraping logado — viola ToS e arrisca banir a conta do usuário. É também
  argumento de marca ("não pedimos sua senha").
- **Act 1 por screenshot (não PDF) para o caminho mobile.** O PDF-only quebrava
  no mobile do Instagram — o LinkedIn mobile não tem "Salvar como PDF", então o
  tráfego mobile ficava travado no input. O screenshot da headline resolve o
  atrito de entrada. Foi o conserto do maior vazamento previsto no funil. O PDF
  segue como caminho da análise completa (Act 2).
- **Gate de e-mail (não Google Auth).** Captura de lead é o resultado da fase
  atual. Auth social só se justifica quando houver área logada com estado — é
  fase posterior. O e-mail capturado será a semente da conta no futuro.
- **Score com temperature 0.** Necessário para reprodutibilidade — o subscore
  english variava ±10 entre execuções idênticas; baixar a temperature + ancorar
  o prompt em critérios objetivos resolveu (variância caiu para ±2).
- **Estágios de prontidão com faixas provisórias.** Dar significado ao número
  sem fingir calibração que ainda não existe. Recalibrar com dados reais.
- **MVP mínimo, validar antes de expandir.** Construir 1 ferramenta validada
  antes das 10. NÃO adicionar features sem dados de tráfego que justifiquem.

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

---

## 7. O que está PENDENTE / próximos passos

### Já feito no lançamento
- [x] Teste de fumaça em produção: print → reescrita → e-mail → linha no
      Supabase confirmada.
- [x] Domínio `globejobbers.com` no ar com HTTPS (apontado para a Vercel).
- [x] Favicon instalado.

### Imediato
- [ ] **Campanha via ManyChat** (comment-to-DM no Instagram). Link tem que
      apontar para **`globejobbers.com/headline`** (o Act 1), NÃO a raiz nem o
      `.vercel.app`. Notas:
      - Instagram NÃO permite DM frio: a pessoa precisa comentar/interagir 1º.
      - 1ª DM (private reply) só aceita 1 bloco de conteúdo → usar texto curto +
        botão com o link.
      - ManyChat grátis = 25 contatos ativos/mês; lançamento provavelmente exige
        plano Essential (~US$ 14/mês).
      - Automação com trigger de comentário, tag `aguardando-lancamento`, e
        broadcast usando o Human Agent message tag.
      - Copy: "comente a headline atual do seu LinkedIn e receba seu Score
        Internacional" — gera engajamento + entra no clima do produto.
- [ ] **Supabase Free não pode pausar durante o broadcast.** Subir para Pro ou
      garantir que está ativo no momento do disparo.

### Métricas a observar (a aha rate é o objetivo da fase)
- Comentários (topo) → cliques no link da DM (ManyChat separa "Runs" de "Sends").
- Chegaram no site → **mandaram o print** (aqui mora o vazamento de input; agora
  é atrito de screenshot, não mais de PDF).
- Viram a reescrita/score → deixaram o e-mail (a aha rate real).
- Distinção-chave quando o volume subir: dos que não converteram, quantos NEM
  mandaram o print (atrito de input) vs. quantos mandaram e não deixaram e-mail
  (valor não percebido). São problemas diferentes com soluções diferentes.
- NÃO tirar conclusão de amostras pequenas (n de uma dezena não significa nada
  estatisticamente).

### Melhorias pós-tráfego (NÃO fazer antes de validar)
1. **Recalibrar as faixas dos estágios** com a distribuição real de scores.
2. **Tornar o score geral reproduzível/auditável:** hoje o número geral é uma
   "síntese ponderada" decidida pelo modelo (caixa-preta, pesos não definidos).
   Definir pesos explícitos no código e calcular o total a partir dos 5
   subscores, para o número virar explicável ("seu 75 é baixo porque impacto e
   inglês puxaram"). É meio pré-requisito de #1.
3. **Act 1 — validar que a imagem é uma headline de LinkedIn antes de pontuar.**
   Hoje uma imagem aleatória retorna score/resultado como se fosse válido (o
   equivalente ao PDF escaneado do Act 2). Além de UX ruim, contamina a
   distribuição de scores usada para recalibrar as faixas.
4. **Favicon 16px:** o símbolo detalhado borra em 16×16; fazer uma variante
   simplificada só para tamanho pequeno.
5. Só então: próximas ferramentas da visão completa (ordem sugerida: Gerador de
   About → Reescritor de Experiências → keywords/análise de vagas → … →
   Networking Engine human-in-the-loop).

---

## 8. Endurecimento já feito (não regredir)

- Score estável (temperature 0 + prompt do inglês ancorado).
- PDF ilegível/escaneado (Act 2): valida texto mínimo extraído; se vazio,
  mensagem amigável em vez de score-lixo.
- /api/leads: valida e-mail no servidor; e-mail duplicado não quebra (insert
  simples = histórico de análises, NÃO upsert); se a gravação no banco falhar, a
  headline ainda revela (não pune o lead) e loga `LEAD_INSERT_FAILED` com
  e-mail+score para recuperação manual via Runtime Logs.

Pendente de endurecer: validação de imagem não-LinkedIn no Act 1 (ver §7 item 3).

---

## 9. Arquivos/locais de referência

- `CLAUDE.md` (raiz) — regras para o Claude Code ler a cada sessão.
- `supabase/schema.sql` — schema da tabela leads (com o GRANT). Fonte de verdade.
- `lib/prompts.ts` — system prompt + schema da tool de análise (critérios do score).
- `lib/score-stages.ts` — faixas dos estágios (PROVISÓRIAS).
- `lib/anthropic.ts` — chamada de IA + stubs de futuro (roteamento de modelo,
  cost_usd, débito de crédito, prompt caching).
- `app/` — favicon.ico, icon.png, apple-icon.png (ícones do App Router).
- `design/` (ou onde foi colocado) — handoff do Claude Design.
- Documento de fundação de produto — o doc estratégico completo (separado deste).
