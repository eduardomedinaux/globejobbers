# GlobeJobbers — Estado do Projeto & Handoff

> Documento de continuidade. Se você abrir um chat novo, comece colando ou
> apontando para este arquivo. Ele resume O QUE existe, POR QUE as decisões
> foram tomadas, e O QUE falta. Não é o documento de fundação completo (esse é
> separado) — é o estado operacional atual.
>
> Última atualização: VIRADA DE DIREÇÃO pré-lançamento. O lançamento foi
> ADIADO ao descobrir um gap crítico no input mobile (ver §0). O MVP está
> migrando de "PDF do perfil completo" para uma arquitetura de DOIS ATOS.

---

## 0. VIRADA DE DIREÇÃO (ler primeiro) — arquitetura de dois atos

**O que motivou:** a campanha de lançamento seria via Instagram (turbinada) =
tráfego majoritariamente MOBILE. Descoberta tardia, mas crítica: o app do
LinkedIn no celular NÃO tem a função "Salvar como PDF" (confirmado na doc oficial
do LinkedIn). E copiar o texto do perfil/headline pelo app mobile também é
difícil/inviável. Ou seja: o único caminho de input do MVP (upload de PDF)
estava QUEBRADO justamente para o canal de aquisição escolhido. Lançar assim
mandaria tráfego pago para um funil furado na porta de entrada.

**Decisão:** NÃO lançar com PDF-only. Adiar e construir uma porta de entrada
que funcione no mobile. Em vez de brigar contra a limitação, usá-la como ponte
de canal (mobile → desktop). Nada do que já foi construído é jogado fora — o
analisador de perfil completo vira o Ato 2.

**Arquitetura de dois atos:**

- **Ato 1 — Mobile (porta de entrada, vinda do Instagram):**
  1. Pessoa chega do Instagram, no celular.
  2. Sobe um PRINT (screenshot) da headline do LinkedIn — print é o gesto mais
     natural do mobile, todo mundo sabe fazer.
  3. IA com VISÃO (modelo multimodal, não mais texto puro) lê a headline do print.
  4. Entrega: headline reescrita (antes/depois) + número + estágio nomeado.
     - Reusa as faixas/estágios de `lib/score-stages.ts` (mesmos nomes do perfil).
     - MAS o texto na tela SEMPRE enquadra como "sua HEADLINE está [estágio]",
       nunca "VOCÊ está [estágio]" — senão promete prontidão que a headline
       sozinha não sustenta, e mata o gancho do Ato 2.
  5. Gate de e-mail DEPOIS de mostrar o valor: "sua headline é 1 de 5 dimensões;
     quer o Score Internacional do perfil completo? Deixa seu e-mail."
  6. Captura: e-mail + headline original + estágio.

- **Ato 2 — Retorno ao desktop (o produto que JÁ existe):**
  - E-mail de retorno (MANUAL no MVP — juntar e-mails e mandar em lote; não
    construir serviço de e-mail automático ainda): "Você viu o score da sua
    headline. Agora veja o do perfil inteiro — no computador, 2 min: [link]".
  - No desktop, o fluxo de PDF JÁ CONSTRUÍDO funciona (lá o "Salvar como PDF"
    existe): 5 subscores, análise completa, gate, Supabase. Isso vira o Ato 2.

**Por que isso é melhor, não um remendo:** dois momentos de valor (headline no
mobile + perfil no desktop); o atrito do PDF vira o degrau do upsell em vez de
um muro; quem volta para o desktop é lead quente (já viu valor e investiu
esforço).

**Decisões de input que foram REJEITADAS e por quê:**
- Instruções/carrossel ensinando a exportar PDF no mobile → instrução não resolve
  IMPOSSIBILIDADE (a função não existe no app). O workaround (navegador → versão
  desktop → imprimir) é um fluxo de 6-7 passos frágeis; o abandono se multiplica
  a cada passo. Marketing não conserta funil quebrado.
- "Login com LinkedIn para puxar os dados" → o Sign-In oficial (OIDC) só dá
  nome/e-mail/foto, NÃO headline/about/experiências. Ferramentas que prometem
  mais (ex.: Unipile) fazem automação da conta logada = scraping disfarçado =
  viola ToS e arrisca BANIR a conta do usuário. Rejeitado (mesma razão de §5).
- Aceitar texto colado no mobile → copiar texto do perfil/headline no app é
  difícil/inviável (relato do próprio usuário). Não resolve.

**Status:** Ato 1 ainda NÃO construído. Próximo passo é o briefing para o Claude
Code. Construção real (upload de imagem + IA com visão + nova tela de resultado
de headline) — alguns dias de trabalho, não um ajuste. A campanha só acontece
depois do Ato 1 testado no celular com prints reais.

**Riscos do Ato 1 a tratar na construção:**
- Prints variam (tema claro/escuro, zoom, recorte, print demais/de menos) →
  tratamento de erro robusto: "não consegui ler a headline, tente de novo
  mostrando a frase abaixo do seu nome". É o equivalente do PDF escaneado, e
  agora é o ÚNICO caminho de entrada → ainda mais crítico.
- Visão custa um pouco mais que texto, mas headline é imagem pequena → segue
  barato (fração de centavo). Modelo muda de sonnet texto p/ um com visão.

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

## 2. O Ato 2 / produto desktop (o que JÁ está construído e no ar)

> NOTA: tudo nesta seção continua válido e construído — mas agora é o **Ato 2**
> (desktop), não mais o MVP inteiro. A porta de entrada passa a ser o Ato 1
> (headline via print, mobile — ver §0), que ainda será construído.

