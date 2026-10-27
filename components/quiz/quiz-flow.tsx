"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import {
  AREA_OPTIONS,
  APPLIED_OPTIONS,
  BLOCKER_OPTIONS,
  ENGLISH_OPTIONS,
  GOAL_OPTIONS,
  JUNIOR_NOTE,
  SENIORITY_OPTIONS,
  appliedBenefit,
  blockerBenefit,
  englishBenefit,
  type QuizAnswers,
  type QuizBenefit,
  type QuizOption,
  type QuizResult,
} from "@/lib/quiz";

type QuestionKey = keyof QuizAnswers;

type Step =
  | { kind: "intro" }
  | { kind: "question"; key: QuestionKey; title: string; options: QuizOption<string>[] }
  | { kind: "benefit"; id: string; benefit: QuizBenefit }
  | { kind: "result" }
  | { kind: "done" };

const QUESTIONS: Record<QuestionKey, { title: string; options: QuizOption<string>[] }> = {
  area: { title: "Qual é a sua área?", options: AREA_OPTIONS },
  seniority: { title: "Quanto tempo de experiência você tem?", options: SENIORITY_OPTIONS },
  english: { title: "Como está o seu inglês?", options: ENGLISH_OPTIONS },
  applied: { title: "Você já aplicou pra vaga de fora?", options: APPLIED_OPTIONS },
  blocker: { title: "O que mais te trava hoje?", options: BLOCKER_OPTIONS },
  goal: { title: "O que mais te atrai numa vaga de fora?", options: GOAL_OPTIONS },
};
const QUESTION_ORDER: QuestionKey[] = ["area", "seniority", "english", "applied", "blocker", "goal"];

const LOGIN_HREF = `/login?next=${encodeURIComponent("/dashboard")}`;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Monta a sequência de telas a partir das respostas já dadas. */
function buildSteps(a: Partial<QuizAnswers>): Step[] {
  const q = (key: QuestionKey): Step => ({ kind: "question", key, ...QUESTIONS[key] });
  const steps: Step[] = [{ kind: "intro" }, q("area"), q("seniority")];
  if (a.seniority === "junior") steps.push({ kind: "benefit", id: "junior", benefit: JUNIOR_NOTE });
  steps.push(q("english"));
  if (a.english) steps.push({ kind: "benefit", id: "english", benefit: englishBenefit(a.english) });
  steps.push(q("applied"));
  if (a.applied) steps.push({ kind: "benefit", id: "applied", benefit: appliedBenefit(a.applied) });
  steps.push(q("blocker"));
  if (a.blocker) steps.push({ kind: "benefit", id: "blocker", benefit: blockerBenefit(a.blocker) });
  steps.push(q("goal"), { kind: "result" }, { kind: "done" });
  return steps;
}

