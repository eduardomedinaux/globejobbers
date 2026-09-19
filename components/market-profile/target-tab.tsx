"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Link2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { MarketProfileView } from "@/components/market-profile/market-profile-view";
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
  type MarketKeyword,
  type MarketProfile,
  type MarketProfileIdentified,
  type TargetMarket,
} from "@/lib/types";

// Espelha MIN_JOB_TEXT_LENGTH do servidor — validar aqui evita o roundtrip.
const MIN_JOB_TEXT_LENGTH = 300;
const MAX_JOBS = 5;

interface JobEntry {
  text: string;
  url: string;
  importing: boolean;
  urlError: string | null;
}

const EMPTY_JOB: JobEntry = { text: "", url: "", importing: false, urlError: null };

// Medidor de força: mais vagas = perfil mais assertivo.
const STRENGTH_LABELS = ["", "Básica", "Razoável", "Boa", "Muito boa", "Máxima"] as const;

type View = "loading" | "summary" | "wizard";
// Sem passo de "cargo atual" (decisão 19/set): as vagas coladas já bastam,
// e o cargo atual vem do PDF salvo (extracted_role) no servidor — zero
// pergunta desnecessária.
type WizardStep = "jobs" | "extracting" | "confirm" | "limit_reached";

/** Top keywords (todas as categorias, por recorrência), deduplicadas. */
function topKeywordsOf(profile: MarketProfile | null): MarketKeyword[] {
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
}

/**
 * Aba "Meu Alvo" do Market Intelligence (decisão 18/set — as vagas de
 * interesse "ditam quase tudo", então o alvo mora na casa do mercado, não
 * escondido numa aba de headline). Mostra o Perfil de Mercado ativo e
 * permite trocar o alvo colando vagas novas (wizard herdado da metodologia:
 * a fonte de verdade são as VAGAS desejadas — nada é autodeclarado).
 *
 * A headline não é mais gerada aqui: ela sai pronta na categoria Headline
 * do LinkedIn Review, avaliada contra este alvo. Uma resposta, zero escolha.
 */
