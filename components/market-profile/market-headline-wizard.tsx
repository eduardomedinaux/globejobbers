"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { MarketProfileView } from "@/components/market-profile/market-profile-view";
import { HeadlineMarketResultView } from "@/components/market-profile/headline-market-result";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import {
  TARGET_MARKET_OPTIONS,
  type HeadlineLanguage,
  type MarketHeadlineResult,
  type MarketProfile,
  type MarketProfileTarget,
  type TargetMarket,
} from "@/lib/types";

type Step =
  | "target" // Passo 1: alvo de carreira
  | "jobs" // Passo 2: vagas desejadas
  | "extracting" // chamada /api/market-profile
  | "confirm" // Passo 3: Perfil de Mercado + confirmação de especialidades
  | "generating" // chamada /api/tools/headline (mode market)
  | "result"
  | "limit_reached";

const SENIORITY_OPTIONS = ["Júnior", "Pleno", "Sênior", "Especialista/Staff", "Liderança"];

// Espelha MIN_JOB_TEXT_LENGTH do servidor — validar aqui evita o roundtrip,
// o servidor revalida de qualquer forma.
const MIN_JOB_TEXT_LENGTH = 300;

const EMPTY_TARGET: MarketProfileTarget = {
  currentRole: "",
  targetRole: "",
  targetMarket: "us_remote",
  seniority: SENIORITY_OPTIONS[1],
  language: "en",
};

/**
 * Wizard da metodologia (ver PROPOSTA-PERFIL-DE-MERCADO.md): a headline é
 * construída de fora pra dentro — Alvo → Vagas desejadas → Perfil de
 * Mercado (confirmação) → headline. O usuário nunca digita as próprias
 * especialidades; elas são inferidas das vagas e apenas confirmadas.
 */
