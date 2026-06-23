import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HeadlineCardProps {
  original: string;
  rewritten: string;
  revealed: boolean;
  /** Pill opcional ao lado do label "Depois" (ex.: "+34 alcance"). */
  deltaLabel?: string;
  /** Overlay (gate de e-mail) renderizado sobre a caixa "Depois" enquanto !revealed. */
  children?: ReactNode;
}

const FOOTNOTE =
  "Reescrita no vocabulário que recrutadores internacionais buscam — cargo, stack e disponibilidade remota em primeiro plano.";

export function HeadlineCard({
  original,
  rewritten,
  revealed,
  deltaLabel,
  children,
}: HeadlineCardProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)] sm:p-[26px_28px]">
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.08em] text-[#A0A09B]">
        Headline reescrita
      </p>

      <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#B6B6B1]">
        Antes
      </p>
      <div className="mt-1.5 rounded-[10px] border border-[#EEEEE8] bg-[#FAFAF8] px-[14px] py-3 text-[15px] leading-[1.45] text-[#9A9A95]">
        {original}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#0F4D4A]">
          Depois
        </p>
        {deltaLabel && (
          <span className="rounded-full bg-[#EAF1EF] px-2 py-0.5 text-[11px] font-semibold text-[#0F4D4A]">
            {deltaLabel}
          </span>
        )}
      </div>
      <div className="relative mt-1.5 overflow-hidden rounded-[10px] border border-[#E2EAE8] bg-[#F6F8F7] px-4 py-3.5">
        <p
          className={cn(
            "text-base font-medium leading-[1.5] text-[#1B1B1E] transition-all duration-300",
            !revealed && "select-none blur-sm",
          )}
        >
          {rewritten}
        </p>
        {!revealed && children}
      </div>

      <p className="mt-[18px] text-[12.5px] leading-[1.5] text-[#8A8A85]">{FOOTNOTE}</p>
    </div>
  );
}
