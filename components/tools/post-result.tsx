"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { POST_STYLE_LABELS, type PostResult } from "@/lib/types";

/** Resultado do Criador de Posts — usado na ferramenta e no histórico. */
export function PostResultView({ result }: { result: PostResult }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleCopy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Clipboard bloqueado — sem fallback barulhento.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {result.variants.map((variant, index) => (
        <div key={variant.style} className="rounded-2xl border border-[#EAEAE4] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#EAF1EF] px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-wide text-[#0F4D4A]">
              {POST_STYLE_LABELS[variant.style]}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(variant.text, index)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E2DC] px-2.5 py-1.5 text-[12.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8]"
            >
              {copiedIndex === index ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#0F4D4A]" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[1.65] text-[#1B1B1E]">
            {variant.text}
          </p>
          <p className="mt-2 text-[12px] text-[#A0A09B]">{variant.text.length} caracteres</p>
        </div>
      ))}

      {result.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.hashtags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-[#F4F4F0] px-2.5 py-1 text-[13px] font-medium text-[#5C5C60]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {result.rationale && (
        <p className="text-[13.5px] leading-[1.6] text-[#6E6E72]">{result.rationale}</p>
      )}
    </div>
  );
}
