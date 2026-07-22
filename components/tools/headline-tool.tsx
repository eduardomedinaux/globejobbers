"use client";

import { useEffect, useState } from "react";
import { ScoreMiniCard } from "@/components/score-mini-card";
import { HeadlineCard } from "@/components/headline-card";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import type { HeadlineAnalysisResult, HeadlineBuilderAnswers } from "@/lib/types";

type Mode = "text" | "builder";
type Step = "input" | "loading" | "result" | "limit_reached";

const SENIORITY_OPTIONS = ["Júnior", "Pleno", "Sênior", "Especialista/Staff", "Liderança"];

const EMPTY_ANSWERS: HeadlineBuilderAnswers = {
  currentRole: "",
  yearsOfExperience: 0,
  specialty: "",
  keySkills: [],
  targetIndustry: "",
  notableAchievement: "",
  seniorityLevel: SENIORITY_OPTIONS[1],
};

/**
 * Fluxo do otimizador de headline. Era a página /tools/headline; virou aba
 * dentro do LinkedIn Review (headline é uma seção do perfil, não uma
 * ferramenta irmã). Backend intocado: mesma rota /api/tools/headline, mesmo
 * limite de uso e mesmo tool_type no histórico.
 */
export function HeadlineTool() {
  const [mode, setMode] = useState<Mode>("text");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<HeadlineAnalysisResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [text, setText] = useState("");
  const [answers, setAnswers] = useState<HeadlineBuilderAnswers>(EMPTY_ANSWERS);
  const [skillsInput, setSkillsInput] = useState("");

  useEffect(() => {
    track("headline_tool_viewed");
  }, []);

  function updateAnswer<K extends keyof HeadlineBuilderAnswers>(key: K, value: HeadlineBuilderAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setStep("loading");
    setError(null);
    track("headline_analysis_started", { mode });

    const body =
      mode === "text"
        ? { mode: "text", text }
        : {
            mode: "builder",
            answers: {
              ...answers,
              keySkills: skillsInput
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            },
          };

    try {
      const res = await fetch("/api/tools/headline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      track("headline_score_viewed", { score: data.analysis.headlineScore, mode });
      track("headline_generated", { source: "tools_headline", score: data.analysis.headlineScore, mode });
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
    setAnswers(EMPTY_ANSWERS);
    setSkillsInput("");
  }

  const canSubmit =
    mode === "text"
      ? text.trim().length > 0
      : answers.currentRole.trim() &&
        answers.specialty.trim() &&
        answers.targetIndustry.trim() &&
        answers.notableAchievement.trim() &&
        skillsInput.trim().length > 0;

  return (
    <div className="flex flex-col gap-6">
      {(step === "input" || step === "limit_reached") && (
        <>
          <div className="flex gap-2 rounded-xl bg-[#F4F4F0] p-1">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`flex-1 rounded-lg py-2 text-[13.5px] font-medium transition-colors ${
                mode === "text" ? "bg-white text-[#0F4D4A] shadow-sm" : "text-[#6E6E72]"
              }`}
            >
              Já tenho uma headline
            </button>
            <button
              type="button"
              onClick={() => setMode("builder")}
              className={`flex-1 rounded-lg py-2 text-[13.5px] font-medium transition-colors ${
                mode === "builder" ? "bg-white text-[#0F4D4A] shadow-sm" : "text-[#6E6E72]"
              }`}
            >
              Não tenho headline pronta
            </button>
          </div>

          {mode === "text" ? (
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
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="currentRole">Cargo/área atual</Label>
                <Input
                  id="currentRole"
                  value={answers.currentRole}
                  onChange={(e) => updateAnswer("currentRole", e.target.value)}
                  placeholder="Ex.: Product Designer"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="yearsOfExperience">Anos de experiência</Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  min={0}
                  value={answers.yearsOfExperience}
                  onChange={(e) => updateAnswer("yearsOfExperience", Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="specialty">Especialidade/nicho</Label>
                <Input
                  id="specialty"
                  value={answers.specialty}
                  onChange={(e) => updateAnswer("specialty", e.target.value)}
                  placeholder="Ex.: Design de produto B2B SaaS"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="keySkills">Principais skills/ferramentas (separadas por vírgula)</Label>
                <Input
                  id="keySkills"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="Ex.: Figma, Design Systems, A/B testing"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="targetIndustry">Indústria-alvo</Label>
                <Input
                  id="targetIndustry"
                  value={answers.targetIndustry}
                  onChange={(e) => updateAnswer("targetIndustry", e.target.value)}
                  placeholder="Ex.: Fintech"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="notableAchievement">Uma conquista quantificável</Label>
                <Textarea
                  id="notableAchievement"
                  value={answers.notableAchievement}
                  onChange={(e) => updateAnswer("notableAchievement", e.target.value)}
                  placeholder="Ex.: Redesenhei o checkout e aumentei a conversão em 18%"
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="seniorityLevel">Nível de senioridade</Label>
                <select
                  id="seniorityLevel"
                  value={answers.seniorityLevel}
                  onChange={(e) => updateAnswer("seniorityLevel", e.target.value)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {SENIORITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
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
          <HeadlineCard original={analysis.headline.original} rewritten={analysis.headline.rewritten} revealed />
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
    </div>
  );
}
