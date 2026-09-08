"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

// Onboarding Assistant (ver claude/PROPOSTA-ONBOARDING-ASSISTANT.md):
// conta nova é CONDUZIDA na ordem pedagógica da mentoria — quem sou
// (PDF) → o que o mercado pede (Market Intelligence) → o que eu quero
// (vagas do corpus) — em vez de cair num dashboard de 6 cards soltos.
// Na aula da Turma Alpha, 3 de 4 alunos se perderam exatamente aí.

interface JobOption {
  index: number;
  title: string;
  employer: string;
  snippet: string;
}

export interface OnboardingAssistantProps {
  hasPdf: boolean;
  /** Cargo extraído do PDF (Haiku) — null quando não deu pra identificar. */
  extractedRole: string | null;
  hasMarketIntel: boolean;
}

type StepKey = 1 | 2 | 3;

export function OnboardingAssistant({ hasPdf, extractedRole, hasMarketIntel }: OnboardingAssistantProps) {
  const router = useRouter();
  const activeStep: StepKey = !hasPdf ? 1 : !hasMarketIntel ? 2 : 3;

  useEffect(() => {
    track("onboarding_viewed", { step: activeStep });
    // Só no primeiro render de cada visita — mudanças de passo vêm via
    // router.refresh(), que remonta o componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Passo 1: upload ---
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/profile-document", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Não foi possível ler o PDF. Tente de novo.",
        );
      }
      track("onboarding_pdf_uploaded");
      // O servidor recalcula os passos (PDF salvo + cargo extraído).
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro inesperado.");
      setUploading(false);
    }
  }

  // --- Passo 2: cargo (editável) ---
  const [role, setRole] = useState(extractedRole ?? "");

  // --- Passo 3: vagas do corpus ---
  const [jobs, setJobs] = useState<JobOption[] | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);

  useEffect(() => {
    if (activeStep !== 3) return;
    fetch("/api/onboarding/jobs")
      .then((res) => (res.ok ? res.json() : { reportId: null, jobs: [] }))
      .then((data) => {
        setReportId((data?.reportId as string | null) ?? null);
        setJobs(Array.isArray(data?.jobs) ? (data.jobs as JobOption[]) : []);
      })
      .catch(() => setJobs([]));
  }, [activeStep]);

  function toggleJob(index: number) {
    setSelected((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : prev.length >= 5 ? prev : [...prev, index],
    );
  }

  async function handleSelectJobs() {
    if (!reportId || selected.length === 0) return;
    setSubmitting(true);
    setJobsError(null);
    try {
      const res = await fetch("/api/onboarding/select-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, indexes: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data.code === "PLAN_REQUIRED") {
        window.location.assign("/assinatura");
        return;
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Não foi possível montar seu perfil.",
        );
      }
      track("onboarding_jobs_selected", { count: selected.length });
      track("onboarding_completed");
      router.refresh();
    } catch (err) {
      setJobsError(err instanceof Error ? err.message : "Erro inesperado.");
      setSubmitting(false);
    }
  }

  const marketIntelHref = `/tools/market-intel?role=${encodeURIComponent(role.trim())}&region=us&onboarding=1`;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[#D8E5E2] bg-[#F4F8F7] px-5 py-4">
        <p className="text-[14.5px] font-semibold text-[#0F4D4A]">
          Vamos montar sua base em 3 passos
        </p>
        <p className="mt-0.5 text-[13px] leading-[1.55] text-[#3F3F43]">
          Quem você é → o que o mercado pede → o que você quer. No final, todas
          as ferramentas trabalham apontadas pro SEU alvo.
        </p>
      </div>

      {/* Passo 1 — PDF */}
      <StepCard number={1} title="Suba o PDF do seu LinkedIn" done={hasPdf} active={activeStep === 1}>
        {activeStep === 1 && (
          <div className="flex flex-col gap-3">
            <p className="text-[13.5px] leading-[1.6] text-[#6E6E72]">
              No LinkedIn: seu perfil → botão <strong>Mais</strong> →{" "}
              <strong>Salvar como PDF</strong>. É o retrato de quem você é hoje —
              dele saem seu raio-X e o cargo que vamos pesquisar no mercado.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="rounded-lg border border-dashed border-[#D8D8D2] bg-[#FAFAF8] px-3 py-4 text-[13.5px] text-[#6E6E72] file:mr-3 file:rounded-md file:border-0 file:bg-[#0F4D4A] file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium file:text-white"
            />
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
            >
              {uploading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Lendo seu perfil…
                </span>
              ) : (
                "Salvar meu perfil"
              )}
            </Button>
          </div>
        )}
      </StepCard>

      {/* Passo 2 — Market Intelligence */}
      <StepCard
        number={2}
        title="Veja o que o mercado pede pro seu cargo"
        done={hasMarketIntel}
        active={activeStep === 2}
      >
        {activeStep === 2 && (
          <div className="flex flex-col gap-3">
            {extractedRole ? (
              <p className="text-[13.5px] leading-[1.6] text-[#6E6E72]">
                Lemos seu PDF e identificamos seu cargo como{" "}
                <strong className="text-[#1B1B1E]">{extractedRole}</strong>. Vamos
                analisar centenas de vagas reais desse mercado — pode ajustar o
                nome antes, se quiser.
              </p>
            ) : (
              <p className="text-[13.5px] leading-[1.6] text-[#6E6E72]">
                Qual cargo você quer pesquisar no mercado internacional? Prefira
                o nome em inglês — é como as vagas são anunciadas.
              </p>
            )}
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex.: Product Designer"
              className="rounded-lg border border-[#E2E2DC] px-3 py-2 text-[14px] text-[#1B1B1E] outline-none focus:border-[#0F4D4A]"
            />
            <Button
              onClick={() => {
                track("onboarding_market_intel_clicked");
                router.push(marketIntelHref);
              }}
              disabled={role.trim().length < 2}
              className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
            >
              Analisar esse mercado
            </Button>
          </div>
        )}
      </StepCard>

      {/* Passo 3 — vagas do corpus */}
      <StepCard number={3} title="Marque as vagas que te dão vontade" done={false} active={activeStep === 3}>
        {activeStep === 3 && (
          <div className="flex flex-col gap-3">
            {jobs === null && (
              <p className="inline-flex items-center gap-2 text-[13.5px] text-[#6E6E72]">
                <Loader2 className="h-4 w-4 animate-spin text-[#0F4D4A]" aria-hidden />
                Buscando as vagas do seu relatório…
              </p>
            )}
            {jobs !== null && jobs.length > 0 && (
              <>
                <p className="text-[13.5px] leading-[1.6] text-[#6E6E72]">
                  Estas são vagas reais do relatório que você acabou de ver.
                  Marque de 1 a 5 que você leu e pensou{" "}
                  <em>&ldquo;eu queria estar fazendo isso&rdquo;</em> — vontade,
                  não viabilidade. Elas viram o seu alvo.
                </p>
                <div className="flex max-h-[340px] flex-col gap-2 overflow-y-auto pr-1">
                  {jobs.map((job) => {
                    const isSelected = selected.includes(job.index);
                    return (
                      <button
                        key={job.index}
                        type="button"
                        onClick={() => toggleJob(job.index)}
                        className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                          isSelected
                            ? "border-[#0F4D4A] bg-[#EAF1EF]"
                            : "border-[#EAEAE4] bg-white hover:bg-[#FAFAF8]"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-[13.5px] font-semibold leading-snug text-[#1B1B1E]">
                            {job.title}
                          </span>
                          {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0F4D4A]" />}
                        </span>
                        {job.employer && (
                          <span className="mt-0.5 block text-[12.5px] text-[#8A8A85]">{job.employer}</span>
                        )}
                        {job.snippet && (
                          <span className="mt-1 block text-[12.5px] leading-[1.5] text-[#6E6E72]">
                            {job.snippet}…
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {jobsError && <p className="text-sm text-destructive">{jobsError}</p>}
                <Button
                  onClick={handleSelectJobs}
                  disabled={selected.length === 0 || submitting}
                  className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Montando seu Perfil de Mercado…
                    </span>
                  ) : (
                    `Usar ${selected.length || "essas"} vaga${selected.length === 1 ? "" : "s"} como meu alvo`
                  )}
                </Button>
              </>
            )}
            {jobs !== null && jobs.length === 0 && (
              <p className="text-[13.5px] leading-[1.6] text-[#6E6E72]">
                Não encontramos as vagas do seu relatório (ele pode ter expirado).
                Sem problema: cole as vagas que você quer direto na{" "}
                <Link
                  href="/tools/linkedin-review?tab=headline"
                  className="font-medium text-[#0F4D4A] underline underline-offset-2"
                >
                  aba Headline
                </Link>
                .
              </p>
            )}
            <Link
              href="/tools/linkedin-review?tab=headline"
              className="text-[12.5px] text-[#8A8A85] underline-offset-2 hover:text-[#3F3F43] hover:underline"
            >
              Prefiro colar vagas que eu mesmo encontrei
            </Link>
          </div>
        )}
      </StepCard>

      <Link
        href="/dashboard?full=1"
        onClick={() => track("onboarding_skipped", { step: activeStep })}
        className="mx-auto text-[12.5px] text-[#A0A09B] underline-offset-2 hover:text-[#6E6E72] hover:underline"
      >
        Pular o guia e ver todas as ferramentas
      </Link>
    </div>
  );
}

function StepCard({
  number,
  title,
  done,
  active,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  active: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgba(20,20,20,0.03)] ${
        active ? "border-[#0F4D4A]" : "border-[#EAEAE4]"
      } ${!active && !done ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
            done
              ? "bg-[#0F4D4A] text-white"
              : active
                ? "border-2 border-[#0F4D4A] text-[#0F4D4A]"
                : "border border-[#D8D8D2] text-[#A0A09B]"
          }`}
        >
          {done ? <Check className="h-4 w-4" /> : number}
        </span>
        <p className={`text-[15px] font-semibold ${active || done ? "text-[#161618]" : "text-[#8A8A85]"}`}>
          {title}
        </p>
      </div>
      {children && <div className="mt-4 pl-10">{children}</div>}
    </div>
  );
}
