-- GlobeJobbers — MVP de 1 semana
-- Rode este script no SQL Editor do Supabase (Dashboard > SQL Editor > New query).
--
-- Tabela única do MVP: captura o lead (email) junto com o perfil colado e o
-- score calculado, no momento em que o visitante revela a headline reescrita.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  raw_profile text not null,
  score integer not null check (score >= 0 and score <= 100),
  source text,
  created_at timestamptz not null default now()
);

-- Para tabelas já existentes: ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text;

create index if not exists leads_email_idx on public.leads (email);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- RLS habilitado e sem policies: a tabela só é acessível via service role key
-- (usada exclusivamente no servidor, em app/api/leads/route.ts). O client
-- nunca acessa o Supabase diretamente nesta fase.
alter table public.leads enable row level security;

-- RLS habilitada não concede privilégios por si só — sem este GRANT, o
-- service role (usado em app/api/leads/route.ts) recebe "permission denied
-- for table leads" (42501) ao tentar inserir, mesmo sem nenhuma policy ativa.
grant insert, select on public.leads to service_role;

-- FUTURE: tabela `generations` para registrar cost_usd por chamada de IA
-- (ver lib/anthropic.ts).

-- ============================================================================
-- Fase 2 — Plataforma SaaS (auth, dashboard, ferramentas logadas)
-- ============================================================================
--
-- `profiles`: espelha auth.users (criado/atualizado no upsert de
-- app/auth/callback/route.ts após login com Google). `waitlist` chega na
-- Etapa 5 (ver plano de implementação).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Mesmo padrão de `leads`: RLS habilitado sem policies, acesso só via
-- service role (usado em app/auth/callback/route.ts e app/(app)/layout.tsx).
grant select, insert, update on public.profiles to service_role;

-- `analyses`: uma linha por análise rodada em qualquer ferramenta logada
-- (histórico + base do cálculo de limite mensal em lib/usage.ts — sem
-- tabela de contagem separada, ver comentário lá).
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_type text not null check (tool_type in ('headline', 'cv_tailor', 'linkedin_review')),
  input_summary text,
  input_data jsonb,
  output_data jsonb not null,
  score integer check (score >= 0 and score <= 100),
  created_at timestamptz not null default now()
);

-- Índice composto: toda leitura relevante filtra por usuário e ordena/filtra
-- por data (histórico e COUNT de uso mensal em lib/usage.ts).
create index if not exists analyses_user_id_created_at_idx
  on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;
grant select, insert on public.analyses to service_role;

-- `waitlist`: interesse no plano Pro/mentoria, disparado pelo UpgradeModal
-- (ver app/api/waitlist/route.ts). `user_id` fica nulo quando o interesse
-- vem de fora da área logada (ex.: seção de mentoria da landing).
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  source text,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
grant insert, select on public.waitlist to service_role;

-- ============================================================================
-- Perfil de Mercado (ver PROPOSTA-PERFIL-DE-MERCADO.md)
-- ============================================================================
--
-- Ativo durável (não evento): criado no fluxo de headline a partir de 1-5
-- vagas desejadas, consumido por N ferramentas (headline hoje; CV Tailor,
-- LinkedIn Review, Cover Letter, Interview Prep no futuro). Por isso tabela
-- própria, fora de `analyses`. O "perfil ativo" do usuário é o mais recente
-- (created_at desc).
--
-- Metodologia: cargo-alvo, senioridade e mercado são IDENTIFICADOS PELA IA
-- lendo as vagas (o usuário só confirma/edita) — o único input declarado é
-- o cargo atual, opcional.
--
-- MIGRAÇÃO: se você criou a tabela na versão anterior (com current_role NOT
-- NULL e colunas de especialidades), rode:
--   alter table public.market_profiles alter column "current_role" drop not null;
--   alter table public.market_profiles drop column if exists inferred_specialties;
--   alter table public.market_profiles drop column if exists confirmed_specialties;
--   alter table public.market_profiles drop column if exists origin;

