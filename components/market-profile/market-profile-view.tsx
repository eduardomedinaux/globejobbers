"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MARKET_KEYWORD_GROUP_META,
  type MarketKeyword,
  type MarketProfile,
} from "@/lib/types";

interface MarketProfileViewProps {
  profile: MarketProfile;
  /** Especialidades selecionadas (chips). Omitir junto com onToggleSpecialty = somente leitura. */
  selectedSpecialties?: string[];
  onToggleSpecialty?: (specialty: string) => void;
}

/**
 * Renderiza o Perfil de Mercado: grupos de keywords com recorrência visível
 * (termos em 2+ vagas ganham destaque — recorrência = peso na busca do
 * recrutador) e especialidades inferidas como chips de CONFIRMAÇÃO (o
 * usuário nunca digita especialidade — metodologia da mentoria).
 *
 * Desenhado pra reuso: dashboard e outras ferramentas vão renderizar o
 * mesmo perfil no futuro (modo somente leitura, sem onToggleSpecialty).
 */
export function MarketProfileView({
  profile,
  selectedSpecialties = [],
  onToggleSpecialty,
}: MarketProfileViewProps) {
  const interactive = typeof onToggleSpecialty === "function";
  const multipleJobs =
    profile.origin === "jobs" &&
    Object.values(profile.keywords).some((list: MarketKeyword[]) =>
      list.some((k) => k.count > 1),
    );

  return (
    <div className="flex flex-col gap-5">
      {profile.origin === "synthetic" && (
        <div className="rounded-xl border border-[#E8D9B5] bg-[#FBF6E9] px-4 py-3 text-[13px] leading-[1.55] text-[#7A6428]">
          Perfil <strong>estimado</strong> a partir do conhecimento do mercado — sem vagas reais.
          Para um perfil preciso, cole descrições de vagas que você deseja.
        </div>
      )}

      {profile.inferredSpecialties.length > 0 && (
        <div className="rounded-2xl border border-[#EAEAE4] bg-white p-5">
          <h3 className="text-[14.5px] font-semibold text-[#1B1B1E]">
            {interactive ? "Confirme suas especialidades" : "Especialidades"}
          </h3>
          {interactive && (
            <p className="mt-1 text-[13px] leading-[1.55] text-[#6E6E72]">
              Inferidas das vagas que você quer — desmarque as que não fazem sentido pra você.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.inferredSpecialties.map((specialty) => {
              const selected = selectedSpecialties.includes(specialty);
              return interactive ? (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => onToggleSpecialty?.(specialty)}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                    selected
                      ? "border-[#0F4D4A] bg-[#EAF1EF] text-[#0F4D4A]"
                      : "border-[#E2E2DC] bg-white text-[#6E6E72] hover:border-[#C9C9C2]",
                  )}
                >
                  {selected && <Check className="h-3.5 w-3.5" />}
                  {specialty}
                </button>
              ) : (
                <span
                  key={specialty}
                  className="rounded-full border border-[#0F4D4A] bg-[#EAF1EF] px-3 py-1.5 text-[13px] font-medium text-[#0F4D4A]"
                >
                  {specialty}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {MARKET_KEYWORD_GROUP_META.map(({ key, label }) => {
          const list = profile.keywords[key];
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
                    {multipleJobs && keyword.count > 1 && (
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
      </div>

      {multipleJobs && (
        <p className="text-[12.5px] leading-[1.5] text-[#A0A09B]">
          Termos destacados aparecem em mais de uma vaga — são os que recrutadores desse mercado
          mais usam na busca.
        </p>
      )}
    </div>
  );
}
