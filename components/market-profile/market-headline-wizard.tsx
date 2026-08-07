"use client";

import { useMemo, useState } from "react";
import { Link2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { MarketProfileView } from "@/components/market-profile/market-profile-view";
import { HeadlineMarketResultView } from "@/components/market-profile/headline-market-result";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  TARGET_MARKET_LABELS,
  TARGET_MARKET_OPTIONS,
  type HeadlineLanguage,
  type MarketHeadlineResult,
  type MarketKeyword,
  type MarketProfile,
  type MarketProfileIdentified,
  type TargetMarket,
} from "@/lib/types";

type Step =
  | "current" // Passo 1: cargo atual (opcional)
  | "jobs" // Passo 2: vagas desejadas (1-5, texto ou URL)
  | "extracting" // chamada /api/market-profile
  | "confirm" // "Perfil identificado" — confirmar/editar
  | "generating" // chamada /api/tools/headline (mode market)
  | "result"
  | "limit_reached";

// Espelha MIN_JOB_TEXT_LENGTH do servidor — validar aqui evita o roundtrip,
// o servidor revalida de qualquer forma.
const MIN_JOB_TEXT_LENGTH = 300;
const MAX_JOBS = 5;

interface JobEntry {
  text: string;
  url: string;
  importing: boolean;
  urlError: string | null;
}

const EMPTY_JOB: JobEntry = { text: "", url: "", importing: false, urlError: null };

// Medidor de força: mais vagas = perfil mais assertivo (recorrência só
// existe com 2+; com 5 a leitura do mercado é a mais confiável).
const STRENGTH_LABELS = ["", "Básica", "Razoável", "Boa", "Muito boa", "Máxima"] as const;

/**
 * Wizard da metodologia (ver PROPOSTA-PERFIL-DE-MERCADO.md): a fonte de
 * verdade são as VAGAS que o usuário quer conquistar. Ele só informa o
 * cargo atual (opcional) e cola 1-5 vagas; cargo-alvo, senioridade e
 * mercado são identificados pela IA e apenas confirmados/editados na tela
 * "Perfil identificado". Nada sobre o próprio usuário é declarado.
 */
