"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Loader2, Mic } from "lucide-react";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import {
  InterviewAnswerFeedbackView,
  InterviewPrepResultView,
} from "@/components/tools/interview-prep-result";
import { SpeechAnswerField } from "@/components/tools/speech-answer-field";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import {
  INTERVIEW_QUESTION_CATEGORY_LABELS,
  type InterviewAnswerFeedback,
  type InterviewPrepResult,
  type InterviewQuestion,
} from "@/lib/types";

type Step = "intro" | "starting" | "training" | "finishing" | "done" | "limit_reached";

// Espelha o servidor: vaga com menos que isso não ancora pergunta nenhuma.
const MIN_JOB_TEXT_CHARS = 200;

/** Título da vaga = primeira linha não-vazia (mesmo truque do Perfil de Mercado). */
function deriveJobTitle(text: string): string {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return (firstLine ?? "").slice(0, 80);
}

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Interview Prep — sessão de treino guiada (ver
 * claude/PROPOSTA-INTERVIEW-PREP.md): perguntas geradas do Perfil de
 * Mercado, resposta em INGLÊS, feedback em PORTUGUÊS, uma pergunta por
 * vez. O client orquestra start → answer (por pergunta) → finish (persiste
 * e consome 1 uso). Sessão vive aqui até o finish — sair da página no meio
 * perde o treino (aviso na UI).
 */
