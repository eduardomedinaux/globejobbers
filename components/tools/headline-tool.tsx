"use client";

import { useEffect, useState } from "react";
import { ScoreMiniCard } from "@/components/score-mini-card";
import { HeadlineCard } from "@/components/headline-card";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { MarketHeadlineWizard } from "@/components/market-profile/market-headline-wizard";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import type { HeadlineAnalysisResult } from "@/lib/types";

type Mode = "market" | "text";
type Step = "input" | "loading" | "result" | "limit_reached";

/**
 * Aba Headline do LinkedIn Review. Dois modos:
 *  - "market" (default): wizard da metodologia — headline construída a
 *    partir das vagas desejadas via Perfil de Mercado (ver
 *    PROPOSTA-PERFIL-DE-MERCADO.md). Substituiu o antigo "builder" de
 *    perguntas sobre si mesmo (anti-padrão da metodologia: especialidades
 *    autodeclaradas em vez de inferidas do mercado).
 *  - "text": avalia/reescreve uma headline existente (inalterado).
 */
export function HeadlineTool() {
  const [mode, setMode] = useState<Mode>("market");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<HeadlineAnalysisResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    track("headline_tool_viewed");
  }, []);

  async function handleSubmit() {
    setStep("loading");
    setError(null);
    track("headline_analysis_started", { mode: "text" });

    try {
      const res = await fetch("/api/tools/headline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "text", text }),
      });
      const data = await res.json();

      if (res.status === 403 && data.code === "LIMIT_REACHED") {
        setStep("limit_reached");
        track("limit_reached", { tool_type: "headline" });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível gerar sua headline.");
      }

      setAnalysis(data.analysis as HeadlineAnalysisResult);
      setRemaining(data.usage?.remaining ?? null);
      setStep("result");
      track("headline_score_viewed", { score: data.analysis.headlineScore, mode: "text" });
      track("headline_generated", {
        source: "tools_headline",
        score: data.analysis.headlineScore,
        mode: "text",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("input");
      track("analysis_failed", {
        source: "tools_headline",
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  function handleReset() {
    setStep("input");
    setAnalysis(null);
    setError(null);
    setText("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 rounded-xl bg-[#F4F4F0] p-1">
        <button
          type="button"
          onClick={() => setMode("market")}
          className={`flex-1 rounded-lg py-2 text-[13.5px] font-medium transition-colors ${
            mode === "market" ? "bg-white text-[#0F4D4A] shadow-sm" : "text-[#6E6E72]"
          }`}
        >
          Criar pro meu mercado-alvo
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`flex-1 rounded-lg py-2 text-[13.5px] font-medium transition-colors ${
            mode === "text" ? "bg-white text-[#0F4D4A] shadow-sm" : "text-[#6E6E72]"
          }`}
        >
          Já tenho uma headline
        </button>
      </div>

      {mode === "market" ? (
        <MarketHeadlineWizard />
      ) : (
        <>
          {(step === "input" || step === "limit_reached") && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="headline-text">Cole sua headline atual do LinkedIn</Label>
                <Textarea
                  id="headline-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ex.: Desenvolvedor Java na Acme"
                  rows={3}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                onClick={handleSubmit}
                disabled={text.trim().length === 0}
                className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
              >
                Analisar minha headline
              </Button>
            </>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-[14px] font-medium text-[#0F4D4A]">
                Reescrevendo para o mercado internacional…
              </p>
            </div>
          )}

          <UpgradeModal
            open={step === "limit_reached"}
            onClose={() => setStep("input")}
            toolType="headline"
          />

          {step === "result" && analysis && (
            <div className="flex flex-col gap-4">
              <ScoreMiniCard score={analysis.headlineScore} />
              <HeadlineCard
                original={analysis.headline.original}
                rewritten={analysis.headline.rewritten}
                revealed
              />
              {remaining !== null && (
                <p className="text-center text-[13px] text-[#8A8A85]">
                  {remaining} análise{remaining === 1 ? "" : "s"} restante{remaining === 1 ? "" : "s"} este mês
                </p>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="mx-auto text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
              >
                Analisar outra headline
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
