"use client";

import { useEffect, useRef, useState } from "react";
import { CvTailorResultV2View } from "@/components/cv-tailor-result-v2";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import type { CvTailorResultV2 } from "@/lib/types";

type CvInputMode = "pdf" | "text";
type Language = "en" | "pt";
type Step = "input" | "loading" | "result" | "limit_reached";

/**
 * CV Tailor v2: a job description é a fonte de verdade sobre o cargo-alvo
 * (não perguntamos mais). Três inputs: vaga, CV (PDF como opção principal)
 * e idioma. Princípio de produto: entender a vaga, comparar com a
 * experiência real e reposicionar — nunca inventar.
 */
export default function CvTailorPage() {
  const [cvMode, setCvMode] = useState<CvInputMode>("pdf");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CvTailorResultV2 | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [cvText, setCvText] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [language, setLanguage] = useState<Language>("en");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    track("cv_tailor_viewed");
  }, []);

  async function handleSubmit() {
    setStep("loading");
    setError(null);
    track("cv_tailor_started");

    const formData = new FormData();
    if (cvMode === "pdf" && cvFile) {
      formData.append("cvFile", cvFile);
    } else {
      formData.append("cvText", cvText);
    }
    formData.append("jobDescription", jobDescription);
    formData.append("language", language);

    try {
      const res = await fetch("/api/tools/cv-tailor", { method: "POST", body: formData });
      const data = await res.json();

      if (res.status === 403 && data.code === "LIMIT_REACHED") {
        setStep("limit_reached");
        track("limit_reached", { tool_type: "cv_tailor" });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível adaptar seu currículo.");
      }

      setResult(data.analysis as CvTailorResultV2);
      setRemaining(data.usage?.remaining ?? null);
      setStep("result");
      track("cv_tailor_completed", { score: data.analysis.matchBefore?.percent });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("input");
      track("cv_tailor_failed", { error: err instanceof Error ? err.message : "unknown" });
    }
  }

  function handleReset() {
    setStep("input");
    setResult(null);
    setError(null);
    setCvText("");
    setCvFile(null);
    setJobDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canSubmit =
    (cvMode === "pdf" ? cvFile !== null : cvText.trim().length > 0) &&
    jobDescription.trim().length > 0;

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161618]">CV Tailor</h1>
        <p className="mt-1 text-[14.5px] text-[#6E6E72]">
          Entendemos a vaga, comparamos com a sua experiência real e
          reposicionamos seu CV — sem inventar qualificações.
        </p>
      </div>

      {(step === "input" || step === "limit_reached") && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ct-job">Vaga que você quer conquistar</Label>
            <p className="text-[12.5px] leading-[1.5] text-[#A0A09B]">
              Cole a descrição completa da vaga. Vamos identificar automaticamente o que a empresa
              está procurando.
            </p>
            <Textarea
              id="ct-job"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Cole aqui o texto completo da vaga (título, requisitos, responsabilidades)…"
              rows={7}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Seu CV atual</Label>
              <div className="flex gap-1 rounded-lg bg-[#F4F4F0] p-1">
                <button
                  type="button"
                  onClick={() => setCvMode("pdf")}
                  className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                    cvMode === "pdf" ? "bg-white text-[#0F4D4A] shadow-sm" : "text-[#6E6E72]"
                  }`}
                >
                  Enviar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setCvMode("text")}
                  className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                    cvMode === "text" ? "bg-white text-[#0F4D4A] shadow-sm" : "text-[#6E6E72]"
                  }`}
                >
                  Colar texto
                </button>
              </div>
            </div>

            {cvMode === "pdf" ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                  className="rounded-lg border border-dashed border-[#D8D8D2] bg-[#FAFAF8] px-3 py-4 text-[13.5px] text-[#6E6E72] file:mr-3 file:rounded-md file:border-0 file:bg-[#0F4D4A] file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-white"
                />
                <p className="text-[12.5px] leading-[1.5] text-[#A0A09B]">
                  Seus arquivos são usados apenas para gerar sua análise e não são compartilhados.
                </p>
              </>
            ) : (
              <Textarea
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Cole o texto do seu CV atual"
                rows={8}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Idioma do CV adaptado</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded-lg border px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
                  language === "en"
                    ? "border-[#0F4D4A] bg-[#EAF1EF] text-[#0F4D4A]"
                    : "border-[#E2E2DC] text-[#6E6E72]"
                }`}
              >
                Inglês
              </button>
              <button
                type="button"
                onClick={() => setLanguage("pt")}
                className={`rounded-lg border px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
                  language === "pt"
                    ? "border-[#0F4D4A] bg-[#EAF1EF] text-[#0F4D4A]"
                    : "border-[#E2E2DC] text-[#6E6E72]"
                }`}
              >
                Português
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            Adaptar meu CV para esta vaga
          </Button>
        </>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-[14px] font-medium text-[#0F4D4A]">
            Analisando a vaga e comparando com seu CV…
          </p>
          <p className="text-[13px] text-[#8A8A85]">
            Identificamos o que a empresa procura, medimos seu match e adaptamos sem inventar nada.
          </p>
        </div>
      )}

      <UpgradeModal
        open={step === "limit_reached"}
        onClose={() => setStep("input")}
        toolType="cv_tailor"
      />

      {step === "result" && result && (
        <div className="flex flex-col gap-4">
          <CvTailorResultV2View result={result} />
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
            Adaptar para outra vaga
          </button>
        </div>
      )}
    </div>
  );
}
