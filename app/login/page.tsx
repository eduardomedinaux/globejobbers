"use client";

import { useEffect, useState } from "react";
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

// Painel ilustrado (referência: split layout estilo Cofounder/Mobbin) com a
// proposta de valor em rotação. SÓ features que existem — nada de promessa.
const SLIDES: { title: string; body: string }[] = [
  {
    title: "Entenda o mercado antes de se otimizar pra ele",
    body: "O Market Intelligence lê centenas de vagas reais do cargo que você quer e te entrega nomenclaturas, skills e ferramentas — com percentuais calculados, não opinião.",
  },
  {
    title: "Seu perfil, medido contra o SEU alvo",
    body: "Suba o PDF do LinkedIn e receba um raio-X honesto do seu perfil — e cada ferramenta passa a trabalhar apontada pras vagas que você quer conquistar.",
  },
  {
    title: "Um currículo por vaga, sem inventar nada",
    body: "O CV Tailor adapta seu currículo pra cada vaga com match auditável, uma página e PDF pronto — reposicionando o que você já tem, nunca criando o que você não tem.",
  },
];

const SLIDE_INTERVAL_MS = 6000;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

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

  const current = SLIDES[slide];

  return (
    <main className="flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Painel ilustrado — imagem em public/login-hero.jpg; sem ela, o
          gradiente teal segura o visual sozinho (backgroundColor + overlay). */}
      <section
        className="relative m-3 flex min-h-[200px] flex-col justify-end overflow-hidden rounded-3xl p-6 sm:min-h-[240px] sm:p-8 lg:m-4 lg:min-h-[calc(100vh-2rem)] lg:w-[52%] lg:p-10"
        style={{
          backgroundColor: "#0F4D4A",
          backgroundImage:
            "linear-gradient(180deg, rgba(9,48,46,0.15) 0%, rgba(9,48,46,0.72) 100%), url('/login-hero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-label="Sobre o GlobeJobbers"
      >
        <div className="max-w-[460px]">
          <h2 className="text-[20px] font-semibold leading-[1.25] tracking-[-0.01em] text-white sm:text-[24px] lg:text-[28px]">
            {current.title}
          </h2>
          <p className="mt-2 hidden text-[13.5px] leading-[1.65] text-white/85 sm:block lg:text-[14.5px]">
            {current.body}
          </p>
        </div>
        <div className="mt-5 flex gap-2" role="tablist" aria-label="Destaques">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === slide}
              aria-label={`Destaque ${i + 1}`}
              onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === slide ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Autenticação */}
      <section className="flex flex-1 items-center justify-center px-4 py-10 lg:py-0">
        <div className="flex w-full max-w-[380px] flex-col items-center gap-8">
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
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E2E2DC] bg-white py-3 text-[15px] font-medium text-[#1B1B1E] shadow-[0_1px_2px_rgba(20,20,20,0.03)] transition-colors hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:opacity-50"
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

          <p className="text-center text-[12px] leading-[1.5] text-[#A0A09B]">
            Comprou a mentoria Carreira em Dólar? Entre com o Google do{" "}
            <strong className="font-semibold text-[#6E6E72]">mesmo e-mail da compra</strong> — seu
            acesso Pro ativa sozinho.
          </p>
        </div>
      </section>
    </main>
  );
}
