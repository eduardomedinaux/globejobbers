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
