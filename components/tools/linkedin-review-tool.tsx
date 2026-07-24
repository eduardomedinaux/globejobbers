"use client";

import { useEffect, useRef, useState } from "react";
import { LinkedinReviewResultView } from "@/components/linkedin-review-result";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { TARGET_MARKET_LABELS, type LinkedinReviewResult, type MarketProfile } from "@/lib/types";

type Step = "input" | "loading" | "result" | "limit_reached";

/** Resumo do perfil ativo pro banner (null = não tem; undefined = carregando). */
type ActiveTarget = Pick<MarketProfile, "targetRole" | "targetMarket"> | null | undefined;

/**
 * Fluxo do review completo do perfil. Extraído da página
 * /tools/linkedin-review quando ela ganhou abas (Review completo | Headline).
 * Backend intocado: mesma rota /api/tools/linkedin-review, mesmo limite.
 */
export function LinkedinReviewTool() {
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LinkedinReviewResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTarget, setActiveTarget] = useState<ActiveTarget>(undefined);

  useEffect(() => {
    track("linkedin_review_viewed");
    // Perfil de Mercado ativo (criado na aba Headline): quando existe, o
    // review é avaliado CONTRA esse alvo — o banner comunica isso. Falha
    // aqui só silencia o banner; o servidor busca o perfil por conta própria.
    fetch("/api/market-profile")
      .then((res) => (res.ok ? res.json() : { profile: null }))
      .then((data) => {
        const profile = (data?.profile ?? null) as MarketProfile | null;
        setActiveTarget(
          profile ? { targetRole: profile.targetRole, targetMarket: profile.targetMarket } : null,
        );
      })
      .catch(() => setActiveTarget(null));
  }, []);

  async function handleSubmit() {
    setStep("loading");
    setError(null);
    track("linkedin_review_started", { mode: "pdf" });

    const formData = new FormData();
    if (file) formData.append("file", file);

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
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canSubmit = file !== null;

  return (
    <div className="flex flex-col gap-6">
      {(step === "input" || step === "limit_reached") && (
        <>
          {activeTarget && (
            <div className="rounded-xl bg-[#EAF1EF] px-4 py-3 text-[13px] leading-[1.55] text-[#0F4D4A]">
              Seu perfil será analisado contra o seu alvo:{" "}
              <strong>
                {activeTarget.targetRole} · {TARGET_MARKET_LABELS[activeTarget.targetMarket]}
              </strong>{" "}
              (Perfil de Mercado criado a partir das suas vagas na aba Headline).
            </div>
          )}
          {activeTarget === null && (
            <div className="rounded-xl border border-dashed border-[#D8D8D2] bg-[#FAFAF8] px-4 py-3 text-[13px] leading-[1.55] text-[#6E6E72]">
              Dica: crie seu <strong>Perfil de Mercado</strong> na aba Headline (cole as vagas que
              você quer conquistar) e este review passa a ser avaliado contra o seu alvo — não no
              genérico.
            </div>
          )}

          {/* PDF-only (mesma decisão do MVP público): colar o perfil inteiro
              é impraticável e gera input de qualidade imprevisível — o PDF
              nativo do LinkedIn é o perfil completo e estruturado. */}
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
