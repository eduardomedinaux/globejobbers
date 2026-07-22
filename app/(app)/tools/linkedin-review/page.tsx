"use client";

import { useEffect, useRef, useState } from "react";
import { LinkedinReviewResultView } from "@/components/linkedin-review-result";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import type { LinkedinReviewResult } from "@/lib/types";

type InputMode = "text" | "pdf";
type Step = "input" | "loading" | "result" | "limit_reached";

export default function LinkedinReviewPage() {
  const [mode, setMode] = useState<InputMode>("pdf");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LinkedinReviewResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [profileText, setProfileText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    track("linkedin_review_viewed");
  }, []);

  async function handleSubmit() {
    setStep("loading");
    setError(null);
    track("linkedin_review_started", { mode });

    const formData = new FormData();
    if (mode === "pdf" && file) {
      formData.append("file", file);
    } else {
      formData.append("profileText", profileText);
    }

    try {
      const res = await fetch("/api/tools/linkedin-review", { method: "POST", body: formData });
      const data = await res.json();

      if (res.status === 403 && data.code === "LIMIT_REACHED") {
        setStep("limit_reached");
        track("limit_reached", { tool_type: "linkedin_review" });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível analisar seu perfil.");
      }

      setResult(data.analysis as LinkedinReviewResult);
      setRemaining(data.usage?.remaining ?? null);
      setStep("result");
      track("linkedin_review_completed", { score: data.analysis.overallScore });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("input");
      track("linkedin_review_failed", { error: err instanceof Error ? err.message : "unknown" });
    }
  }

  function handleReset() {
    setStep("input");
    setResult(null);
    setError(null);
    setProfileText("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canSubmit = mode === "pdf" ? file !== null : profileText.trim().length > 0;

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161618]">
          LinkedIn Review
        </h1>
        <p className="mt-1 text-[14.5px] text-[#6E6E72]">
          Receba uma análise completa do seu perfil em 8 categorias, pra
          entender exatamente o que ajustar pro mercado internacional.
        </p>
      </div>

      {(step === "input" || step === "limit_reached") && (
        <>
          <div className="flex gap-2 rounded-xl bg-[#F4F4F0] p-1">
            <button
              type="button"
              onClick={() => setMode("pdf")}
              className={`flex-1 rounded-lg py-2 text-[13.5px] font-medium transition-colors ${
                mode === "pdf" ? "bg-white text-[#0F4D4A] shadow-sm" : "text-[#6E6E72]"
              }`}
            >
              Enviar PDF do perfil
            </button>
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`flex-1 rounded-lg py-2 text-[13.5px] font-medium transition-colors ${
                mode === "text" ? "bg-white text-[#0F4D4A] shadow-sm" : "text-[#6E6E72]"
              }`}
            >
              Colar texto do perfil
            </button>
          </div>

          {mode === "pdf" ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#1B1B1E]">
                PDF do seu perfil (LinkedIn → Mais → Salvar como PDF)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="rounded-lg border border-dashed border-[#D8D8D2] bg-[#FAFAF8] px-3 py-4 text-[13.5px] text-[#6E6E72] file:mr-3 file:rounded-md file:border-0 file:bg-[#0F4D4A] file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-white"
              />
              <p className="text-[12.5px] leading-[1.5] text-[#A0A09B]">
                Seus arquivos são usados apenas para gerar sua análise e não são compartilhados.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#1B1B1E]">
                Cole o texto completo do seu perfil
              </label>
              <Textarea
                value={profileText}
                onChange={(e) => setProfileText(e.target.value)}
                placeholder="Nome, headline, sobre, experiências…"
                rows={10}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            Analisar meu perfil
          </Button>
        </>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-[14px] font-medium text-[#0F4D4A]">
            Analisando seu perfil em 8 categorias…
          </p>
        </div>
      )}

      <UpgradeModal
        open={step === "limit_reached"}
        onClose={() => setStep("input")}
        toolType="linkedin_review"
      />

      {step === "result" && result && (
        <div className="flex flex-col gap-4">
          <LinkedinReviewResultView result={result} />
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
            Analisar outro perfil
          </button>
        </div>
      )}
    </div>
  );
}
