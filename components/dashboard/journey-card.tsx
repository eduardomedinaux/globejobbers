import Link from "next/link";
import { Check } from "lucide-react";
import { JOURNEY_READY_SCORE, type JourneyStatus } from "@/lib/journey";
import { cn } from "@/lib/utils";

// A jornada do dashboard (19/set): a história do produto em 5 passos, no
// estilo "getting started" — check riscado quando FEITO (verificado no
// banco), CTA só no passo atual. Nada deve fazer o usuário pensar: cada
// linha diz o que fazer e onde. Some sozinha quando os 5 estão completos.

interface JourneyStep {
  label: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
}

export function JourneyCard({
  hasTarget,
  status,
}: {
  hasTarget: boolean;
  status: JourneyStatus;
}) {
  const linkedinReady =
    status.latestReviewScore !== null && status.latestReviewScore >= JOURNEY_READY_SCORE;

  const steps: JourneyStep[] = [
    {
      label: "Escolha seu alvo",
      description: "Cole as vagas que você quer conquistar — elas guiam todo o resto.",
      href: "/tools/market-intel?tab=alvo",
      cta: "Definir alvo",
      done: hasTarget,
    },
    {
      label: "Analise seu LinkedIn",
      description: "Rode o Review: seu perfil em 8 categorias, avaliado contra o seu alvo.",
      href: "/tools/linkedin-review",
      cta: "Rodar o Review",
      done: status.hasReview,
    },
    {
      label: "Deixe seu LinkedIn no ponto",
      description: `Aplique as caixas do Review no seu perfil e rode de novo — meta: score ${JOURNEY_READY_SCORE}+.${
        status.latestReviewScore !== null && !linkedinReady
          ? ` Você está em ${status.latestReviewScore}.`
          : ""
      }`,
      href: "/tools/linkedin-review",
      cta: "Continuar ajustes",
      done: linkedinReady,
    },
    {
      label: "Deixe seu CV no ponto",
      description: "Adapte seu currículo pra uma vaga real com o CV Tailor.",
      href: "/tools/cv-tailor",
      cta: "Adaptar CV",
      done: status.hasCvTailor,
    },
    {
      label: "Prepare-se pra entrevista",
      description: "Treine falando em inglês no microfone — o feedback vem em português.",
      href: "/tools/interview-prep",
      cta: "Treinar agora",
      done: status.hasInterviewPrep,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[15.5px] font-semibold text-[#1B1B1E]">Sua jornada pro dólar</p>
          <p className="mt-0.5 text-[13px] leading-[1.5] text-[#8A8A85]">
            Siga na ordem — cada passo alimenta o próximo.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#EAF1EF] px-2.5 py-1 text-[12px] font-semibold text-[#0F4D4A]">
          {doneCount} de {steps.length}
        </span>
      </div>

      <ol className="mt-4 flex flex-col">
        {steps.map((step, i) => {
          const isCurrent = i === currentIndex;
          return (
            <li
              key={step.label}
              className={cn(
                "flex items-center gap-3 border-t border-[#F0F0EA] py-3 first:border-t-0",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                  step.done
                    ? "bg-[#0F4D4A] text-white"
                    : isCurrent
                      ? "border-2 border-[#0F4D4A] text-[#0F4D4A]"
                      : "border border-[#D8D8D2] text-[#A0A09B]",
                )}
              >
                {step.done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[14px] font-semibold",
                    step.done ? "text-[#A0A09B] line-through" : "text-[#1B1B1E]",
                  )}
                >
                  {step.label}
                </p>
                {!step.done && (
                  <p className="mt-0.5 text-[12.5px] leading-[1.5] text-[#8A8A85]">
                    {step.description}
                  </p>
                )}
              </div>

              {isCurrent ? (
                <Link
                  href={step.href}
                  className="shrink-0 rounded-lg bg-[#0F4D4A] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#0B3F3C]"
                >
                  {step.cta}
                </Link>
              ) : (
                !step.done && (
                  <Link
                    href={step.href}
                    className="shrink-0 text-[13px] font-medium text-[#8A8A85] underline-offset-2 hover:text-[#0F4D4A] hover:underline"
                  >
                    {step.cta}
                  </Link>
                )
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