export default function InterviewPrepPage() {
  const [step, setStep] = useState<Step>("intro");
  const [error, setError] = useState<string | null>(null);

  const [typedRole, setTypedRole] = useState("");
  const [fromProfile, setFromProfile] = useState<boolean | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [marketLabel, setMarketLabel] = useState("");

  // Vaga específica (opcional): quando presente, as perguntas são ancoradas
  // NELA (o Perfil de Mercado vira contexto secundário). Mínimo espelha o
  // servidor — abaixo disso o texto é ignorado lá.
  const [jobUrl, setJobUrl] = useState("");
  const [jobText, setJobText] = useState("");
  const [importingJob, setImportingJob] = useState(false);
  const [jobImportError, setJobImportError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answerDraft, setAnswerDraft] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [answers, setAnswers] = useState<InterviewAnswerFeedback[]>([]);
  /** Feedback da pergunta atual (mostrado antes de avançar). */
  const [currentFeedback, setCurrentFeedback] = useState<InterviewAnswerFeedback | null>(null);

  const [finished, setFinished] = useState<InterviewPrepResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const jobActive = jobText.trim().length >= MIN_JOB_TEXT_CHARS;
  const jobTitle = jobActive ? deriveJobTitle(jobText) : "";

  async function handleImportJob() {
    const url = jobUrl.trim();
    if (!url) return;
    setImportingJob(true);
    setJobImportError(null);
    try {
      const res = await fetch("/api/job-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Não conseguimos ler essa página. Cole o texto da vaga.",
        );
      }
      setJobText(data.text as string);
      track("interview_prep_job_imported");
    } catch (err) {
      setJobImportError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setImportingJob(false);
    }
  }

  useEffect(() => {
    track("interview_prep_viewed");
    // Perfil de Mercado ativo? Define se o intro pede cargo ou já mostra o alvo.
    fetch("/api/market-profile")
      .then((res) => (res.ok ? res.json() : { profile: null }))
      .then((data) => setFromProfile(Boolean(data?.profile)))
      .catch(() => setFromProfile(false));
  }, []);

  async function handleStart() {
    setStep("starting");
    setError(null);
    track("interview_prep_started");
    try {
      const res = await fetch("/api/tools/interview-prep/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: typedRole, jobText: jobActive ? jobText : "" }),
      });
      const data = await safeJson(res);
      if (res.status === 403 && data.code === "PLAN_REQUIRED") {
        track("plan_required", { tool_type: "interview_prep" });
        window.location.assign("/assinatura");
        return;
      }
      if (res.status === 403 && data.code === "LIMIT_REACHED") {
        setStep("limit_reached");
        track("limit_reached", { tool_type: "interview_prep" });
        return;
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Não foi possível montar sua sessão.",
        );
      }
      setQuestions(data.questions as InterviewQuestion[]);
      setTargetRole(data.targetRole as string);
      setMarketLabel(data.marketLabel as string);
      setCurrent(0);
      setAnswers([]);
      setCurrentFeedback(null);
      setAnswerDraft("");
      setStep("training");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("intro");
      track("interview_prep_failed", { stage: "start" });
    }
  }

  async function handleAnswer() {
    const question = questions[current];
    if (!question) return;
    setEvaluating(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/interview-prep/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          answer: answerDraft,
          targetRole,
          marketLabel,
          jobText: jobActive ? jobText : "",
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Não foi possível avaliar sua resposta.",
        );
      }
      const feedback = data.feedback as InterviewAnswerFeedback;
      setCurrentFeedback(feedback);
      setAnswers((prev) => [...prev, feedback]);
      track("interview_prep_answer_evaluated", { index: current });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setEvaluating(false);
    }
  }

  function handleNext() {
    setCurrentFeedback(null);
    setAnswerDraft("");
    setError(null);
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      void handleFinish();
    }
  }

  function handleSkip() {
    setCurrentFeedback(null);
    setAnswerDraft("");
    setError(null);
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else if (answers.length > 0) {
      void handleFinish();
    } else {
      // Pulou tudo: sem resposta não há sessão a salvar.
      setStep("intro");
    }
  }

  async function handleFinish() {
    if (answers.length === 0) return;
    setStep("finishing");
    setError(null);
    try {
      const res = await fetch("/api/tools/interview-prep/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole,
          marketLabel,
          jobTitle: jobActive ? jobTitle : null,
          questions,
          answers,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Não foi possível salvar sua sessão.",
        );
      }
      setFinished({
        kind: "interview_prep",
        targetRole,
        targetMarketLabel: marketLabel,
        jobTitle: jobActive ? jobTitle : null,
        questions,
        answers,
      });
      setRemaining((data.usage as { remaining?: number } | undefined)?.remaining ?? null);
      setStep("done");
      track("interview_prep_completed", { answered: answers.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setStep("training");
    }
  }

  const question = questions[current];
  const canStart = fromProfile === true || typedRole.trim().length >= 2;

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161618]">
          Interview Prep
        </h1>
        <p className="mt-1 text-[14.5px] leading-[1.6] text-[#6E6E72]">
          Treine com as perguntas que o <strong className="font-semibold text-[#1B1B1E]">seu</strong>{" "}
          mercado faz de verdade. Você responde em inglês, como na entrevista —
          o feedback vem em português.
        </p>
      </div>

      {(step === "intro" || step === "limit_reached") && (
        <>
          <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
              Como funciona
            </p>
            <ul className="flex flex-col gap-2.5">
              {[
                "6 perguntas prováveis pro seu cargo-alvo — geradas das skills e responsabilidades que as vagas reais pedem",
                "Você responde em inglês FALANDO no microfone (a transcrição aparece na tela) ou digitando — uma pergunta por vez, pule as que quiser",
                "Feedback em português: clareza, evidência, inglês corrigido e red flags",
                "E a versão que o candidato ideal falaria — usando só os SEUS fatos, nunca inventados",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-[14px] leading-[1.55] text-[#3F3F43]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0F4D4A]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {fromProfile === false && (
            <div className="flex flex-col gap-2">
              <label htmlFor="ip-role" className="text-sm font-medium text-[#1B1B1E]">
                Cargo que você quer treinar
              </label>
              <input
                id="ip-role"
                value={typedRole}
                onChange={(e) => setTypedRole(e.target.value)}
                placeholder="Ex.: Product Designer"
                className="rounded-lg border border-[#E2E2DC] px-3 py-2 text-[14px] text-[#1B1B1E] outline-none focus:border-[#0F4D4A]"
              />
              <p className="text-[12.5px] leading-[1.5] text-[#A0A09B]">
                Dica: com o Perfil de Mercado criado (cole suas vagas na aba
                Headline do LinkedIn Review), as perguntas saem ancoradas nas
                SUAS vagas reais.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
            <p className="text-[14.5px] font-semibold text-[#1B1B1E]">
              Tem entrevista marcada?{" "}
              <span className="font-normal text-[#8A8A85]">(opcional)</span>
            </p>
            <p className="mt-1 text-[13px] leading-[1.55] text-[#6E6E72]">
              Cole a vaga e as perguntas saem sob medida <strong className="font-semibold">pra
              essa entrevista</strong> — não só pro cargo em geral.
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleImportJob();
                  }
                }}
                placeholder="Link da vaga (Greenhouse, Lever, site da empresa…)"
                inputMode="url"
                disabled={importingJob}
                className="min-w-0 flex-1 rounded-lg border border-[#E2E2DC] px-3 py-2 text-[13.5px] text-[#1B1B1E] outline-none focus:border-[#0F4D4A]"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleImportJob}
                disabled={importingJob || jobUrl.trim().length === 0}
                className="shrink-0 border-[#D8E5E2] text-[#0F4D4A] hover:bg-[#F4F8F7]"
              >
                {importingJob ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Importando…
                  </span>
                ) : (
                  "Importar"
                )}
              </Button>
            </div>
            {jobImportError && (
              <p className="mt-2 text-[13px] leading-[1.5] text-[#A0522D]">{jobImportError}</p>
            )}

            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="…ou cole aqui a descrição da vaga (título, responsabilidades, requisitos)"
              rows={5}
              disabled={importingJob}
              className="mt-2 w-full resize-y rounded-lg border border-[#E2E2DC] px-3 py-2 text-[13.5px] leading-[1.55] text-[#1B1B1E] outline-none focus:border-[#0F4D4A]"
            />
            {jobText.trim().length > 0 &&
              (jobActive ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#0F4D4A]">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Vaga carregada — o treino vai mirar em &ldquo;{jobTitle}&rdquo;
                </p>
              ) : (
                <p className="mt-1.5 text-[12.5px] text-[#A0A09B]">
                  Cole a descrição completa (mínimo ~{MIN_JOB_TEXT_CHARS} caracteres) — texto
                  curto demais não dá âncora pras perguntas.
                </p>
              ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleStart}
            disabled={!canStart || fromProfile === null}
            className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
          >
            <Mic className="mr-2 h-4 w-4" />
            {jobActive ? "Começar o treino pra essa vaga" : "Começar o treino"}
          </Button>
        </>
      )}

      {step === "starting" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#0F4D4A]" aria-hidden />
          <p className="text-[14px] font-medium text-[#0F4D4A]">
            Montando suas perguntas a partir do seu mercado…
          </p>
        </div>
      )}

      {step === "training" && question && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[#8A8A85]">
              Pergunta {current + 1} de {questions.length}
            </p>
            <span className="rounded-full bg-[#EFEFE9] px-2.5 py-1 text-[11.5px] font-semibold text-[#6E6E72]">
              {INTERVIEW_QUESTION_CATEGORY_LABELS[question.category]}
            </span>
          </div>
          {jobActive && (
            <p className="-mt-2 truncate text-[12.5px] text-[#0F4D4A]">
              <span className="font-semibold">Treinando pra:</span> {jobTitle}
            </p>
          )}

          <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
            <p className="text-[17px] font-semibold leading-[1.45] text-[#1B1B1E]">
              {question.question}
            </p>
            <p className="mt-2 text-[12.5px] leading-[1.55] text-[#8A8A85]">
              <span className="font-semibold">Por que essa pergunta:</span> {question.why}
            </p>
          </div>

          {!currentFeedback && (
            <>
              <SpeechAnswerField
                value={answerDraft}
                onChange={setAnswerDraft}
                disabled={evaluating}
                placeholder="Answer in English — speak it out loud with the mic, or type…"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleAnswer}
                  disabled={answerDraft.trim().length < 40 || evaluating}
                  className="flex-1 bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
                >
                  {evaluating ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Avaliando sua resposta…
                    </span>
                  ) : (
                    "Enviar resposta"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={evaluating}
                  className="text-[13.5px] font-medium text-[#8A8A85] underline-offset-2 hover:text-[#3F3F43] hover:underline"
                >
                  Pular
                </button>
              </div>
            </>
          )}

          {currentFeedback && (
            <>
              <InterviewAnswerFeedbackView item={currentFeedback} index={current} />
              <Button
                onClick={handleNext}
                className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
              >
                {current + 1 < questions.length ? "Próxima pergunta" : "Encerrar e salvar o treino"}
              </Button>
            </>
          )}

          {answers.length > 0 && !currentFeedback && (
            <button
              type="button"
              onClick={handleFinish}
              className="mx-auto text-[13px] text-[#8A8A85] underline-offset-2 hover:text-[#3F3F43] hover:underline"
            >
              Encerrar o treino agora ({answers.length} resposta
              {answers.length === 1 ? "" : "s"})
            </button>
          )}
          <p className="text-center text-[11.5px] text-[#B5B5B0]">
            A sessão é salva no Histórico quando você encerra — sair da página
            antes disso perde o treino.
          </p>
        </div>
      )}

      {step === "finishing" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#0F4D4A]" aria-hidden />
          <p className="text-[14px] font-medium text-[#0F4D4A]">Salvando sua sessão…</p>
        </div>
      )}

      <UpgradeModal
        open={step === "limit_reached"}
        onClose={() => setStep("intro")}
        toolType="interview_prep"
      />

      {step === "done" && finished && (
        <div className="flex flex-col gap-4">
          <InterviewPrepResultView result={finished} />
          {remaining !== null && (
            <p className="text-center text-[13px] text-[#8A8A85]">
              {remaining} sessão{remaining === 1 ? "" : "s"} restante{remaining === 1 ? "" : "s"} este mês
            </p>
          )}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => {
                setStep("intro");
                setFinished(null);
                setQuestions([]);
                setAnswers([]);
              }}
              className="text-sm text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
            >
              Treinar de novo
            </button>
            <Link
              href="/history"
              className="text-sm font-medium text-[#0F4D4A] underline-offset-2 hover:underline"
            >
              Ver no histórico
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
