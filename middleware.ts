import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh do cookie de sessão do Supabase em toda request. Sem isso, o
 * access token expira e Server Components/Route Handlers passam a ver uma
 * sessão inválida mesmo com o usuário "logado" no browser. A proteção de
 * rotas em si (redirect para /login) fica no layout de app/(app) — este
 * middleware só mantém a sessão viva.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Força a leitura do usuário: é isso que efetivamente dispara o refresh
  // do token quando necessário (só ler o cookie não basta).
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Roda em tudo exceto assets estáticos e arquivos internos do Next —
     * refresh de sessão não precisa (nem deve) rodar nesses casos.
     */
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)",
  ],
};
