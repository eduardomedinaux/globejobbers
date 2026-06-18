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
  created_at timestamptz not null default now()
);

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

-- FUTURE: quando houver auth/contas, adicionar coluna user_id (fk para
-- auth.users) e policies de leitura por usuário. FUTURE: tabela `generations`
-- para registrar cost_usd por chamada de IA (ver lib/anthropic.ts).
