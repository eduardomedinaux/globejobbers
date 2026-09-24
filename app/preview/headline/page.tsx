"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ImagePlus, Loader2 } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { EmailGate } from "@/components/email-gate";
import { HeadlineCard } from "@/components/headline-card";
import { HeadlineValueProp } from "@/components/headline-value-prop";
import { ScoreMiniCard } from "@/components/score-mini-card";
import { Skeleton } from "@/components/ui/skeleton";
import { track } from "@/lib/analytics";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import type { HeadlineAnalysisResult } from "@/lib/types";

type Step = "intro" | "input" | "loading" | "result";

// Loader com progresso (24/set, mesmo padrão do full-scan): etapas ganham
// check com o tempo; a barra desacelera e nunca chega em 100% sozinha.
const LOADING_STEPS = [
  { at: 0, label: "Lendo seu print" },
  { at: 2500, label: "Avaliando pra recrutadores internacionais" },
  { at: 6000, label: "Reescrevendo pro mercado em dólar" },
];

function HeadlineLoader() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 200);
    return () => clearInterval(timer);
  }, []);
  const pct = Math.min(92, Math.round(100 * (1 - Math.exp(-elapsed / 5000))));
  const currentIndex = LOADING_STEPS.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);

  return (
    <div className="pt-10">
      <div className="rounded-2xl border border-[#E2EAE8] bg-white p-5 shadow-[0_1px_2px_rgba(20,20,20,0.03),0_16px_40px_rgba(15,77,74,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-[#0F4D4A]">Analisando sua headline</p>
          <span className="text-[13px] font-semibold tabular-nums text-[#0F4D4A]">{pct}%</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#EFEFE9]">
          <div
            className="h-full rounded-full bg-[#0F4D4A] transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ul className="mt-4 flex flex-col gap-2.5">
          {LOADING_STEPS.map((s, i) => {
            const done = i < currentIndex;
            const current = i === currentIndex;
            return (
              <li key={s.label} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    done && "bg-[#0F4D4A]",
                    current && "text-[#0F4D4A]",
                    !done && !current && "border border-[#E2E2DC]",
                  )}
                >
                  {done ? (
                    <Check className="h-3 w-3 text-white" aria-hidden />
                  ) : current ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-[13.5px] leading-[1.4]",
                    done && "text-[#8A8A85]",
                    current && "font-medium text-[#1B1B1E]",
                    !done && !current && "text-[#B6B6B1]",
                  )}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-4 rounded-2xl border border-[#EAEAE4] bg-white p-6 opacity-70 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
        <Skeleton className="h-[52px] w-28 rounded-lg" />
        <Skeleton className="mt-2.5 h-3 w-32" />
        <Skeleton className="mt-1.5 h-3 w-48" />
      </div>
    </div>
  );
}

export default function HeadlinePage() {
  const [step, setStep] = useState<Step>("input");
  const isMobile = useIsMobile();
  const isMobileInitialized = useRef(false);

  const [analysis, setAnalysis] = useState<HeadlineAnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Gate de e-mail (decisão 24/set): a reescrita fica borrada até o e-mail,
  // igual ao funil de desktop — captura no pico de curiosidade.
  const [revealed, setRevealed] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set initial step once viewport is known — mobile enters "intro", desktop stays "input"
  useEffect(() => {
    if (isMobile === null || isMobileInitialized.current) return;
    isMobileInitialized.current = true;
    if (isMobile) setStep("intro");
  }, [isMobile]);

  // Revoga o object URL anterior para evitar memory leak
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function acceptFile(file: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalyzeError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    acceptFile(file);
  }

  // Colar o print (Cmd/Ctrl+V) — atalho de DESKTOP (24/set): no celular o
  // gesto principal continua sendo a galeria (o screenshot é a 1ª foto).
  useEffect(() => {
    if (step !== "input") return;
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            acceptFile(file);
            track("headline_print_pasted", {});
          }
          return;
        }
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, previewUrl]);

  async function handleAnalyze() {
    if (!selectedFile) return;
    setStep("loading");
    setAnalyzeError(null);
    track("analysis_clicked", { source: "ato1" });

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/analyze-headline", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Não foi possível analisar.");
      const result = data.analysis as HeadlineAnalysisResult;
      setAnalysis(result);
      setStep("result");
      track("score_viewed", { source: "ato1", score: result.headlineScore });
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("input");
      track("analysis_failed", {
        source: "ato1",
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  async function handleEmailSubmit(email: string) {
    if (!analysis) return;
    setIsSubmittingLead(true);
    setLeadError(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          rawProfile: analysis.headline.original,
          score: analysis.headlineScore,
          source: "ato1",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Não foi possível salvar seu e-mail.");
      setRevealed(true);
      track("headline_generated", { source: "ato1", score: analysis.headlineScore });
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setIsSubmittingLead(false);
    }
  }

  function handleStartFromIntro() {
    track("analysis_started", { source: "ato1", device: "mobile" });
    setStep("input");
  }

  function handleReset() {
    setStep("input");
    setAnalysis(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setAnalyzeError(null);
    setRevealed(false);
    setLeadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    // overflow-x-hidden: o brilho decorativo tem 700px — sem o clip ele
    // cria rolagem horizontal em telas estreitas (bug visto na emulação).
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        className="pointer-events-none absolute left-1/2 top-[-180px] h-[480px] w-[700px] -translate-x-1/2"
        style={{
          background: "radial-gradient(ellipse at center, rgba(15,77,74,0.06), rgba(15,77,74,0) 70%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-[480px] flex-col px-5 pb-16">
        {/* Header — hidden on intro so HeadlineValueProp owns the Wordmark */}
        {step !== "intro" && (
          <div className="flex justify-center pb-2 pt-8">
            <Wordmark />
          </div>
        )}

        {/* ── HYDRATION GUARD: skeleton until viewport is known ── */}
        {isMobile === null ? (
          <div className="flex flex-col gap-4 pt-10">
            <Skeleton className="mx-auto h-7 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="mt-2 h-48 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* ── INTRO (mobile only) ── */}
            {step === "intro" && (
              <HeadlineValueProp onStart={handleStartFromIntro} />
            )}

        {/* ── INPUT ── */}
        {step === "input" && (
          <>
            <div className="pt-7 text-center">
              <h1 className="text-balance text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#161618]">
                Sua headline está pronta para vagas em dólar?
              </h1>
              <p className="mt-4 text-[15px] leading-[1.55] text-[#5C5C60]">
                Envie um print da sua headline no LinkedIn e receba uma avaliação + reescrita
                profissional grátis.
              </p>
            </div>

            <div className="mt-5 flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/linkedin-sample-mobile.png"
                alt="Exemplo de print da headline no LinkedIn"
                className="w-full rounded-2xl border border-[#EAEAE4] shadow-[0_1px_2px_rgba(20,20,20,0.03)]"
              />
              <p className="text-[12.5px] text-[#6E6E72]">
                Mostre pelo menos esta parte do seu perfil
              </p>
            </div>

            <div className="mt-7">
              <input
                ref={fileInputRef}
                id="screenshot-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="sr-only"
              />

              {previewUrl ? (
                /* Preview CROPADO (24/set): só o topo do print (nome +
                   headline) numa janela fixa; "Trocar imagem" flutua sobre
                   o print pra não empurrar o CTA. A análise usa a imagem
                   completa. */
                <div className="relative max-h-[280px] overflow-hidden rounded-2xl border border-[#EAEAE4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Print selecionado"
                    className="w-full object-cover object-top"
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
                    style={{
                      background: "linear-gradient(to bottom, rgba(250,250,248,0), rgba(250,250,248,0.95))",
                    }}
                    aria-hidden
                  />
                  <label
                    htmlFor="screenshot-upload"
                    className="absolute right-2.5 top-2.5 cursor-pointer rounded-full border border-[#EAEAE4] bg-white/95 px-3.5 py-1.5 text-[13px] font-medium text-[#3F3F43] shadow-[0_2px_8px_rgba(20,20,20,0.12)] backdrop-blur transition-colors hover:bg-white active:bg-[#F4F4F0]"
                  >
                    Trocar imagem
                  </label>
                </div>
              ) : (
                <label
                  htmlFor="screenshot-upload"
                  className="flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-[#D8D8D2] bg-[#FAFAF8] px-6 py-10 text-center transition-colors hover:bg-[#F4F4F0] active:bg-[#EFEFEB]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF1EF]">
                    <ImagePlus className="h-6 w-6 text-[#0F4D4A]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#1B1B1E]">
                      Enviar print da headline
                    </p>
                    <p className="mt-1 text-[13px] text-[#A0A09B]">
                      JPEG, PNG ou WebP · máx. 5 MB · no computador, dá pra colar (Ctrl+V)
                    </p>
                  </div>
                </label>
              )}

              {analyzeError && <p className="mt-3 text-sm text-destructive">{analyzeError}</p>}

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!selectedFile}
                className="mt-4 w-full rounded-xl bg-[#0F4D4A] py-3.5 text-[15px] font-semibold text-[#FBFEFD] transition-colors hover:bg-[#0B3F3C] disabled:cursor-not-allowed disabled:opacity-40 active:bg-[#0B3F3C]"
              >
                Analisar minha headline
              </button>
            </div>

            <p className="mt-5 text-center text-[12.5px] leading-[1.5] text-[#A0A09B]">
              No LinkedIn app: vá ao seu perfil e tire um print com seu nome e headline visíveis.
            </p>
          </>
        )}

        {/* ── LOADING ── */}
        {step === "loading" && <HeadlineLoader />}

        {/* ── RESULT ── */}
        {step === "result" && analysis && (
          <div className="flex flex-col gap-4 pt-7">
            <ScoreMiniCard score={analysis.headlineScore} label="Score da sua headline" />

            {/* Gate (24/set): a reescrita abre com o e-mail — mesmo padrão
                do funil de desktop. Sem autofocus: o teclado abrindo sozinho
                esconderia o score no celular. */}
            <HeadlineCard
              original={analysis.headline.original}
              rewritten={analysis.headline.rewritten}
              revealed={revealed}
            >
              <EmailGate
                onSubmit={handleEmailSubmit}
                isSubmitting={isSubmittingLead}
                error={leadError}
                autoFocusInput={false}
              />
            </HeadlineCard>

            {/* Ato 3 — só depois do reveal: a headline foi a amostra; o
                chamado fecha a história com o produto completo. */}
            {revealed && (
              <div className="overflow-hidden rounded-2xl bg-[#0F4D4A] p-6 text-white shadow-[0_18px_48px_rgba(15,77,74,0.28)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9DC3BE]">
                  O próximo passo
                </p>
                <h2 className="mt-2 text-balance text-[21px] font-semibold leading-[1.25] tracking-[-0.02em]">
                  Sua headline é 1 das 8 categorias do seu perfil.
                </h2>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-[#CFE0DD]">
                  O GlobeJobbers completo transforma o perfil inteiro em
                  instruções &ldquo;faça isso&rdquo; — mapeadas nas vagas que
                  VOCÊ quer:
                </p>
                <ol className="mt-4 flex flex-col gap-2.5">
                  {[
                    "Cole as vagas que você quer — elas viram seu alvo",
                    "Receba o mapa: LinkedIn em 8 categorias, skills e CV",
                    "Treine a entrevista FALANDO inglês, feedback em português",
                  ].map((item, i) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/12 text-[11.5px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-[13.5px] leading-[1.5] text-[#EAF1EF]">{item}</span>
                    </li>
                  ))}
                </ol>
                <a
                  href="/login"
                  onClick={() => track("preview_full_cta_clicked", { source: "ato1" })}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3 text-[15px] font-semibold text-[#0F4D4A] transition-colors hover:bg-[#EAF1EF]"
                >
                  Começar grátis no GlobeJobbers
                </a>
                <p className="mt-2 text-center text-[12px] text-[#9DC3BE]">
                  Entre com o Google · 1 uso grátis de cada ferramenta · sem cartão
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="mb-4 mt-2 text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
            >
              Analisar outro print
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </main>
  );
}