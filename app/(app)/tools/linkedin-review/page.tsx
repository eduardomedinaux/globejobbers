"use client";

import { useState } from "react";
import { LinkedinReviewTool } from "@/components/tools/linkedin-review-tool";
import { HeadlineTool } from "@/components/tools/headline-tool";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

type Tab = "review" | "headline";

const TABS: { key: Tab; label: string }[] = [
  { key: "review", label: "Review completo" },
  { key: "headline", label: "Headline" },
];

const TAB_SUBTITLES: Record<Tab, string> = {
  review:
    "Receba uma análise completa do seu perfil em 8 categorias, pra entender exatamente o que ajustar pro mercado internacional.",
  headline:
    "Otimize sua headline do LinkedIn para chamar a atenção de recrutadores internacionais.",
};

/**
 * LinkedIn Review com abas: a headline é uma seção do perfil do LinkedIn,
 * então vive aqui dentro — não como ferramenta irmã na sidebar (decisão de
 * 2026-07-22). Estrutura pronta pra receber About e Experiências como novas
 * abas no futuro. /tools/headline redireciona pra cá com ?tab=headline.
 */
export default function LinkedinReviewPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const [tab, setTab] = useState<Tab>(searchParams?.tab === "headline" ? "headline" : "review");

  function handleTabChange(next: Tab) {
    if (next === tab) return;
    setTab(next);
    track("linkedin_review_tab_changed", { tab: next });
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161618]">
          LinkedIn Review
        </h1>
        <p className="mt-1 text-[14.5px] text-[#6E6E72]">{TAB_SUBTITLES[tab]}</p>
      </div>

      {/* Abas de seção (padrão underline) — hierarquia acima dos toggles internos */}
      <div className="flex gap-6 border-b border-[#EAEAE4]" role="tablist">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => handleTabChange(key)}
            className={cn(
              "-mb-px border-b-2 pb-2.5 text-[14px] font-medium transition-colors",
              tab === key
                ? "border-[#0F4D4A] text-[#0F4D4A]"
                : "border-transparent text-[#6E6E72] hover:text-[#1B1B1E]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "review" ? <LinkedinReviewTool /> : <HeadlineTool />}
    </div>
  );
}
