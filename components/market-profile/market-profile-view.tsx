"use client";

import { cn } from "@/lib/utils";
import {
  MARKET_KEYWORD_GROUP_META,
  type MarketKeyword,
  type MarketProfileKeywords,
} from "@/lib/types";

interface MarketProfileViewProps {
  keywords: MarketProfileKeywords;
}

/**
 * Renderiza os grupos de keywords do Perfil de Mercado com recorrência
 * visível (termos em 2+ vagas ganham destaque — recorrência = peso na busca
 * do recrutador).
 *
 * Desenhado pra reuso: dashboard e outras ferramentas (CV Tailor, LinkedIn
 * Review, Cover Letter, Interview Prep) vão renderizar o mesmo perfil.
 */
export function MarketProfileView({ keywords }: MarketProfileViewProps) {
  const hasRecurrence = Object.values(keywords).some((list: MarketKeyword[]) =>
    list.some((k) => k.count > 1),
  );

  return (
    <div className="flex flex-col gap-3">
      {MARKET_KEYWORD_GROUP_META.map(({ key, label }) => {
        const list = keywords[key];
        if (list.length === 0) return null;
        return (
          <div key={key} className="rounded-2xl border border-[#EAEAE4] bg-white p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
              {label}
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {list.map((keyword) => (
                <span
                  key={keyword.term}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px]",
                    keyword.count > 1
                      ? "bg-[#EAF1EF] font-semibold text-[#0F4D4A]"
                      : "bg-[#F4F4F0] font-medium text-[#5C5C60]",
                  )}
                >
                  {keyword.term}
                  {keyword.count > 1 && (
                    <span className="rounded bg-[#0F4D4A] px-1 py-px text-[10.5px] font-bold leading-none text-white">
                      {keyword.count}x
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      {hasRecurrence && (
        <p className="text-[12.5px] leading-[1.5] text-[#A0A09B]">
          Termos destacados aparecem em mais de uma vaga — são os que recrutadores desse mercado
          mais usam na busca.
        </p>
      )}
    </div>
  );
}
