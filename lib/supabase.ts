import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase com a service role key — acesso total, bypassa RLS.
 * Usar SOMENTE em Route Handlers (app/api/**), nunca em Client Components.
 *
 * FUTURE: quando houver auth de usuários, criar também um client com a
 * anon key (para uso client-side com RLS) em vez de expandir o uso deste.
 */
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local (ver .env.local.example).",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
