import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase ligado aos cookies da request atual — usado SOMENTE para
 * ler a sessão (getUser()) em Server Components e Route Handlers. Não usar
 * para ler/escrever dados de negócio: isso continua indo pelo client admin
 * em lib/supabase.ts (service role, bypassa RLS), mantendo um único padrão
 * de acesso a dados no projeto.
 */
export function getSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component sem permissão de escrever
            // cookies — inofensivo aqui porque o middleware já cuida do
            // refresh de sessão em toda request.
          }
        },
      },
    },
  );
}

/** Retorna o usuário autenticado da sessão atual, ou null. */
export async function getCurrentUser() {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
