"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, FileUp, Loader2, X } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { EmailGate } from "@/components/email-gate";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type {
  CvMatchBreakdown,
  CvPreviewDiagnosis,
  CvPreviewSample,
  CvRequirement,
} from "@/lib/types";

type Step = "input" | "loading" | "result";
type CvInputMode = "pdf" | "text";

// Loader com progresso (mesmo padrão do /preview/headline e full-scan):
// etapas ganham check com o tempo; a barra desacelera e nunca fecha sozinha.
const LOADING_STEPS = [
  { at: 0, label: "Lendo a vaga" },
  { at: 3000, label: "Comparando com seu CV, requisito por requisito" },
  { at: 8000, label: "Calculando seu match" },
];

function PreviewLoader() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 200);
    return () => clearInterval(timer);
  }, []);
  const pct = Math.min(92, Math.round(100 * (1 - Math.exp(-elapsed / 7000))));
  const currentIndex = LOADING_STEPS.reduce((acc, s, i) => (elapsed >= s.at ? i : acc), 0);

  return (
    <div className="pt-10">
      <div className="rounded-2xl border border-[#E2EAE8] bg-white p-5 shadow-[0_1px_2px_rgba(20,20,20,0.03),0_16px_40px_rgba(15,77,74,0.08)]">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-[#0F4D4A]">Medindo seu match com a vaga</p>
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
    </div>
  );
}

function breakdownLabel(b: CvMatchBreakdown): string {
  return `${b.strong} bem representado${b.strong === 1 ? "" : "s"} · ${b.weak} parcialmente representado${b.weak === 1 ? "" : "s"} · ${b.missing} não encontrado${b.missing === 1 ? "" : "s"}`;
}