export function QuizFlow() {
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const utm = useRef<Record<string, string>>({});

  const steps = useMemo(() => buildSteps(answers), [answers]);
  const step = steps[Math.min(index, steps.length - 1)];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.forEach((v, k) => {
      if (k.startsWith("utm_")) utm.current[k] = v;
    });
    track("quiz_viewed", utm.current);
  }, []);

  // Busca o mini-resultado assim que a área é respondida, pra ele já estar
  // pronto quando a pessoa chegar no fim (sem tela de loading).
  useEffect(() => {
    if (!answers.area) return;
    let cancelled = false;
    setResult(null);
    fetch("/api/quiz/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area: answers.area }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: QuizResult | null) => {
        if (!cancelled && data) setResult(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [answers.area]);

  useEffect(() => {
    if (step.kind === "result") track("quiz_result_viewed", { area: answers.area, source: result?.source });
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind, index]);

  const next = () => setIndex((i) => i + 1);
  const back = () => setIndex((i) => Math.max(0, i - 1));

  function answer(key: QuestionKey, value: string) {
    track("quiz_answered", { question: key, value });
    setAnswers((prev) => ({ ...prev, [key]: value }));
    next();
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      setEmailError("Confere o e-mail, parece que falta alguma coisa.");
      return;
    }
    setEmailError(null);
    setSending(true);
    try {
      await fetch("/api/quiz/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, answers, utm: utm.current }),
      });
    } catch {
      // Mesmo padrão do gate de e-mail: falha nossa não trava a pessoa.
    }
    track("quiz_email_submitted", { area: answers.area, source: result?.source });
    setSending(false);
    next();
  }

  const answeredCount = QUESTION_ORDER.filter((k) => answers[k]).length;
  const progress =
    step.kind === "intro" ? 0 : step.kind === "result" || step.kind === "done" ? 1 : answeredCount / QUESTION_ORDER.length;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col px-5 pb-8 pt-5">
      <header className="flex items-center gap-3">
        {index > 0 && step.kind !== "done" ? (
          <button
            type="button"
            onClick={back}
            aria-label="Voltar"
            className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-xl text-tinta/70 hover:bg-tinta/5"
          >
            ‹
          </button>
        ) : (
          <span className="h-9 w-9" />
        )}
        <span className="flex-1 text-center font-display text-[22px] font-black tracking-[-0.02em]">GlobeJobbers</span>
        <span className="h-9 w-9" />
      </header>

      {step.kind !== "intro" && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full border-2 border-tinta bg-papel-card">
          <div className="h-full bg-laranja transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}

      <section className="flex flex-1 flex-col pt-8">
        {step.kind === "intro" && (
          <div className="flex flex-1 flex-col">
            <p className="font-spacemono text-[12.5px] uppercase tracking-wide text-tinta/60">6 perguntas · 1 minuto</p>
            <h1 className="mt-3 font-display text-[40px] font-black leading-[1.02] tracking-[-0.03em]">
              Você está pronto pra <span className="text-laranja">vaga em dólar?</span>
            </h1>
            <p className="mt-4 text-[17px] leading-[1.55] text-tinta/80">
              Responde rapidinho e no fim você vê como o seu cargo se chama lá fora e o que as vagas mais pedem.
            </p>
            <div className="mt-auto pt-10">
              <PrimaryButton
                onClick={() => {
                  track("quiz_started", utm.current);
                  next();
                }}
              >
                Começar →
              </PrimaryButton>
            </div>
          </div>
        )}

        {step.kind === "question" && (
          <div>
            <h2 className="font-display text-[30px] font-black leading-[1.08] tracking-[-0.02em]">{step.title}</h2>
            <div className="mt-6 flex flex-col gap-3">
              {step.options.map((o) => {
                const selected = answers[step.key] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => answer(step.key, o.value)}
                    className={`w-full rounded-[18px] border-2 border-tinta px-5 py-4 text-left text-[16.5px] font-medium transition-[transform,box-shadow] duration-100 active:translate-x-0 active:translate-y-0 ${
                      selected ? "bg-amarelo shadow-dura" : "bg-papel-card hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-dura"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step.kind === "benefit" && (
          <div className="flex flex-1 flex-col">
            <div className="rounded-[24px] border-2 border-tinta bg-papel-card p-6 shadow-dura">
              <p className="font-spacemono text-[12px] uppercase tracking-wide text-gj-teal">{step.benefit.eyebrow ?? "Como o GlobeJobbers ajuda"}</p>
              <h2 className="mt-3 font-display text-[27px] font-black leading-[1.1] tracking-[-0.02em]">{step.benefit.title}</h2>
              <p className="mt-3 text-[16.5px] leading-[1.6] text-tinta/80">{step.benefit.body}</p>
            </div>
            <div className="mt-auto pt-10">
              <PrimaryButton onClick={next}>Continuar</PrimaryButton>
            </div>
          </div>
        )}

        {step.kind === "result" && (
          <div>
            <p className="font-spacemono text-[12.5px] uppercase tracking-wide text-tinta/60">Sua prévia</p>
            <ResultBlock result={result} other={answers.area === "other"} />

            <form onSubmit={submitEmail} className="mt-8 rounded-[24px] border-2 border-tinta bg-papel-card p-6 shadow-dura">
              <h3 className="font-display text-[24px] font-black leading-[1.12] tracking-[-0.02em]">
                Quer o diagnóstico completo do seu perfil?
              </h3>
              <p className="mt-2 text-[15.5px] leading-[1.55] text-tinta/80">
                Te mando o link pra abrir no computador, onde fica bem mais fácil subir o PDF do seu LinkedIn.
              </p>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-5 w-full rounded-full border-2 border-tinta bg-papel px-5 py-3.5 text-[16px] outline-none focus:shadow-dura-sm"
              />
              {emailError && <p className="mt-2 text-[14px] text-terracota">{emailError}</p>}
              <div className="mt-4">
                <PrimaryButton type="submit" disabled={sending}>
                  {sending ? "Enviando..." : "Me manda o link"}
                </PrimaryButton>
              </div>
              <p className="mt-3 text-center text-[13px] text-tinta/60">Só o link do diagnóstico. Sem spam.</p>
            </form>

            <Link
              href={LOGIN_HREF}
              onClick={() => track("quiz_continue_clicked", { from: "result" })}
              className="mt-6 block text-center text-[15px] font-medium text-tinta/70 underline-offset-4 hover:underline"
            >
              Prefiro continuar agora no celular →
            </Link>
          </div>
        )}

        {step.kind === "done" && (
          <div className="flex flex-1 flex-col">
            <h2 className="font-display text-[36px] font-black leading-[1.05] tracking-[-0.03em]">
              Pronto! <span className="text-laranja">Te mandei o link.</span>
            </h2>
            <p className="mt-4 text-[17px] leading-[1.55] text-tinta/80">
              Abre o e-mail no computador quando puder. Se não chegar em alguns minutos, dá uma olhada no spam ou na aba
              Promoções.
            </p>
            <div className="mt-auto pt-10">
              <Link
                href={LOGIN_HREF}
                onClick={() => track("quiz_continue_clicked", { from: "done" })}
                className="flex w-full items-center justify-center rounded-full border-2 border-tinta bg-papel-card px-7 py-4 text-base font-bold text-tinta"
              >
                Ou entra agora com o Google
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ResultBlock({ result, other }: { result: QuizResult | null; other: boolean }) {
  if (other) {
    return (
      <>
        <h2 className="mt-3 font-display text-[30px] font-black leading-[1.08] tracking-[-0.02em]">
          O primeiro passo é descobrir o nome do seu cargo lá fora
        </h2>
        <p className="mt-3 text-[16.5px] leading-[1.6] text-tinta/80">
          No GlobeJobbers você digita o seu cargo e o Market Intelligence lê vagas reais pra mostrar como o mercado de fora
          chama essa função e o que mais pede.
        </p>
      </>
    );
  }
  if (!result) {
    return <p className="mt-6 text-[16px] text-tinta/60">Montando sua prévia...</p>;
  }
  const market = result.source === "market";
  return (
    <>
      <h2 className="mt-3 font-display text-[30px] font-black leading-[1.08] tracking-[-0.02em]">
        Lá fora, o seu cargo costuma se chamar
      </h2>
      <ul className="mt-5 flex flex-col gap-2.5">
        {result.titles.map((t) => (
          <li
            key={t.term}
            className="flex items-center justify-between gap-3 rounded-[16px] border-2 border-tinta bg-papel-card px-4 py-3"
          >
            <span className="text-[16.5px] font-bold">{t.term}</span>
            {market && t.percent !== undefined && (
              <span className="shrink-0 font-spacemono text-[12.5px] text-tinta/60">{Math.round(t.percent)}% das vagas</span>
            )}
          </li>
        ))}
      </ul>
      {result.skills.length > 0 && (
        <>
          <h3 className="mt-7 font-display text-[22px] font-black tracking-[-0.02em]">E o que as vagas mais pedem</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.skills.map((s) => (
              <span key={s.term} className="rounded-full border-2 border-tinta bg-papel-card px-3.5 py-1.5 text-[14.5px] font-medium">
                {s.term}
                {market && s.percent !== undefined ? ` · ${Math.round(s.percent)}%` : ""}
              </span>
            ))}
          </div>
        </>
      )}
      <p className="mt-4 font-spacemono text-[12px] leading-[1.5] text-tinta/55">
        {market
          ? `Baseado em ${result.jobsAnalyzed} vagas reais analisadas pelo Market Intelligence.`
          : "Nomes e skills que costumam aparecer nas vagas remotas de fora. A análise com vagas reais fica no GlobeJobbers."}
      </p>
    </>
  );
}

function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center rounded-full border-2 border-tinta bg-tinta px-7 py-4 text-base font-bold text-papel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-dura-laranja active:translate-x-0 active:translate-y-0 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
