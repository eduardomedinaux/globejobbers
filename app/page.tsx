"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProfileInput } from "@/components/profile-input";
import { AnalysisSkeleton } from "@/components/analysis-skeleton";
import { ScorePanel } from "@/components/score-panel";
import { KeywordHighlights } from "@/components/keyword-highlights";
import { HeadlineBeforeAfter } from "@/components/headline-before-after";
import { EmailGate } from "@/components/email-gate";
import { track } from "@/lib/analytics";
import type { AnalysisResult } from "@/lib/types";

type Step = "input" | "loading" | "result";

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
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-medium text-primary">GlobeJobbers</span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Seu perfil está pronto para uma vaga remota em dólar?
        </h1>
        <p className="text-balance text-sm text-muted-foreground sm:text-base">
          Cole o texto do seu perfil de LinkedIn ou envie um PDF. Em menos de 1 minuto você recebe
          seu Score Internacional e vê como sua headline ficaria para recrutadores internacionais.
        </p>
      </header>

      {step === "input" && (
        <ProfileInput onSubmit={handleAnalyze} isLoading={false} error={analyzeError} />
      )}

      {step === "loading" && <AnalysisSkeleton />}

      {step === "result" && analysis && (
        <div className="flex flex-col gap-6">
          <ScorePanel score={analysis.score} subscores={analysis.subscores} />

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">Sua headline reescrita</h2>
            <KeywordHighlights items={analysis.keywordHighlights} />
            <HeadlineBeforeAfter
              original={analysis.headline.original}
              rewritten={analysis.headline.rewritten}
              revealed={revealed}
            >
              <EmailGate onSubmit={handleEmailSubmit} isSubmitting={isSubmittingLead} error={leadError} />
            </HeadlineBeforeAfter>
          </div>

          <Button variant="ghost" className="self-start text-muted-foreground" onClick={handleReset}>
            Analisar outro perfil
          </Button>
        </div>
      )}
    </main>
  );
}