create table if not exists public.market_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Único input declarado pelo usuário (opcional). Aspas obrigatórias:
  -- CURRENT_ROLE é palavra reservada do PostgreSQL.
  "current_role" text,
  -- Identificados pela IA lendo as vagas; confirmados/editados pelo usuário
  target_role text not null,
  target_market text not null check (
    target_market in ('us_remote', 'canada', 'europe', 'latam_remote', 'other')
  ),
  seniority text not null,
  language text not null default 'en' check (language in ('en', 'pt')),
  -- Output da extração (temperature 0) — formato em lib/types.ts
  -- (MarketProfileKeywords: cada termo com count e índices das vagas)
  keywords jsonb not null,
  -- Texto das vagas (truncado a ~15k chars cada) pra auditoria/reprocesso
  -- sem re-pedir ao usuário. Descrições públicas, sem dado sensível.
  source_jobs jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_profiles_user_idx
  on public.market_profiles (user_id, created_at desc);

-- Mesmo padrão das demais tabelas: RLS habilitada sem policies, acesso
-- exclusivamente via service role em Route Handlers.
alter table public.market_profiles enable row level security;
grant select, insert, update on public.market_profiles to service_role;

-- ============================================================================
-- Plano Pro real (mentoria/beta — decisão de 24/jul/2026)
-- ============================================================================
--
-- Pro = limites maiores (30 headlines / 20 CV Tailor / 10 reviews por mês,
-- ver lib/usage.ts), com validade. `pro_grants` é a fila de concessões por
-- e-mail: funciona ANTES do cadastro (a pessoa compra a mentoria, ganha o
-- grant, e quando logar com aquele e-mail o app/auth/callback resgata) e é
-- a mesma mecânica que o webhook da Hotmart vai usar no futuro.

alter table public.profiles add column if not exists plan_expires_at timestamptz;

-- Stripe (08/ago/2026): liga o usuário ao customer do Stripe. O acesso em
-- si continua em plan/plan_expires_at — o webhook do Stripe só escreve
-- nessas colunas (invoice.paid estende; ver app/api/webhooks/stripe).
-- MIGRAÇÃO (rodar uma vez em produção):
--   alter table public.profiles add column if not exists stripe_customer_id text;
--   create index if not exists profiles_stripe_customer_idx
--     on public.profiles (stripe_customer_id);
alter table public.profiles add column if not exists stripe_customer_id text;
create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);

create table if not exists public.pro_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  days integer not null default 30 check (days > 0),
  -- 'beta' | 'mentoria' | 'hotmart' | 'manual' — de onde veio a concessão
  source text,
  -- Referência externa (transação da Hotmart) — permite achar o grant no
  -- reembolso/cancelamento (arrependimento de 7 dias do CDC) e revogá-lo.
  external_ref text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by uuid references auth.users (id) on delete set null,
  -- Grant revogado não conta: se ainda não resgatado, o resgate ignora;
  -- se já resgatado, o webhook desconta os dias do plan_expires_at.
  revoked_at timestamptz
);

create index if not exists pro_grants_email_idx on public.pro_grants (lower(email));
create index if not exists pro_grants_external_ref_idx on public.pro_grants (external_ref);

-- MIGRAÇÃO (rodar uma vez em produção — decisão de 05/ago/2026, cobrança
-- desde o início + webhook Hotmart com revogação):
--   alter table public.pro_grants add column if not exists external_ref text;
--   alter table public.pro_grants add column if not exists revoked_at timestamptz;
--   create index if not exists pro_grants_external_ref_idx
--     on public.pro_grants (external_ref);

alter table public.pro_grants enable row level security;
grant select, insert, update on public.pro_grants to service_role;

