import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { captureServerEvent } from "@/lib/posthog-server";

// Numa primeira conta, created_at e updated_at ficam a poucos ms de
// distância (o upsert seta updated_at "agora" e created_at pega o default
// da coluna, também "agora"). Num login de retorno, created_at continua o
// valor original enquanto updated_at avança — a diferença cresce bem além
// desta janela.
const NEW_USER_THRESHOLD_MS = 5000;

/**
 * Troca o code do OAuth (Google) por uma sessão, garante o profile do
 * usuário (upsert) e redireciona pro destino original. O upsert acontece
 * aqui em vez de via trigger no Postgres — mantém a lógica em código da
 * aplicação em vez de espalhar por triggers no banco (ver CLAUDE.md:
 * preferir soluções simples/legíveis).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[/auth/callback] exchangeCodeForSession failed", error);
    return NextResponse.redirect(`${origin}/login`);
  }

  const { user } = data;
  const admin = getSupabaseAdmin();
  const { data: profile, error: upsertError } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? "",
        name: (user.user_metadata?.full_name as string | undefined) ?? null,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("created_at, updated_at")
    .single();

  if (upsertError) {
    // Não bloqueia o login por erro no profile — loga pra investigar depois,
    // mesmo padrão de tolerância a falha usado em /api/leads.
    console.error("PROFILE_UPSERT_FAILED", { userId: user.id, upsertError });
  } else if (profile) {
    const isNewUser =
      Math.abs(new Date(profile.created_at).getTime() - new Date(profile.updated_at).getTime()) <
      NEW_USER_THRESHOLD_MS;
    if (isNewUser) {
      await captureServerEvent(user.id, "signup_completed", { provider: "google" });
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
