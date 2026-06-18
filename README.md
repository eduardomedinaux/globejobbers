# GlobeJobbers — MVP de 1 semana

Ver `CLAUDE.md` para o contexto completo do produto e as regras do projeto.

## Setup

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie `.env.local.example` para `.env.local` e preencha:
   - `ANTHROPIC_API_KEY` — [console.anthropic.com](https://console.anthropic.com/settings/keys)
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` — Project Settings da sua org no Supabase
3. Rode `supabase/schema.sql` no SQL Editor do seu projeto Supabase (cria a tabela `leads`).
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
5. Abra [http://localhost:3000](http://localhost:3000).

## Estrutura

- `app/page.tsx` — página única (input do perfil → score → headline antes/depois).
- `app/api/analyze/route.ts` — recebe o perfil (texto ou PDF), chama a IA, devolve score + headline reescrita.
- `app/api/leads/route.ts` — gate de e-mail: salva `{email, raw_profile, score}` em `leads`.
- `lib/anthropic.ts` — wrapper da chamada à IA (Claude). Contém os pontos de extensão futuros (roteamento de modelo, custo, créditos).
- `lib/pdf.ts` — extração de texto de PDF no servidor (`unpdf`).
- `lib/prompts.ts` — prompt e schema usados na chamada à IA.
- `supabase/schema.sql` — schema da tabela `leads`.
