"use client";

import { useState } from "react";
import { PdfUploadCard } from "@/components/pdf-upload-card";
import { AnalysisSkeleton } from "@/components/analysis-skeleton";
import { ScoreCard } from "@/components/score-card";
import { HeadlineCard } from "@/components/headline-card";
import { ResultsGrid } from "@/components/results-grid";
import { KeywordHighlights } from "@/components/keyword-highlights";
import { EmailGate } from "@/components/email-gate";
import { Wordmark } from "@/components/wordmark";
import { track } from "@/lib/analytics";
import type { AnalysisResult } from "@/lib/types";

type Step = "input" | "loading" | "result";

// Valores estáticos da banda "Exemplo do que você recebe" (ver handoff de
// design). Em produção o resultado real usa os mesmos componentes ScoreCard
// / HeadlineCard, só troca a fonte dos dados.
const EXAMPLE_SCORE = 82;
const EXAMPLE_SUBSCORES = {
  headline: 74,
  english: 88,
  recruiterReadiness: 65,
  keywords: 80,
  impactClarity: 79,
};
const EXAMPLE_HEADLINE = {
  original: "Desenvolvedor Java na Acme",
  rewritten: "Senior Backend Engineer · Java & Kotlin · Remote-first, USD-ready",
};

export default function Home() {
  const [step, setStep] = useState<Step>("input");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [profileText, setProfileText] = useState("");
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [revealed, setRevealed] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  async function handleAnalyze(formData: FormData) {
    setStep("loading");
    setAnalyzeError(null);

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível analisar o perfil.");
      }

      setAnalysis(data.analysis as AnalysisResult);
      setProfileText(data.profileText as string);
      setRevealed(false);
      setLeadError(null);
      setStep("result");
      track("score_viewed", { score: data.analysis.score });
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("input");
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
        body: JSON.stringify({ email, rawProfile: profileText, score: analysis.score }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível salvar seu e-mail.");
      }

      setRevealed(true);
      track("headline_generated", { score: analysis.score });
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setIsSubmittingLead(false);
    }
  }

  function handleReset() {
    setStep("input");
    setAnalysis(null);
    setProfileText("");
    setRevealed(false);
    setAnalyzeError(null);
    setLeadError(null);
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        className="pointer-events-none absolute left-1/2 top-[-220px] h-[560px] w-[900px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15,77,74,0.06), rgba(15,77,74,0) 70%)",
        }}
        aria-hidden
      />

      <div className="relative flex flex-col">
        <div className="px-10 pb-1.5 pt-[34px] text-center">
          <Wordmark />
        </div>

        <div className="mx-auto max-w-[720px] px-4 pb-6 pt-8 text-center sm:px-10 sm:pb-6 sm:pt-12">
          <h1 className="text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#161618] sm:text-[44px] md:text-[52px]">
            Seu LinkedIn está pronto para ganhar em dólar?
          </h1>
          <p className="text-pretty mx-auto mt-[22px] max-w-[600px] text-base leading-[1.55] text-[#5C5C60] sm:text-[19px]">
            Receba seu Score Internacional grátis — uma análise completa do seu perfil — e veja
            sua headline reescrita para recrutadores de fora.
          </p>
        </div>

        {step !== "result" && (
          <PdfUploadCard
            onSubmit={handleAnalyze}
            isLoading={step === "loading"}
            error={analyzeError}
          />
        )}

        {step === "input" && (
          <ResultsGrid
            eyebrow="Exemplo do que você recebe"
            scoreCard={<ScoreCard score={EXAMPLE_SCORE} subscores={EXAMPLE_SUBSCORES} />}
            headlineCard={
              <HeadlineCard
                original={EXAMPLE_HEADLINE.original}
                rewritten={EXAMPLE_HEADLINE.rewritten}
                revealed
                deltaLabel="+34 alcance"
              />
            }
          />
        )}

        {step === "loading" && <AnalysisSkeleton />}

        {step === "result" && analysis && (
          <div className="flex flex-col gap-6">
            <ResultsGrid
              eyebrow="Seu resultado"
              scoreCard={<ScoreCard score={analysis.score} subscores={analysis.subscores} />}
              headlineCard={
                <HeadlineCard
                  original={analysis.headline.original}
                  rewritten={analysis.headline.rewritten}
                  revealed={revealed}
                >
                  <EmailGate
                    onSubmit={handleEmailSubmit}
                    isSubmitting={isSubmittingLead}
                    error={leadError}
                  />
                </HeadlineCard>
              }
            />

            <div className="mx-auto w-full max-w-[880px] px-4 sm:px-10">
              <KeywordHighlights items={analysis.keywordHighlights} />
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="mx-auto mb-12 text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
            >
              Analisar outro perfil
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
