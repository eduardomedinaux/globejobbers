"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ScoreMiniCard } from "@/components/score-mini-card";
import { CopyButton, PlaceholderTextBox } from "@/components/data-placeholder-text";
import { LINKEDIN_REVIEW_CATEGORY_META, type LinkedinReviewResult } from "@/lib/types";

// Progressive disclosure (10/set): a única coisa ACIONÁVEL de cada
// categoria é o exemplo pronto — aberto, com Copiar e instrução de uso.
// Diagnóstico e recomendação ficam atrás de "Entenda essa nota". Os campos
// de dados [[...]] do exemplo vivem no componente compartilhado
// components/data-placeholder-text.tsx (também usado pelo Interview Prep).

export function LinkedinReviewResultView({ result }: { result: LinkedinReviewResult }) {
  const byKey = Object.fromEntries(result.categories.map((c) => [c.key, c]));
  // Chaves das categorias com a análise expandida (o padrão é recolhida).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex flex-col gap-5">
      <ScoreMiniCard score={result.overallScore} label="Score Internacional do seu perfil" />

      <div className="flex flex-col gap-4">
        {LINKEDIN_REVIEW_CATEGORY_META.map(({ key, label }) => {
          const category = byKey[key];
          if (!category) return null;
          const hasExample = category.example.trim().length > 0;
          const isExpanded = Boolean(expanded[key]);

          return (
            <div
              key={key}
              className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-semibold text-[#1B1B1E]">{label}</p>
                <span className="rounded-full bg-[#EAF1EF] px-2.5 py-1 text-[13px] font-semibold text-[#0F4D4A]">
                  {category.score}/100
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EFEFE9]">
                <div
                  className="h-full rounded-full bg-[#0F4D4A]"
                  style={{ width: `${category.score}%` }}
                />
              </div>

              {/* A caixa de ação — sempre aberta. */}
              {hasExample ? (
                <PlaceholderTextBox
                  text={category.example}
                  title="Exemplo melhorado"
                  hintWithFields="Complete com seus números reais (a gente nunca inventa por você) — depois copie e cole no LinkedIn."
                  hintNoFields="Pronto pra usar: copie, ajuste o que quiser e cole nessa seção do seu LinkedIn."
                  copyLabel={`Copiar exemplo de ${label}`}
                />
              ) : (
                <div className="mt-4 rounded-[10px] border border-[#E2EAE8] bg-[#F6F8F7] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#0F4D4A]">
                        Como melhorar
                      </p>
                      <p className="mt-0.5 text-[12px] leading-[1.5] text-[#8A8A85]">
                        Seu checklist pra essa seção — aplique direto no perfil.
                      </p>
                    </div>
                    <CopyButton
                      text={category.recommendation}
                      label={`Copiar recomendação de ${label}`}
                    />
                  </div>
                  <p className="mt-2 text-[13.5px] leading-[1.55] text-[#1B1B1E]">
                    {category.recommendation}
                  </p>
                </div>
              )}

              {/* O "porquê" — recolhido por padrão. */}
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-expanded={isExpanded}
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6E6E72] transition-colors hover:text-[#0F4D4A]"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
                {isExpanded ? "Esconder análise" : "Entenda essa nota"}
              </button>

              {isExpanded && (
                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#8A8A85]">
                      O que encontramos
                    </p>
                    <p className="mt-1 text-[14px] leading-[1.55] text-[#3F3F43]">
                      {category.diagnosis}
                    </p>
                  </div>
                  {hasExample && (
                    <div>
                      <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#8A8A85]">
                        Como melhorar
                      </p>
                      <p className="mt-1 text-[13.5px] leading-[1.55] text-[#6E6E72]">
                        {category.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
