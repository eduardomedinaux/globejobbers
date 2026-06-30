"use client";

import { useState, useRef, useEffect } from "react";
import { ImagePlus, CheckCircle2 } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { HeadlineCard } from "@/components/headline-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { getScoreStage } from "@/lib/score-stages";
import type { HeadlineAnalysisResult } from "@/lib/types";

type Step = "input" | "loading" | "result";

const LOADING_MESSAGES = [
  "Lendo sua headline…",
  "Avaliando para recrutadores internacionais…",
  "Reescrevendo para o mercado em dólar…",
];

function useCountUp(target: number, durationMs = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let frame: number;
    function step(timestamp: number) {
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / durationMs);
      setValue(Math.round(progress * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}

function ScoreMiniCard({ score }: { score: number }) {
  const animatedScore = useCountUp(score);
  const stage = getScoreStage(score);
  return (
    <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
        <div className="flex items-baseline gap-1">
          <span className="text-[60px] font-semibold leading-[0.9] tracking-[-0.04em] tabular-nums text-[#0F4D4A]">
            {animatedScore}
          </span>
          <span className="text-xl font-medium text-[#B4B4AF]">/100</span>
        </div>
        <span className="rounded-full bg-[#EAF1EF] px-2.5 py-1 text-[13px] font-semibold text-[#0F4D4A]">
          {stage.label}
        </span>
      </div>
      <p className="mt-2 text-[13.5px] text-[#6E6E72]">Score da sua Headline</p>
      <p className="mt-1 text-[13.5px] leading-[1.5] text-[#6E6E72]">{stage.description}</p>
    </div>
  );
}

export default function HeadlinePage() {
  const [step, setStep] = useState<Step>("input");
  const [analysis, setAnalysis] = useState<HeadlineAnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== "loading") return;
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 1800);
    return () => clearInterval(id);
  }, [step]);

  // Revoga o object URL anterior para evitar memory leak
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalyzeError(null);
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setStep("loading");
    setMsgIdx(0);
    setAnalyzeError(null);

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
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!analysis || !email.trim()) return;
    setIsSubmittingLead(true);
    setLeadError(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          rawProfile: analysis.headline.original,
          score: analysis.headlineScore,
          source: "ato1",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Não foi possível salvar seu e-mail.");
      setEmailSent(true);
      track("headline_generated", { source: "ato1", score: analysis.headlineScore });
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setIsSubmittingLead(false);
    }
  }

  function handleReset() {
    setStep("input");
    setAnalysis(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setAnalyzeError(null);
    setEmail("");
    setEmailSent(false);
    setLeadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <main className="relative min-h-screen bg-background">
      <div
        className="pointer-events-none absolute left-1/2 top-[-180px] h-[480px] w-[700px] -translate-x-1/2"
        style={{
          background: "radial-gradient(ellipse at center, rgba(15,77,74,0.06), rgba(15,77,74,0) 70%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-[480px] flex-col px-5 pb-16">
        {/* Header */}
        <div className="flex justify-center pb-2 pt-8">
          <Wordmark />
        </div>

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
                <div className="flex flex-col gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Print selecionado"
                    className="w-full rounded-2xl border border-[#EAEAE4]"
                  />
                  <label
                    htmlFor="screenshot-upload"
                    className="cursor-pointer rounded-xl border border-[#EAEAE4] bg-white py-2.5 text-center text-[14px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8] active:bg-[#F4F4F0]"
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
                    <p className="mt-1 text-[13px] text-[#A0A09B]">JPEG, PNG ou WebP · máx. 5 MB</p>
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
        {step === "loading" && (
          <div className="pt-10">
            <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#0F4D4A]">
              {LOADING_MESSAGES[msgIdx]}
            </p>
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
                <Skeleton className="h-[52px] w-28 rounded-lg" />
                <Skeleton className="mt-2.5 h-3 w-32" />
                <Skeleton className="mt-1.5 h-3 w-48" />
              </div>
              <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-5 h-3 w-12" />
                <Skeleton className="mt-1.5 h-10 w-full rounded-[10px]" />
                <Skeleton className="mt-4 h-3 w-12" />
                <Skeleton className="mt-1.5 h-12 w-full rounded-[10px]" />
              </div>
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === "result" && analysis && (
          <div className="flex flex-col gap-4 pt-7">
            <ScoreMiniCard score={analysis.headlineScore} />

            <HeadlineCard
              original={analysis.headline.original}
              rewritten={analysis.headline.rewritten}
              revealed
            />

            {/* Email capture — aparece após o resultado, sem gate */}
            <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
              {emailSent ? (
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <CheckCircle2 className="h-8 w-8 text-[#0F4D4A]" />
                  <p className="text-[15px] font-semibold text-[#1B1B1E]">Tudo certo!</p>
                  <p className="text-[13.5px] leading-[1.5] text-[#6E6E72]">
                    Você receberá estratégias para destravar sua carreira internacional.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
                  <p className="text-[15px] font-semibold text-[#1B1B1E]">
                    Quer ir além da headline?
                  </p>
                  <p className="text-[13.5px] leading-[1.5] text-[#6E6E72]">
                    Receba estratégias semanais para conseguir vagas remotas em dólar — de graça.
                  </p>
                  <Input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmittingLead}
                    className="h-10 border-[#E2EAE8] bg-[#FAFAF8] text-sm"
                  />
                  {leadError && <p className="text-xs text-destructive">{leadError}</p>}
                  <Button
                    type="submit"
                    disabled={isSubmittingLead}
                    className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
                  >
                    {isSubmittingLead ? "Enviando…" : "Quero receber"}
                  </Button>
                  <p className="text-center text-[11.5px] text-[#A0A09B]">
                    Sem spam. Cancele quando quiser.
                  </p>
                </form>
              )}
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="mb-4 mt-2 text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
            >
              Analisar outro print
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