export function MyTargetTab() {
  const [view, setView] = useState<View>("loading");
  const [profile, setProfile] = useState<MarketProfile | null>(null);
  /** Alvo recém-salvo — mostra os CTAs de próximo passo no resumo. */
  const [justSaved, setJustSaved] = useState(false);

  // --- estado do resumo ---
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState<MarketProfileIdentified | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // --- estado do wizard ---
  const [step, setStep] = useState<WizardStep>("jobs");
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobEntry[]>([{ ...EMPTY_JOB }]);
  const [draftProfile, setDraftProfile] = useState<MarketProfile | null>(null);
  const [identified, setIdentified] = useState<MarketProfileIdentified | null>(null);
  const [editingConfirm, setEditingConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showDraftFull, setShowDraftFull] = useState(false);

  const filledJobs = jobs.map((j) => j.text.trim()).filter((t) => t.length > 0);
  const shortJobIndex = jobs.findIndex(
    (j) => j.text.trim().length > 0 && j.text.trim().length < MIN_JOB_TEXT_LENGTH,
  );

  const topKeywords = useMemo(() => topKeywordsOf(profile), [profile]);
  const draftTopKeywords = useMemo(() => topKeywordsOf(draftProfile), [draftProfile]);

  useEffect(() => {
    track("my_target_viewed");
    fetch("/api/market-profile")
      .then((res) => (res.ok ? res.json() : { profile: null }))
      .then((data) => {
        const active = (data?.profile ?? null) as MarketProfile | null;
        setProfile(active);
        setView(active ? "summary" : "wizard");
      })
      .catch(() => setView("wizard"));
  }, []);

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
        // Sem currentRole: o servidor usa o cargo extraído do PDF salvo.
        body: JSON.stringify({ jobs: filledJobs }),
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
      setDraftProfile(created);
      setIdentified({
        targetRole: created.targetRole,
        seniority: created.seniority,
        targetMarket: created.targetMarket,
      });
      setEditingConfirm(false);
      setShowDraftFull(false);
      setStep("confirm");
      track("market_profile_created", { jobs: filledJobs.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("jobs");
      track("market_profile_failed", { error: err instanceof Error ? err.message : "unknown" });
    }
  }

  /** Persiste a confirmação (possivelmente editada) e volta pro resumo. */
  async function confirmTarget() {
    if (!draftProfile || !identified) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/market-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: draftProfile.id, ...identified }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível salvar seu alvo.");
      }
      setProfile(data.profile as MarketProfile);
      setJustSaved(true);
      setShowFullProfile(false);
      setEditing(false);
      setView("summary");
      resetWizard();
      track("market_profile_edited", {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setConfirming(false);
    }
  }

  /** Salva a edição inline feita no RESUMO (sem refazer as vagas). */
  async function saveSummaryEdit() {
    if (!profile || !edited) return;
    setSavingEdit(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/market-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id, ...edited }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Não foi possível salvar.");
      }
      setProfile(data.profile as MarketProfile);
      setEditing(false);
      track("market_profile_edited", {});
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSavingEdit(false);
    }
  }

  function resetWizard() {
    setStep("jobs");
    setError(null);
    setJobs([{ ...EMPTY_JOB }]);
    setDraftProfile(null);
    setIdentified(null);
    setEditingConfirm(false);
  }

  if (view === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0F4D4A]" aria-hidden />
        <p className="text-[14px] font-medium text-[#0F4D4A]">Carregando seu alvo…</p>
      </div>
    );
  }

  // ---------- RESUMO: o alvo ativo ----------
  if (view === "summary" && profile) {
    return (
      <div className="flex flex-col gap-5">
        {justSaved && (
          <div className="rounded-xl bg-[#EAF1EF] px-4 py-3 text-[13.5px] leading-[1.55] text-[#0F4D4A]">
            <strong>Alvo salvo.</strong> Próximo passo: rode o LinkedIn Review — a análise, a
            headline e o plano de Skills saem calibrados pra ele.
          </div>
        )}

        <div className="rounded-2xl border border-[#EAEAE4] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-1 flex-col gap-3">
              {editing && edited ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="mt-edit-role">Cargo</Label>
                    <Input
                      id="mt-edit-role"
                      value={edited.targetRole}
                      onChange={(e) => setEdited({ ...edited, targetRole: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="mt-edit-seniority">Senioridade</Label>
                    <Input
                      id="mt-edit-seniority"
                      value={edited.seniority}
                      onChange={(e) => setEdited({ ...edited, seniority: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="mt-edit-market">Mercado</Label>
                    <select
                      id="mt-edit-market"
                      value={edited.targetMarket}
                      onChange={(e) =>
                        setEdited({ ...edited, targetMarket: e.target.value as TargetMarket })
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
                  {summaryError && <p className="text-sm text-destructive">{summaryError}</p>}
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={saveSummaryEdit}
                      disabled={savingEdit || edited.targetRole.trim().length === 0}
                    >
                      {savingEdit ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Salvando…
                        </span>
                      ) : (
                        "Salvar ajustes"
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="text-[13px] text-[#8A8A85] underline-offset-2 hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <dl className="flex flex-col gap-3">
                  <div>
                    <dt className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                      Cargo-alvo
                    </dt>
                    <dd className="mt-0.5 text-[16px] font-semibold text-[#1B1B1E]">
                      {profile.targetRole}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                      Senioridade
                    </dt>
                    <dd className="mt-0.5 text-[14.5px] font-medium text-[#1B1B1E]">
                      {profile.seniority}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                      Mercado
                    </dt>
                    <dd className="mt-0.5 text-[14.5px] font-medium text-[#1B1B1E]">
                      {TARGET_MARKET_LABELS[profile.targetMarket]}
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setEdited({
                    targetRole: profile.targetRole,
                    seniority: profile.seniority,
                    targetMarket: profile.targetMarket,
                  });
                  setEditing(true);
                }}
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
                O que essas vagas mais pedem
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

          {profile.sourceJobs.length > 0 && (
            <div className="mt-4 border-t border-[#F0F0EA] pt-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                Vagas que definem esse alvo ({profile.sourceJobs.length})
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {profile.sourceJobs.map((job) => (
                  <li
                    key={job.index}
                    className="flex items-start gap-2 text-[13px] leading-[1.45] text-[#5C5C60]"
                  >
                    <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F4D4A]" />
                    <span className="truncate">{job.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFullProfile((v) => !v)}
          className="self-start text-[13px] font-medium text-[#0F4D4A] underline-offset-2 hover:underline"
        >
          {showFullProfile ? "Ocultar keywords por categoria" : "Ver todas as keywords por categoria"}
        </button>
        {showFullProfile && <MarketProfileView keywords={profile.keywords} />}

        <div className="rounded-xl bg-[#F4F4F0] px-4 py-3 text-[13px] leading-[1.55] text-[#5C5C60]">
          Esse alvo alimenta tudo: o LinkedIn Review (análise + headline), o plano de Skills e o
          Interview Prep usam ele sem pedir nada de novo.
        </div>

        {justSaved ? (
          <a
            href="/tools/linkedin-review"
            className="inline-flex items-center justify-center rounded-lg bg-[#0F4D4A] px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#0B3F3C]"
          >
            Rodar o LinkedIn Review com esse alvo
          </a>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setJustSaved(false);
            setView("wizard");
          }}
          className="mx-auto text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
        >
          Trocar meu alvo — analisar outras vagas
        </button>
      </div>
    );
  }

  // ---------- WIZARD: definir/trocar o alvo ----------
  const stepIndicator =
    step === "jobs" ? "Vagas que você quer conquistar" :
    step === "confirm" ? "Alvo identificado" : null;

  return (
    <div className="flex flex-col gap-6">
      {stepIndicator && (
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-[#0F4D4A]">
          {stepIndicator}
        </p>
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
                  <Label htmlFor={`mt-job-${index}`}>Vaga {index + 1}</Label>
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
                  id={`mt-job-${index}`}
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

          {profile && (
            <button
              type="button"
              onClick={() => setView("summary")}
              className="mx-auto text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
            >
              Cancelar — manter meu alvo atual
            </button>
          )}
        </>
      )}

      {step === "extracting" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#0F4D4A]" aria-hidden />
          <p className="text-[14px] font-medium text-[#0F4D4A]">
            Lendo as vagas e identificando seu alvo…
          </p>
          <p className="text-[13px] text-[#8A8A85]">
            Cargo, senioridade, mercado e as palavras-chave que recrutadores buscam.
          </p>
        </div>
      )}

      {step === "confirm" && draftProfile && identified && (
        <>
          <div className="rounded-2xl border border-[#EAEAE4] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 flex-col gap-3">
                {editingConfirm ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mt-confirm-role">Cargo</Label>
                      <Input
                        id="mt-confirm-role"
                        value={identified.targetRole}
                        onChange={(e) =>
                          setIdentified({ ...identified, targetRole: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mt-confirm-seniority">Senioridade</Label>
                      <Input
                        id="mt-confirm-seniority"
                        value={identified.seniority}
                        onChange={(e) =>
                          setIdentified({ ...identified, seniority: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="mt-confirm-market">Mercado</Label>
                      <select
                        id="mt-confirm-market"
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
                      onClick={() => setEditingConfirm(false)}
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

              {!editingConfirm && (
                <button
                  type="button"
                  onClick={() => setEditingConfirm(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E2E2DC] bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              )}
            </div>

            {draftTopKeywords.length > 0 && (
              <div className="mt-4 border-t border-[#F0F0EA] pt-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                  Palavras-chave encontradas
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {draftTopKeywords.map((keyword) => (
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
            onClick={() => setShowDraftFull((v) => !v)}
            className="self-start text-[13px] font-medium text-[#0F4D4A] underline-offset-2 hover:underline"
          >
            {showDraftFull ? "Ocultar perfil completo" : "Ver perfil completo por categoria"}
          </button>
          {showDraftFull && <MarketProfileView keywords={draftProfile.keywords} />}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={confirmTarget}
            disabled={editingConfirm || confirming || identified.targetRole.trim().length === 0}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            {confirming ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Salvando seu alvo…
              </span>
            ) : (
              "Esse é o meu alvo — salvar"
            )}
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

      <UpgradeModal
        open={step === "limit_reached"}
        onClose={() => setStep("jobs")}
        toolType="headline"
      />
    </div>
  );
}