function RequirementPills({
  items,
  tone,
}: {
  items: CvRequirement[];
  tone: "strong" | "weak" | "missing";
}) {
  const styles = {
    strong: { pill: "bg-[#EAF1EF] text-[#0F4D4A]", Icon: Check },
    weak: { pill: "bg-[#FBF6E9] text-[#7A6428]", Icon: AlertTriangle },
    missing: { pill: "bg-[#F4F4F0] text-[#6E6E72]", Icon: X },
  }[tone];
  const { Icon } = styles;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((req) => (
        <span
          key={req.term}
          title={req.evidence ? `Evidência no seu CV: "${req.evidence}"` : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold",
            styles.pill,
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {req.term}
          {req.weight === "must" && (
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
              obrigatório
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/**
 * Funil público da demo do CV Tailor (25/set): vaga (link ou texto) + CV
 * (PDF ou texto) → diagnóstico VISÍVEL (match auditável + requisitos
 * ✓/⚠/✕) → gate de e-mail → amostra da adaptação (summary + 3 bullets,
 * gerada só pós-gate — economia de sonnet) → CTA-história pro produto.
 */
export default function CvTailorPreviewPage() {
  const [step, setStep] = useState<Step>("input");

  const [jobText, setJobText] = useState("");
  const [jobImportedChars, setJobImportedChars] = useState<number | null>(null);
  const [isImportingJob, setIsImportingJob] = useState(false);

  const [cvMode, setCvMode] = useState<CvInputMode>("pdf");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvPastedText, setCvPastedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputError, setInputError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<CvPreviewDiagnosis | null>(null);

  // Gate: o e-mail libera a amostra — que só é GERADA depois dele.
  const [revealed, setRevealed] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [sample, setSample] = useState<CvPreviewSample | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  useEffect(() => {
    track("preview_cv_viewed");
  }, []);

  // Mágica do link (nada de fazer o usuário pensar): se o que foi colado no
  // campo da vaga é SÓ uma URL, importamos o texto automaticamente.
  async function maybeImportJobUrl(value: string) {
    const trimmed = value.trim();
    if (!/^https?:\/\/\S+$/.test(trimmed) || trimmed.includes("\n")) return;
    setIsImportingJob(true);
    setInputError(null);
    try {
      const res = await fetch("/api/preview/job-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Não foi possível ler o link.");
      setJobText(data.text as string);
      setJobImportedChars(data.chars as number);
      track("preview_cv_job_imported", { chars: data.chars });
    } catch (err) {
      setInputError(err instanceof Error ? err.message : "Não foi possível ler o link.");
    } finally {
      setIsImportingJob(false);
    }
  }

  function handleJobTextChange(value: string) {
    setJobText(value);
    setJobImportedChars(null);
    void maybeImportJobUrl(value);
  }

  async function handleAnalyze() {
    setStep("loading");
    setInputError(null);
    track("preview_cv_started", { cv_mode: cvMode });

    const formData = new FormData();
    if (cvMode === "pdf" && cvFile) {
      formData.append("cvFile", cvFile);
    } else {
      formData.append("cvText", cvPastedText);
    }
    formData.append("jobDescription", jobText);

    try {
      const res = await fetch("/api/preview/cv-tailor", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Não foi possível analisar.");
      const result = data.diagnosis as CvPreviewDiagnosis;
      setDiagnosis(result);
      setStep("result");
      track("preview_cv_diagnosed", { score: result.match.percent });
    } catch (err) {
      setInputError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("input");
      track("preview_cv_failed", {
        stage: "diagnosis",
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  async function fetchSample(diag: CvPreviewDiagnosis) {
    setIsLoadingSample(true);
    setSampleError(null);
    try {
      const res = await fetch("/api/preview/cv-tailor/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvText: diag.cvText,
          job: diag.job,
          requirements: diag.requirements,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Não foi possível gerar a amostra.");
      setSample(data.sample as CvPreviewSample);
      track("preview_cv_sample_revealed", { score: diag.match.percent });
    } catch (err) {
      setSampleError(err instanceof Error ? err.message : "Erro inesperado.");
      track("preview_cv_failed", {
        stage: "sample",
        error: err instanceof Error ? err.message : "unknown",
      });
    } finally {
      setIsLoadingSample(false);
    }
  }

  async function handleEmailSubmit(email: string) {
    if (!diagnosis) return;
    setIsSubmittingLead(true);
    setLeadError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          rawProfile: diagnosis.cvText,
          score: diagnosis.match.percent,
          source: "cv",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Não foi possível salvar seu e-mail.");
      setRevealed(true);
      void fetchSample(diagnosis);
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setIsSubmittingLead(false);
    }
  }

  function handleReset() {
    setStep("input");
    setDiagnosis(null);
    setJobText("");
    setJobImportedChars(null);
    setCvFile(null);
    setCvPastedText("");
    setInputError(null);
    setRevealed(false);
    setLeadError(null);
    setSample(null);
    setSampleError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const hasJob = jobText.trim().length > 0;
  const hasCv = cvMode === "pdf" ? cvFile !== null : cvPastedText.trim().length > 0;
  const canSubmit = hasJob && hasCv && !isImportingJob;

  // Botão desabilitado NUNCA fica mudo (regra da casa: nada de fazer o
  // usuário pensar) — a linha abaixo diz exatamente o que falta.
  const submitHint = isImportingJob
    ? "Lendo a vaga do link…"
    : !hasJob && !hasCv
      ? "Falta a vaga e o seu CV (os dois campos acima)."
      : !hasJob
        ? "Falta a vaga — cole o link ou o texto acima."
        : !hasCv
          ? "Falta seu CV — envie o PDF ou toque em “Colar texto”."
          : null;

  const strong = diagnosis?.requirements.filter((r) => r.status === "strong") ?? [];
  const weak = diagnosis?.requirements.filter((r) => r.status === "weak") ?? [];
  const missing = diagnosis?.requirements.filter((r) => r.status === "missing") ?? [];
  const improved =
    sample && diagnosis ? sample.matchAfter.percent > diagnosis.match.percent : false;

  return (
    // overflow-x-hidden: o brilho decorativo tem 700px — sem o clip ele
    // cria rolagem horizontal em telas estreitas (mesmo fix do /preview/headline).
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        className="pointer-events-none absolute left-1/2 top-[-180px] h-[480px] w-[700px] -translate-x-1/2"
        style={{
          background: "radial-gradient(ellipse at center, rgba(15,77,74,0.06), rgba(15,77,74,0) 70%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-[480px] flex-col px-5 pb-16">
        <div className="flex justify-center pb-2 pt-8">
          <Wordmark />
        </div>

        {/* ── INPUT ── */}
        {step === "input" && (
          <>
            <div className="pt-7 text-center">
              <h1 className="text-balance text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#161618]">
                Seu CV daria match com a vaga que você quer?
              </h1>
              <p className="mt-4 text-[15px] leading-[1.55] text-[#5C5C60]">
                Cole a vaga, envie seu CV e veja seu match calculado requisito
                por requisito — com uma amostra grátis do CV adaptado.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-5">
              {/* Vaga */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[13.5px] font-semibold text-[#1B1B1E]">A vaga</p>
                <div className="relative">
                  <Textarea
                    value={jobText}
                    onChange={(e) => handleJobTextChange(e.target.value)}
                    placeholder="Cole o LINK da vaga (lemos pra você) ou o texto completo…"
                    rows={4}
                    disabled={isImportingJob}
                    className="bg-white"
                  />
                  {isImportingJob && (
                    <span className="absolute right-3 top-3 flex items-center gap-1.5 text-[12.5px] font-medium text-[#0F4D4A]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Lendo a vaga…
                    </span>
                  )}
                </div>
                {jobImportedChars !== null && (
                  <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#0F4D4A]">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Vaga importada do link — pode conferir o texto acima.
                  </p>
                )}
              </div>

              {/* CV */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[13.5px] font-semibold text-[#1B1B1E]">Seu CV atual</p>
                  <div className="flex gap-1 rounded-lg bg-[#F4F4F0] p-1">
                    <button
                      type="button"
                      onClick={() => setCvMode("pdf")}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors",
                        cvMode === "pdf" ? "bg-white text-[#0F4D4A] shadow-sm" : "text-[#6E6E72]",
                      )}
                    >
                      Enviar PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setCvMode("text")}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors",
                        cvMode === "text" ? "bg-white text-[#0F4D4A] shadow-sm" : "text-[#6E6E72]",
                      )}
                    >
                      Colar texto
                    </button>
                  </div>
                </div>

                {cvMode === "pdf" ? (
                  <>
                    <input
                      ref={fileInputRef}
                      id="cv-upload"
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                      className="sr-only"
                    />
                    <label
                      htmlFor="cv-upload"
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-4 transition-colors",
                        cvFile
                          ? "border-[#0F4D4A]/40 bg-[#EAF1EF]/50"
                          : "border-[#D8D8D2] bg-[#FAFAF8] hover:bg-[#F4F4F0] active:bg-[#EFEFEB]",
                      )}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF1EF]">
                        <FileUp className="h-5 w-5 text-[#0F4D4A]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-[#1B1B1E]">
                          {cvFile ? cvFile.name : "Enviar CV em PDF"}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-[#A0A09B]">
                          {cvFile
                            ? "Toque pra trocar o arquivo"
                            : "No celular, vale o PDF do Drive ou dos Arquivos"}
                        </p>
                      </div>
                    </label>
                  </>
                ) : (
                  <Textarea
                    value={cvPastedText}
                    onChange={(e) => setCvPastedText(e.target.value)}
                    placeholder="Cole o texto do seu CV atual"
                    rows={6}
                    className="bg-white"
                  />
                )}
                <p className="text-[12.5px] leading-[1.5] text-[#A0A09B]">
                  Seus arquivos são usados apenas para gerar sua análise e não são compartilhados.
                </p>
              </div>

              {inputError && <p className="text-sm text-destructive">{inputError}</p>}

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!canSubmit}
                className="w-full rounded-xl bg-[#0F4D4A] py-3.5 text-[15px] font-semibold text-[#FBFEFD] transition-colors hover:bg-[#0B3F3C] disabled:cursor-not-allowed disabled:opacity-40 active:bg-[#0B3F3C]"
              >
                Medir meu match com a vaga
              </button>
              {submitHint && (
                <p className="-mt-2.5 text-center text-[12.5px] text-[#A0A09B]">{submitHint}</p>
              )}
            </div>
          </>
        )}

        {/* ── LOADING ── */}
        {step === "loading" && <PreviewLoader />}

        {/* ── RESULT ── */}
        {step === "result" && diagnosis && (
          <div className="flex flex-col gap-4 pt-7">
            {/* Match — o diagnóstico é visível (a isca) */}
            <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
              <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                Match com a vaga
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-[44px] font-semibold leading-none tracking-[-0.02em] text-[#0F4D4A]">
                  {diagnosis.match.percent}%
                </span>
                {improved && sample && (
                  <span className="flex items-center gap-1.5 text-[15px] font-medium text-[#6E6E72]">
                    <ArrowRight className="h-4 w-4" />
                    adaptado: <strong className="text-[#0F4D4A]">{sample.matchAfter.percent}%</strong>
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[14px] font-medium text-[#1B1B1E]">
                {diagnosis.job.role}
                {diagnosis.job.seniority ? ` · ${diagnosis.job.seniority}` : ""}
              </p>
              <p className="mt-1 text-[13.5px] text-[#6E6E72]">{breakdownLabel(diagnosis.match)}</p>
              <p className="mt-3 border-t border-[#F0F0EA] pt-3 text-[12.5px] leading-[1.55] text-[#A0A09B]">
                Como calculamos: requisito obrigatório vale 2 pontos, desejável 1; bem representado
                conta 100%, parcial 50%, não encontrado 0. Seu match ={" "}
                {diagnosis.match.earnedPoints} de {diagnosis.match.totalPoints} pontos.
              </p>
            </div>

            {/* Requisitos ✓/⚠/✕ */}
            <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                Como seu CV se encaixa
              </p>
              <div className="flex flex-col gap-5">
                {strong.length > 0 && (
                  <div>
                    <p className="mb-2 text-[13.5px] font-semibold text-[#0F4D4A]">
                      Bem representadas no seu CV
                    </p>
                    <RequirementPills items={strong} tone="strong" />
                  </div>
                )}
                {weak.length > 0 && (
                  <div>
                    <p className="mb-2 text-[13.5px] font-semibold text-[#7A6428]">
                      Presentes, mas pouco evidentes
                    </p>
                    <RequirementPills items={weak} tone="weak" />
                  </div>
                )}
                {missing.length > 0 && (
                  <div>
                    <p className="mb-2 text-[13.5px] font-semibold text-[#6E6E72]">
                      Não encontradas no CV
                    </p>
                    <RequirementPills items={missing} tone="missing" />
                    <p className="mt-2.5 text-[12.5px] leading-[1.55] text-[#A0A09B]">
                      &ldquo;Não encontrada&rdquo; = a vaga pede e não achamos evidência no seu CV.
                      Não inventamos nada disso — nunca.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Amostra da adaptação — a caixa É o gate até o e-mail */}
            <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
              <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#0F4D4A]">
                Amostra do CV adaptado
              </p>
              <div className="mt-3 rounded-[10px] border border-[#E2EAE8] bg-[#F6F8F7] px-4 py-3.5">
                {!revealed ? (
                  <EmailGate
                    onSubmit={handleEmailSubmit}
                    isSubmitting={isSubmittingLead}
                    error={leadError}
                    autoFocusInput={false}
                    title="Veja seu CV reposicionado pra esta vaga"
                    supporting="Deixe seu e-mail e revelamos o summary + 3 trechos do seu CV reescritos pra ESTA vaga — sem inventar nada."
                    buttonLabel="Revelar a amostra"
                  />
                ) : isLoadingSample ? (
                  <div className="flex flex-col items-center gap-2.5 py-6 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-[#0F4D4A]" aria-hidden />
                    <p className="text-[14px] font-medium text-[#0F4D4A]">
                      Reposicionando trechos do seu CV pra vaga…
                    </p>
                    <p className="text-[12.5px] text-[#8A8A85]">
                      Só usamos o que JÁ existe no seu CV — leva ~30 segundos.
                    </p>
                  </div>
                ) : sampleError ? (
                  <div className="flex flex-col gap-3 py-2">
                    <p className="text-[13.5px] leading-[1.5] text-[#3F3F43]">{sampleError}</p>
                    <button
                      type="button"
                      onClick={() => diagnosis && fetchSample(diagnosis)}
                      className="w-full rounded-xl bg-[#0F4D4A] py-3 text-[14px] font-semibold text-[#FBFEFD] transition-colors hover:bg-[#0B3F3C]"
                    >
                      Tentar de novo
                    </button>
                  </div>
                ) : sample ? (
                  <div className="flex flex-col gap-5 py-1">
                    <div>
                      <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#0F4D4A]">
                        Summary posicionado
                      </p>
                      <p className="mt-1.5 text-[15px] font-medium leading-[1.5] text-[#1B1B1E]">
                        {sample.summary}
                      </p>
                    </div>
                    {sample.bullets.map((b, i) => (
                      <div key={i} className="border-t border-[#E2EAE8] pt-4">
                        <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#8A8A85]">
                          Antes
                        </p>
                        <p className="mt-1 text-[13.5px] leading-[1.5] text-[#6E6E72]">{b.source}</p>
                        <p className="mt-2.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#0F4D4A]">
                          Depois
                        </p>
                        <p className="mt-1 text-[15px] font-medium leading-[1.5] text-[#1B1B1E]">
                          {b.rewritten}
                        </p>
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#EAF1EF] px-2.5 py-1 text-[11.5px] font-semibold text-[#0F4D4A]">
                          <Check className="h-3 w-3" aria-hidden />
                          agora evidencia: {b.requirementTerm}
                        </span>
                      </div>
                    ))}
                    {improved && (
                      <p className="border-t border-[#E2EAE8] pt-3.5 text-[13px] leading-[1.55] text-[#6E6E72]">
                        Só com estes trechos, seu match projetado vai de{" "}
                        <strong className="text-[#1B1B1E]">{diagnosis.match.percent}%</strong> pra{" "}
                        <strong className="text-[#0F4D4A]">{sample.matchAfter.percent}%</strong> —
                        evidenciando o que JÁ está no seu CV, sem adicionar nada.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Ato 3 — o chamado fecha a história com o produto completo */}
            {revealed && (sample || sampleError) && (
              <div className="overflow-hidden rounded-2xl bg-[#0F4D4A] p-6 text-white shadow-[0_18px_48px_rgba(15,77,74,0.28)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9DC3BE]">
                  O próximo passo
                </p>
                <h2 className="mt-2 text-balance text-[21px] font-semibold leading-[1.25] tracking-[-0.02em]">
                  Isso foi uma amostra. O CV inteiro sai pronto.
                </h2>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-[#CFE0DD]">
                  No GlobeJobbers completo, o CV Tailor entrega seu CV inteiro
                  adaptado pra vaga — em 1 página, com PDF formatado pra baixar:
                </p>
                <ol className="mt-4 flex flex-col gap-2.5">
                  {[
                    "Cole qualquer vaga — seu CV inteiro é reposicionado pra ela",
                    "Baixe o PDF pronto, tipografado, em 1 página",
                    "E prepare o resto: LinkedIn, skills e treino de entrevista",
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
                  onClick={() => track("preview_full_cta_clicked", { source: "cv" })}
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
              Analisar outra vaga
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