-- ----------------------------------------------------------------------------
-- COMO CONCEDER PRO (manual, até o webhook da Hotmart existir):
--
-- Opção A — por e-mail, funciona antes OU depois do cadastro (resgatado no
-- próximo login da pessoa):
--   insert into public.pro_grants (email, days, source)
--   values ('fulano@gmail.com', 30, 'beta');
--
-- Opção B — aplicar IMEDIATAMENTE a quem já tem conta (sem esperar login):
--   update public.profiles
--   set plan = 'pro', plan_expires_at = now() + interval '30 days'
--   where email = 'fulano@gmail.com';
--
-- Consultar quem tem Pro ativo:
--   select email, plan, plan_expires_at from public.profiles
--   where plan = 'pro' and (plan_expires_at is null or plan_expires_at > now());
-- ----------------------------------------------------------------------------

-- ============================================================================
-- Expansão de ferramentas (Networking, Posts — e as próximas levas)
-- ============================================================================
--
-- O CHECK original de analyses.tool_type só aceitava as 3 primeiras
-- ferramentas. Recriamos com TODOS os tool_types planejados de uma vez
-- (About, Cover Letter etc. entram sem nova migração).

alter table public.analyses drop constraint if exists analyses_tool_type_check;
alter table public.analyses add constraint analyses_tool_type_check check (
  tool_type in (
    'market_intel',
    'headline', 'cv_tailor', 'linkedin_review',
    'networking', 'post',
    'about', 'experience', 'cover_letter', 'interview_prep'
  )
);
-- MIGRAÇÃO (rodar uma vez em produção — 06/ago/2026, Market Intelligence):
-- os dois ALTERs acima já são idempotentes; basta reexecutá-los com a
-- lista nova (incluindo 'market_intel').

-- ============================================================================
-- Market Intelligence (passo 1 da jornada — claude/MVP-MARKET-INTELLIGENCE.md)
-- ============================================================================
--
-- Uma linha por relatório. Serve de STAGING durante a geração (o client
-- orquestra: start → extract em lotes → finalize) e de CACHE depois:
-- relatório 'ready' pra (role_key × region) com expires_at no futuro é
-- servido de graça pro próximo usuário. raw_jobs é limpo no finalize
-- (payload grande, já não é necessário).

create table if not exists public.market_reports (
  id uuid primary key default gen_random_uuid(),
  -- Quem iniciou a geração (histórico por usuário fica em analyses).
  created_by uuid references auth.users (id) on delete set null,
  role_key text not null,
  region text not null check (region in ('us', 'europe', 'latam', 'br')),
  status text not null default 'collecting'
    check (status in ('collecting', 'extracting', 'ready', 'failed')),
  -- Staging: vagas coletadas (SourcedJob[]) aguardando extração.
  raw_jobs jsonb,
  -- Extrações acumuladas por lote (MarketIntelJobExtraction[]).
  extractions jsonb not null default '[]'::jsonb,
  jobs_collected integer not null default 0,
  -- O MarketIntelReport final (quando status = 'ready').
  report jsonb,
  created_at timestamptz not null default now(),
  -- Cache TTL: finalize grava now() + 14 dias.
  expires_at timestamptz
);

create index if not exists market_reports_cache_idx
  on public.market_reports (role_key, region, expires_at desc)
  where status = 'ready';

alter table public.market_reports enable row level security;
grant select, insert, update, delete on public.market_reports to service_role;

-- ============================================================================
-- Dashboard vivo — Perfil Profissional do usuário (user_documents)
-- ============================================================================
--
-- Segundo ativo durável (o primeiro é market_profiles): o TEXTO extraído do
-- PDF do LinkedIn (kind 'linkedin_pdf') e/ou do CV (kind 'cv') que o usuário
-- subiu. Coletado no dashboard OU passivamente pelo uso (subiu PDF no
-- Review → vira o perfil salvo; subiu CV no CV Tailor → vira o CV salvo).
-- O ativo de cada tipo é o mais recente. Guardamos texto, não arquivo.

create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('linkedin_pdf', 'cv')),
  filename text,
  content text not null,
  chars integer not null,
  created_at timestamptz not null default now()
);

create index if not exists user_documents_user_kind_idx
  on public.user_documents (user_id, kind, created_at desc);

alter table public.user_documents enable row level security;
grant select, insert on public.user_documents to service_role;
