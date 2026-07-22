"use client";

import { Zap, Sparkles, Globe2, Lock } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

const BENEFITS = [
  {
    icon: Zap,
    title: "Score em segundos",
    description: "Avaliamos sua headline contra o que recrutadores internacionais realmente buscam.",
  },
  {
    icon: Sparkles,
    title: "Reescrita profissional por IA",
    description: "Você vê a versão melhorada lado a lado com a original — antes e depois.",
  },
  {
    icon: Globe2,
    title: "Calibrado para o mercado em dólar",
    description: "Keywords, clareza de impacto e prontidão para vagas remotas internacionais.",
  },
];

interface Props {
  onStart: () => void;
}

export function HeadlineValueProp({ onStart }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF8]">
      <div className="mx-auto flex w-full max-w-[480px] flex-col px-5 pb-16 pt-8">
        <div className="flex justify-center">
          <Wordmark />
        </div>

        <div className="mt-8 text-center">
          <h1 className="text-balance text-[26px] font-semibold leading-[1.15] tracking-[-0.025em] text-[#161618]">
            Sua headline está pronta para vagas em dólar?
          </h1>
          <p className="mt-4 text-[15px] leading-[1.55] text-[#5C5C60]">
            Envie um print do seu LinkedIn e receba um score + reescrita profissional por IA — de graça, em menos de 30 segundos.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {BENEFITS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF1EF]">
                <Icon className="h-5 w-5 text-[#0F4D4A]" />
              </div>
              <div>
                <p className="text-[14.5px] font-semibold text-[#1B1B1E]">{title}</p>
                <p className="mt-0.5 text-[13.5px] leading-[1.5] text-[#6E6E72]">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={onStart}
            className="w-full rounded-xl bg-[#0F4D4A] py-3.5 text-[15px] font-semibold text-[#FBFEFD] transition-colors hover:bg-[#0B3F3C] active:bg-[#0B3F3C]"
          >
            Fazer minha análise gratuita
          </button>

          <div className="flex items-center justify-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-[#A0A09B]" />
            <p className="text-[12px] text-[#A0A09B]">
              Seu print não é compartilhado com ninguém.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