export function MarketHeadlineWizard() {
  const [step, setStep] = useState<Step>("current");
  const [error, setError] = useState<string | null>(null);

  const [currentRole, setCurrentRole] = useState("");
  const [jobs, setJobs] = useState<JobEntry[]>([{ ...EMPTY_JOB }]);
  const [profile, setProfile] = useState<MarketProfile | null>(null);
  const [identified, setIdentified] = useState<MarketProfileIdentified | null>(null);
  const [editing, setEditing] = useState(false);
  const [language, setLanguage] = useState<HeadlineLanguage>("en");
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [result, setResult] = useState<MarketHeadlineResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const filledJobs = jobs.map((j) => j.text.trim()).filter((t) => t.length > 0);
  const shortJobIndex = jobs.findIndex(
    (j) => j.text.trim().length > 0 && j.text.trim().length < MIN_JOB_TEXT_LENGTH,
  );

  /** Top keywords (todas as categorias, por recorrência) pra tela de confirmação. */
  const topKeywords = useMemo(() => {
    if (!profile) return [];
    const all: MarketKeyword[] = Object.values(profile.keywords).flat();
    const seen = new Set<string>();
    return all
      .sort((a, b) => b.count - a.count)
      .filter((k) => {
        const key = k.term.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10);
  }, [profile]);

  function updateJob(index: number, patch: Partial<JobEntry>) {
    setJobs((prev) => prev.map((j, i) => (i === index ? { ...j, ...patch } : j)));
  }

  async function importFromUrl(index: number) {
    const url = jobs[index].url.trim();
    if (!url) return;
    updateJob(index, { importing: true, urlError: null });

    try {
      const res = await fetch("/api/job-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Não conseguimos ler essa página. Cole o texto da vaga.");
      }
      updateJob(index, { text: data.text as string, importing: false });
      track("job_url_imported", { chars: data.chars });
    } catch (err) {
      updateJob(index, {
        importing: false,
        urlError:
          err instanceof Error ? err.message : "Não conseguimos ler essa página. Cole o texto da vaga.",
      });
      track("job_url_import_failed", {});
    }
  }

  async function createProfile() {
    setStep("extracting");
    setError(null);
    track("market_profile_started", { jobs: filledJobs.length });

    try {
      const res = await fetch("/api/market-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentRole: currentRole.trim(), jobs: filledJobs }),
      });
      const data = await res.json();

      if (res.status === 403 && data.code === "PLAN_REQUIRED") {
        track("plan_required", { tool_type: "headline" });
        window.location.assign("/assinatura");
        return;
      }
      if (res.status === 403 && data.code === "LIMIT_REACHED") {
        setStep("limit_reached");
        track("limit_reached", { tool_type: "headline" });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível analisar as vagas.");
      }

      const created = data.profile as MarketProfile;
      setProfile(created);
      setIdentified({
        targetRole: created.targetRole,
        seniority: created.seniority,
        targetMarket: created.targetMarket,
      });
      setEditing(false);
      setShowFullProfile(false);
      setStep("confirm");
      track("market_profile_created", { jobs: filledJobs.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("jobs");
      track("market_profile_failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  async function generateHeadline() {
    if (!profile || !identified) return;
    setStep("generating");
    setError(null);

    try {
      const res = await fetch("/api/tools/headline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "market",
          marketProfileId: profile.id,
          identified,
          language,
        }),
      });
      const data = await res.json();

      if (res.status === 403 && data.code === "PLAN_REQUIRED") {
        track("plan_required", { tool_type: "headline" });
        window.location.assign("/assinatura");
        return;
      }
      if (res.status === 403 && data.code === "LIMIT_REACHED") {
        setStep("limit_reached");
        track("limit_reached", { tool_type: "headline" });
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível gerar sua headline.");
      }

      setResult(data.analysis as MarketHeadlineResult);
      setRemaining(data.usage?.remaining ?? null);
      setStep("result");
      track("market_headline_generated", { jobs: filledJobs.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("confirm");
    }
  }

  function handleReset() {
    setStep("current");
    setError(null);
    setCurrentRole("");
    setJobs([{ ...EMPTY_JOB }]);
    setProfile(null);
    setIdentified(null);
    setEditing(false);
    setLanguage("en");
    setResult(null);
  }

  const stepIndicator =
    step === "current" ? "Passo 1 de 2 — Seu cargo atual" :
    step === "jobs" ? "Passo 2 de 2 — Vagas que você quer conquistar" :
    step === "confirm" ? "Perfil identificado" : null;

  return (
    <div className="flex flex-col gap-6">
      {stepIndicator && (
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-[#0F4D4A]">
          {stepIndicator}
        </p>
      )}

      {step === "current" && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mp-currentRole">
              Cargo/área atual <span className="font-normal text-[#8A8A85]">(opcional)</span>
            </Label>
            <Input
              id="mp-currentRole"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              placeholder="Ex.: Product Designer"
            />
            <p className="text-[12.5px] leading-[1.5] text-[#A0A09B]">
              Só contexto. Sua headline vai nascer das <strong>vagas que você quer</strong> — é o
              próximo passo.
            </p>
          </div>

          <Button
            onClick={() => setStep("jobs")}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            Continuar
          </Button>
        </>
      )}

      {step === "jobs" && (
        <>
          <div className="rounded-xl bg-[#EAF1EF] px-4 py-3 text-[13px] leading-[1.55] text-[#0F4D4A]">
            Cole a descrição (ou o link) de vagas que você <strong>quer conquistar</strong>. A IA
            vai ler as vagas e identificar cargo-alvo, senioridade, mercado e as palavras-chave
            que recrutadores usam na busca.
          </div>

          <div className="flex flex-col gap-5">
            {jobs.map((job, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-2xl border border-[#EAEAE4] bg-white p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`mp-job-${index}`}>Vaga {index + 1}</Label>
                  {jobs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setJobs((prev) => prev.filter((_, i) => i !== index))}
                      className="flex items-center gap-1 text-[12.5px] text-[#8A8A85] transition-colors hover:text-[#3F3F43]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={job.url}
                    onChange={(e) => updateJob(index, { url: e.target.value, urlError: null })}
                    placeholder="Link da vaga (opcional)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => importFromUrl(index)}
                    disabled={job.url.trim().length === 0 || job.importing}
                    className="shrink-0"
                  >
                    {job.importing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Link2 className="mr-1.5 h-4 w-4" />
                        Importar
                      </>
                    )}
                  </Button>
                </div>
                {job.urlError && <p className="text-[12.5px] text-destructive">{job.urlError}</p>}

                <Textarea
                  id={`mp-job-${index}`}
                  value={job.text}
                  onChange={(e) => updateJob(index, { text: e.target.value })}
                  placeholder="…ou cole aqui a descrição completa da vaga (título, requisitos, responsabilidades)."
                  rows={6}
                />
              </div>
            ))}
          </div>

          {filledJobs.length > 0 && (
            <div className="rounded-xl border border-[#EAEAE4] bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                  Força da análise
                </p>
                <p className="text-[13px] font-semibold text-[#0F4D4A]">
                  {STRENGTH_LABELS[Math.min(filledJobs.length, MAX_JOBS)]}
                </p>
              </div>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: MAX_JOBS }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      i < filledJobs.length ? "bg-[#0F4D4A]" : "bg-[#EAEAE4]",
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-[12.5px] leading-[1.5] text-[#8A8A85]">
                {filledJobs.length < MAX_JOBS
                  ? `1 vaga já funciona — mas quanto mais vagas, mais assertiva a leitura do seu mercado. Adicione até ${MAX_JOBS}.`
                  : "Máxima precisão: com 5 vagas, a recorrência das palavras-chave é a leitura mais confiável do mercado."}
              </p>
            </div>
          )}

          {jobs.length < MAX_JOBS && (
            <button
              type="button"
              onClick={() => setJobs((prev) => [...prev, { ...EMPTY_JOB }])}
              className="flex items-center gap-1.5 self-start text-[13.5px] font-medium text-[#0F4D4A] transition-colors hover:text-[#0B3F3C]"
            >
              <Plus className="h-4 w-4" />
              Adicionar outra vaga
            </button>
          )}

          {shortJobIndex !== -1 && (
            <p className="text-sm text-destructive">
              A vaga {shortJobIndex + 1} parece incompleta — cole a descrição completa
              (requisitos, responsabilidades).
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={createProfile}
            disabled={filledJobs.length === 0 || shortJobIndex !== -1}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            Analisar {filledJobs.length <= 1 ? "a vaga" : `as ${filledJobs.length} vagas`}
          </Button>

          <button
            type="button"
            onClick={() => setStep("current")}
            className="mx-auto text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
          >
            Voltar
          </button>
        </>
      )}

      {step === "extracting" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#0F4D4A]" aria-hidden />
          <p className="text-[14px] font-medium text-[#0F4D4A]">
            Lendo as vagas e identificando seu mercado-alvo…
          </p>
          <p className="text-[13px] text-[#8A8A85]">
            Cargo, senioridade, mercado e as palavras-chave que recrutadores buscam.
          </p>
        </div>
      )}

      {step === "confirm" && profile && identified && (
        <>
          <div className="rounded-2xl border border-[#EAEAE4] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 flex-col gap-3">
                {editing ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mp-edit-role">Cargo</Label>
                      <Input
                        id="mp-edit-role"
                        value={identified.targetRole}
                        onChange={(e) =>
                          setIdentified({ ...identified, targetRole: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mp-edit-seniority">Senioridade</Label>
                      <Input
                        id="mp-edit-seniority"
                        value={identified.seniority}
                        onChange={(e) =>
                          setIdentified({ ...identified, seniority: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mp-edit-market">Mercado</Label>
                      <select
                        id="mp-edit-market"
                        value={identified.targetMarket}
                        onChange={(e) =>
                          setIdentified({
                            ...identified,
                            targetMarket: e.target.value as TargetMarket,
                          })
                        }
                        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {TARGET_MARKET_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        track("market_profile_edited", {});
                      }}
                      className="self-start"
                    >
                      Salvar ajustes
                    </Button>
                  </>
                ) : (
                  <dl className="flex flex-col gap-3">
                    <div>
                      <dt className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                        Cargo
                      </dt>
                      <dd className="mt-0.5 text-[16px] font-semibold text-[#1B1B1E]">
                        {identified.targetRole}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                        Senioridade
                      </dt>
                      <dd className="mt-0.5 text-[14.5px] font-medium text-[#1B1B1E]">
                        {identified.seniority}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                        Mercado
                      </dt>
                      <dd className="mt-0.5 text-[14.5px] font-medium text-[#1B1B1E]">
                        {TARGET_MARKET_LABELS[identified.targetMarket]}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>

              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E2E2DC] bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              )}
            </div>

            {topKeywords.length > 0 && (
              <div className="mt-4 border-t border-[#F0F0EA] pt-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                  Palavras-chave encontradas
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {topKeywords.map((keyword) => (
                    <span
                      key={keyword.term}
                      className="rounded-lg bg-[#EAF1EF] px-2.5 py-1 text-[13px] font-medium text-[#0F4D4A]"
                    >
                      {keyword.term}
                      {keyword.count > 1 && (
                        <span className="ml-1 text-[11px] font-bold">{keyword.count}x</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFullProfile((v) => !v)}
            className="self-start text-[13px] font-medium text-[#0F4D4A] underline-offset-2 hover:underline"
          >
            {showFullProfile ? "Ocultar perfil completo" : "Ver perfil completo por categoria"}
          </button>
          {showFullProfile && <MarketProfileView keywords={profile.keywords} />}

          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F4F4F0] px-4 py-3">
            <p className="text-[13.5px] font-medium text-[#1B1B1E]">
              Esse é o perfil para o qual você deseja se posicionar?
            </p>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as HeadlineLanguage)}
              aria-label="Idioma da headline"
              className="h-8 shrink-0 rounded-md border border-[#E2E2DC] bg-white px-2 text-[12.5px] focus-visible:outline-none"
            >
              <option value="en">Headline em inglês</option>
              <option value="pt">Headline em português</option>
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={generateHeadline}
            disabled={editing || identified.targetRole.trim().length === 0}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            Confirmar e gerar minha headline
          </Button>

          <button
            type="button"
            onClick={() => setStep("jobs")}
            className="mx-auto text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
          >
            Voltar às vagas
          </button>
        </>
      )}

      {step === "generating" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#0F4D4A]" aria-hidden />
          <p className="text-[14px] font-medium text-[#0F4D4A]">
            Escrevendo sua headline com as palavras que recrutadores buscam…
          </p>
        </div>
      )}

      <UpgradeModal
        open={step === "limit_reached"}
        onClose={() => setStep(profile ? "confirm" : "jobs")}
        toolType="headline"
      />

      {step === "result" && result && (
        <div className="flex flex-col gap-4">
          <HeadlineMarketResultView result={result} />
          <p className="rounded-xl bg-[#F4F4F0] px-4 py-3 text-center text-[13px] leading-[1.55] text-[#5C5C60]">
            Seu Perfil de Mercado foi salvo — as próximas ferramentas do GlobeJobbers vão usá-lo
            sem pedir nada de novo.
          </p>
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
            Começar de novo com outras vagas
          </button>
        </div>
      )}
    </div>
  );
}
