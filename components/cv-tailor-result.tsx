"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { ScoreMiniCard } from "@/components/score-mini-card";
import type { CvTailorResult } from "@/lib/types";

function KeywordPills({ items, tone }: { items: string[]; tone: "found" | "missing" }) {
  if (items.length === 0) return null;
  const style =
    tone === "found"
      ? "bg-[#EAF1EF] text-[#0F4D4A]"
      : "bg-[#FBEFEA] text-[#B44B2A]";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

export function CvTailorResultView({ result }: { result: CvTailorResult }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(result.rewrittenCv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5">
      <ScoreMiniCard score={result.compatibilityScore} label="Compatibilidade com a vaga" />

      <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
        <p className="text-[14.5px] leading-[1.55] text-[#3F3F43]">{result.compatibilitySummary}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#EAEAE4] bg-white p-5">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
            Keywords encontradas no seu CV
          </p>
          <KeywordPills items={result.keywordsFound} tone="found" />
        </div>
        <div className="rounded-2xl border border-[#EAEAE4] bg-white p-5">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
            Keywords ausentes na vaga
          </p>
          <KeywordPills items={result.keywordsMissing} tone="missing" />
        </div>
      </div>

      <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
            CV adaptado
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E2DC] px-2.5 py-1.5 text-[12.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8]"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap text-[13.5px] leading-[1.6] text-[#1B1B1E]">
          {result.rewrittenCv}
        </pre>
      </div>

      {result.improvedBullets.length > 0 && (
        <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
            Bullets melhorados
          </p>
          <ul className="flex flex-col gap-2.5">
            {result.improvedBullets.map((bullet, i) => (
              <li key={i} className="flex gap-2 text-[14px] leading-[1.5] text-[#3F3F43]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F4D4A]" aria-hidden />
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div className="rounded-2xl border border-[#EAEAE4] bg-[#FBFBF9] p-6">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
            Recomendações
          </p>
          <ul className="flex flex-col gap-2.5">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2 text-[14px] leading-[1.5] text-[#6E6E72]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B4B4AF]" aria-hidden />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