export function MarketHeadlineWizard() {
  const [step, setStep] = useState<Step>("target");
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<MarketProfileTarget>(EMPTY_TARGET);
  const [jobs, setJobs] = useState<string[]>([""]);
  const [profile, setProfile] = useState<MarketProfile | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [result, setResult] = useState<MarketHeadlineResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  function updateTarget<K extends keyof MarketProfileTarget>(key: K, value: MarketProfileTarget[K]) {
    setTarget((prev) => ({ ...prev, [key]: value }));
  }

  const targetComplete =
    target.currentRole.trim().length > 0 &&
    target.targetRole.trim().length > 0 &&
    target.seniority.trim().length > 0;

  const filledJobs = jobs.map((j) => j.trim()).filter((j) => j.length > 0);
  const shortJobIndex = jobs.findIndex(
    (j) => j.trim().length > 0 && j.trim().length < MIN_JOB_TEXT_LENGTH,
  );

  async function createProfile(synthetic: boolean) {
    setStep("extracting");
    setError(null);
    track("market_profile_started", {
      origin: synthetic ? "synthetic" : "jobs",
      jobs: synthetic ? 0 : filledJobs.length,
    });

    try {
      const res = await fetch("/api/market-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, jobs: synthetic ? [] : filledJobs, synthetic }),
      });
      const data = await res.json();

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
      // Chips começam TODOS selecionados — confirmar é desmarcar o que não
      // encaixa, não construir do zero.
      setSelectedSpecialties(created.inferredSpecialties);
      setStep("confirm");
      track("market_profile_created", {
        origin: created.origin,
        specialties: created.inferredSpecialties.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("jobs");
      track("market_profile_failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  async function generateHeadline() {
    if (!profile) return;
    setStep("generating");
    setError(null);

    try {
      const res = await fetch("/api/tools/headline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "market",
          marketProfileId: profile.id,
          confirmedSpecialties: selectedSpecialties,
        }),
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

      setResult(data.analysis as MarketHeadlineResult);
      setRemaining(data.usage?.remaining ?? null);
      setStep("result");
      track("market_headline_generated", { origin: profile.origin });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("confirm");
    }
  }

  function toggleSpecialty(specialty: string) {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty) ? prev.filter((s) => s !== specialty) : [...prev, specialty],
    );
  }

  function handleReset() {
    setStep("target");
    setError(null);
    setTarget(EMPTY_TARGET);
    setJobs([""]);
    setProfile(null);
    setSelectedSpecialties([]);
    setResult(null);
  }

  const stepIndicator =
    step === "target" ? "Passo 1 de 3 — Seu alvo" :
    step === "jobs" ? "Passo 2 de 3 — Vagas que você quer" :
    step === "confirm" ? "Passo 3 de 3 — Seu Perfil de Mercado" : null;

  return (
    <div className="flex flex-col gap-6">
      {stepIndicator && (
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-[#0F4D4A]">
          {stepIndicator}
        </p>
      )}

      {step === "target" && (
        <>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-currentRole">Cargo/área atual</Label>
              <Input
                id="mp-currentRole"
                value={target.currentRole}
                onChange={(e) => updateTarget("currentRole", e.target.value)}
                placeholder="Ex.: Product Designer"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-targetRole">Cargo/área desejada</Label>
              <Input
                id="mp-targetRole"
                value={target.targetRole}
                onChange={(e) => updateTarget("targetRole", e.target.value)}
                placeholder="Ex.: Senior Product Designer"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-market">Mercado-alvo</Label>
              <select
                id="mp-market"
                value={target.targetMarket}
                onChange={(e) => updateTarget("targetMarket", e.target.value as TargetMarket)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TARGET_MARKET_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-seniority">Senioridade</Label>
              <select
                id="mp-seniority"
                value={target.seniority}
                onChange={(e) => updateTarget("seniority", e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {SENIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mp-language">Idioma da headline</Label>
              <select
                id="mp-language"
                value={target.language}
                onChange={(e) => updateTarget("language", e.target.value as HeadlineLanguage)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="en">Inglês (recomendado pro mercado internacional)</option>
                <option value="pt">Português (termos técnicos ficam em inglês)</option>
              </select>
            </div>
          </div>

          <Button
            onClick={() => {
              setError(null);
              setStep("jobs");
            }}
            disabled={!targetComplete}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            Continuar
          </Button>
        </>
      )}

      {step === "jobs" && (
        <>
          <div className="rounded-xl bg-[#EAF1EF] px-4 py-3 text-[13px] leading-[1.55] text-[#0F4D4A]">
            Cole de 1 a 3 descrições de vagas que você <strong>quer conquistar</strong>. É delas
            que extraímos as palavras-chave que recrutadores desse mercado buscam — sua headline
            nasce do mercado, não de um chute.
          </div>

          <div className="flex flex-col gap-4">
            {jobs.map((job, index) => (
              <div key={index} className="flex flex-col gap-2">
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
                <Textarea
                  id={`mp-job-${index}`}
                  value={job}
                  onChange={(e) =>
                    setJobs((prev) => prev.map((j, i) => (i === index ? e.target.value : j)))
                  }
                  placeholder="Cole a descrição completa da vaga (título, requisitos, responsabilidades)…"
                  rows={7}
                />
              </div>
            ))}
          </div>

          {jobs.length < 3 && (
            <button
              type="button"
              onClick={() => setJobs((prev) => [...prev, ""])}
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
            onClick={() => createProfile(false)}
            disabled={filledJobs.length === 0 || shortJobIndex !== -1}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            Analisar {filledJobs.length === 1 ? "a vaga" : `as ${filledJobs.length} vagas`}
          </Button>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep("target")}
              className="text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => createProfile(true)}
              className="text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
            >
              Não tenho vagas agora
            </button>
          </div>
        </>
      )}

      {step === "extracting" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-[14px] font-medium text-[#0F4D4A]">
            Mapeando as palavras-chave do seu mercado-alvo…
          </p>
          <p className="text-[13px] text-[#8A8A85]">
            Competências, ferramentas, responsabilidades e termos ATS das vagas que você quer.
          </p>
        </div>
      )}

      {step === "confirm" && profile && (
        <>
          <MarketProfileView
            profile={profile}
            selectedSpecialties={selectedSpecialties}
            onToggleSpecialty={toggleSpecialty}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={generateHeadline}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            Gerar minha headline para esse mercado
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
            Começar de novo com outro alvo
          </button>
        </div>
      )}
    </div>
  );
}