Fluxo de página única (desktop):

1. Usuário sobe o **PDF do perfil do LinkedIn** (input PDF-only; não há mais
   campo de colar texto — ver decisão em §5).
2. O sistema extrai o texto do PDF no servidor e chama a IA
   (claude-sonnet-4-6) para analisar.
3. Retorna um **Score Internacional (0–100)** com 5 subscores.
4. Mostra uma **headline reescrita** (antes/depois), borrada atrás de um
   **gate de e-mail** — revela após o usuário deixar o e-mail.
5. O lead (e-mail + perfil + score) é gravado no Supabase.

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
prontidão, não um fim. Não enquadrar como "chegar a 100".

---

## 3. Stack & infraestrutura

- **Frontend/app:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui.
- **IA:** API Anthropic, chamada SEMPRE em Route Handler de servidor
  (app/api/**). Modelo atual: `claude-sonnet-4-6` (uma chamada faz scoring +
  reescrita). Strings de API (jun/2026): `claude-opus-4-8`, `claude-sonnet-4-6`,
  `claude-haiku-4-5-20251001`.
- **Extração de PDF:** `unpdf`, no servidor (PDF → texto). Nunca manda PDF como
  imagem para a IA.
- **Banco:** Supabase (Postgres). Tabela `leads` (id, email, raw_profile,
  score, created_at). RLS habilitada. Projeto na região West US (Oregon).
- **Deploy:** Vercel (plano Hobby/grátis). Repo GitHub PRIVADO:
  eduardomedinaux/globejobbers, branch main.
- **Design:** handoff do Claude Design recriado no Next.js. Paleta off-white +
  teal profundo (#0F4D4A / hsl(177 67% 18%)). Tipografia Geist (UI) + Kaushan
  Script (só a wordmark). Referências: Stripe/Linear/Notion/Perplexity/Arc.

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
- **Input PDF-only (não texto colado).** Colar texto do LinkedIn é input de
  qualidade imprevisível (a pessoa copia só o header, ou pedaços) → score
  impreciso → mina a credibilidade do número. O PDF nativo do LinkedIn é o
  perfil completo e estruturado. Trade-off aceito: mais atrito de upload em
  troca de input confiável.
  **REVISADO (ver §0):** esta lógica de PDF vale só para o ATO 2 (desktop), onde
  o "Salvar como PDF" existe. No mobile o PDF é inviável → o Ato 1 usa PRINT da
  headline + IA com visão. O raciocínio de "input confiável > conveniência"
  segue valendo; o que mudou foi reconhecer que PDF não é viável no canal mobile.
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

### Imediato (construir o Ato 1 ANTES de qualquer campanha)
- [ ] **Construir o Ato 1 (headline via print + IA com visão)** — ver §0 para o
      fluxo completo. É a porta de entrada mobile que destrava a campanha.
      Construção real, não ajuste. Pedir PLANO ao Claude Code antes de codar.
      Decisões já travadas: número + estágio nomeado; reusar estágios de
      score-stages.ts mas enquadrar como "sua headline está [estágio]"; gate de
      e-mail DEPOIS de mostrar valor; e-mail de retorno MANUAL no MVP.
- [ ] **Testar o Ato 1 no CELULAR com prints reais** (temas claro/escuro, recortes
      variados) antes de dar por pronto. O tratamento de erro de print ilegível é
      crítico (único caminho de entrada).
- [ ] **Teste de fumaça em PRODUÇÃO do Ato 2** (ainda não confirmado!): subir um
      PDF real na URL pública (desktop) → ver score → deixar e-mail → confirmar a
      linha no Supabase. Logs em Vercel → projeto → Runtime Logs.
- [ ] **Registrar domínio** e apontar para a Vercel.

### Campanha (só DEPOIS do Ato 1 testado)
- [ ] **ManyChat** (comment-to-DM no Instagram). Notas:
      - Instagram NÃO permite DM frio: a pessoa precisa comentar/interagir 1º.
      - 1ª DM (private reply) só aceita 1 bloco → texto curto + botão com link.
      - ManyChat grátis = 25 contatos ativos/mês; provavelmente exige plano
        Essential (~US$ 14/mês).
      - Copy: "comente a headline do seu LinkedIn e receba seu score" — casa
        perfeitamente com o Ato 1 (headline). O carrossel/post deve levar à ação
        FÁCIL (print da headline), NÃO a instruções de exportar PDF (ver §0).

### Métricas a observar (a aha rate é o objetivo da fase)
- Comentários (topo) → cliques no link da DM (ManyChat separa "Runs" de "Sends").
- Chegaram no site → **subiram o print da headline** (vazamento a vigiar; mas
  print é gesto natural no mobile, deve vazar bem menos que o PDF vazaria).
- Viram a headline reescrita + estágio → deixaram o e-mail (a aha rate do Ato 1).
- Quantos do Ato 1 voltam e completam o Ato 2 no desktop (conversão da ponte).
- INSTRUMENTAÇÃO: confirmar que dá para medir o meio do funil (chegou no site,
  subiu o print), não só as pontas (cliques no ManyChat, leads no Supabase).

### Melhorias pós-tráfego (NÃO fazer antes de validar)
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
- PDF ilegível/escaneado: valida texto mínimo extraído; se vazio, mensagem
  amigável em vez de score-lixo. CRÍTICO agora que PDF é o único caminho.
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
- `design/` (ou onde foi colocado) — handoff do Claude Design.
- Documento de fundação de produto — o doc estratégico completo (separado deste).
