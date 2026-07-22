import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase com a anon key — respeita RLS, seguro para uso em Client
 * Components. Usado SOMENTE para autenticação (login/logout, ler sessão no
 * client). Toda leitura/escrita de dados continua indo pelo client admin em
 * lib/supabase.ts (service role, servidor).
 */
export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
