import type { ReactNode } from "react";

interface ResultsGridProps {
  eyebrow: string;
  scoreCard: ReactNode;
  headlineCard: ReactNode;
}

/**
 * Grid de 2 colunas (Score + Headline) usado tanto pela banda de exemplo
 * estática quanto pelo resultado real — mesmo layout, dados diferentes.
 * Empilha em coluna única abaixo de 720px.
 */
export function ResultsGrid({ eyebrow, scoreCard, headlineCard }: ResultsGridProps) {
  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-12 sm:px-10 sm:py-16">
      <p className="mb-[18px] text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#A0A09B]">
        {eyebrow}
      </p>
      <div className="grid grid-cols-1 items-stretch gap-[18px] min-[720px]:grid-cols-2">
        {scoreCard}
        {headlineCard}
      </div>
    </div>
  );
}
