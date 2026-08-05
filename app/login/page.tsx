"use client";

import { useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setIsLoading(true);
    setError(null);
    track("signup_started", { provider: "google" });

    // Lido do window (em vez de useSearchParams) pra não exigir Suspense
    // boundary nesta page — só é acessado no clique, não no render inicial.
    const next = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
    const supabase = getSupabaseBrowser();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        // Sempre mostrar o seletor de contas do Google. Sem isso, o Google
        // reaproveita a última sessão e loga direto com a mesma conta —
        // impossível trocar de conta (ex.: testar o paywall com outro
        // e-mail, ou entrar com o e-mail da compra da mentoria).
        queryParams: { prompt: "select_account" },
      },
    });

    if (oauthError) {
      setError("Não foi possível iniciar o login. Tente novamente.");
      setIsLoading(false);
    }
    // Em caso de sucesso o browser é redirecionado pelo Supabase — não há
    // mais nada a fazer aqui.
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div
        className="pointer-events-none absolute left-1/2 top-[-180px] h-[480px] w-[700px] -translate-x-1/2"
        style={{
          background: "radial-gradient(ellipse at center, rgba(15,77,74,0.06), rgba(15,77,74,0) 70%)",
        }}
        aria-hidden
      />

      <div className="relative flex w-full max-w-[380px] flex-col items-center gap-8 rounded-2xl border border-[#EAEAE4] bg-white p-8 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
        <Wordmark />

        <div className="text-center">
          <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#161618]">
            Entre na sua conta
          </h1>
          <p className="mt-2 text-[14px] leading-[1.5] text-[#6E6E72]">
            Acesse suas ferramentas e acompanhe sua evolução rumo a vagas
            internacionais.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E2E2DC] bg-white py-3 text-[15px] font-medium text-[#1B1B1E] transition-colors hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GoogleIcon />
          {isLoading ? "Redirecionando…" : "Continue with Google"}
        </button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <p className="text-center text-[12px] leading-[1.5] text-[#A0A09B]">
          Ao continuar, você concorda que usamos seus dados profissionais
          apenas para gerar suas análises — nunca compartilhamos seus
          arquivos.
        </p>
      </div>
    </main>
  );
}
