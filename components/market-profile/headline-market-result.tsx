"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  MARKET_HEADLINE_STYLE_LABELS,
  type MarketHeadlineResult,
} from "@/lib/types";

interface HeadlineMarketResultViewProps {
  result: MarketHeadlineResult;
}

/**
 * Resultado da geração via Perfil de Mercado: 2 variações com trade-off
 * explícito e cobertura EXPLICÁVEL — cada headline mostra quais termos do
 * perfil ela cobre, e o que ficou de fora vai pro About/Experiências
 * (gancho das próximas ferramentas). Usado no wizard e no histórico.
 */
export function HeadlineMarketResultView({ result }: HeadlineMarketResultViewProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleCopy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Clipboard bloqueado (permissões/contexto) — sem fallback barulhento.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {result.variants.map((variant, index) => (
        <div key={variant.style} className="rounded-2xl border border-[#EAEAE4] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#EAF1EF] px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-wide text-[#0F4D4A]">
              {MARKET_HEADLINE_STYLE_LABELS[variant.style]}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(variant.text, index)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E2DC] bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8]"
            >
              {copiedIndex === index ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#0F4D4A]" />
                  Copiada
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>

          <p className="mt-3 text-[16px] font-medium leading-[1.5] text-[#1B1B1E]">
            {variant.text}
          </p>
          <p className="mt-1.5 text-[12px] text-[#A0A09B]">{variant.text.length}/220 caracteres</p>

          {variant.keywordsCovered.length > 0 && (
            <div className="mt-3 border-t border-[#F0F0EA] pt-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                Keywords do seu mercado cobertas
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {variant.keywordsCovered.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-lg bg-[#EAF1EF] px-2 py-0.5 text-[12.5px] font-medium text-[#0F4D4A]"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {result.rationale && (
        <p className="text-[13.5px] leading-[1.6] text-[#6E6E72]">{result.rationale}</p>
      )}

      {result.keywordsLeftOut.length > 0 && (
        <div className="rounded-2xl border border-dashed border-[#D8D8D2] bg-[#FAFAF8] p-5">
          <p className="text-[13.5px] font-semibold text-[#1B1B1E]">
            Não coube na headline (e tudo bem):
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.keywordsLeftOut.map((keyword) => (
              <span
                key={keyword}
                className="rounded-lg bg-white px-2 py-0.5 text-[12.5px] font-medium text-[#5C5C60] ring-1 ring-[#E2E2DC]"
              >
                {keyword}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[13px] leading-[1.55] text-[#8A8A85]">
            Esses termos entram na seção Sobre e nas experiências — próximas ferramentas do
            GlobeJobbers vão te ajudar a distribuí-los.
          </p>
        </div>
      )}
    </div>
  );
}
