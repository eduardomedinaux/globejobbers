"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { ScoreMiniCard } from "@/components/score-mini-card";
import { CopyButton, PlaceholderTextBox } from "@/components/data-placeholder-text";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import {
  LINKEDIN_REVIEW_CATEGORY_META,
  type ExperienceRewrite,
  type LinkedinReviewResult,
  type SkillsPlan,
  type SkillsPlanItem,
} from "@/lib/types";

// Progressive disclosure (10/set): a única coisa ACIONÁVEL de cada
// categoria é o exemplo pronto — aberto, com Copiar e instrução de uso.
// Diagnóstico e recomendação ficam atrás de "Entenda essa nota". Os campos
// de dados [[...]] do exemplo vivem no componente compartilhado
// components/data-placeholder-text.tsx (também usado pelo Interview Prep).

// Teto de reescritas por análise — espelha MAX_REWRITES_PER_ANALYSIS na
// rota /api/tools/linkedin-review/rewrite-experience.
const MAX_REWRITES = 5;

/** Uma experiência reescrita (salva na análise): a caixa de ação + o "por quê". */
function ExperienceRewriteView({ item, index }: { item: ExperienceRewrite; index: number }) {
  return (
    <div>
      <PlaceholderTextBox
        text={item.rewritten}
        title={`Experiência reescrita ${index + 1}`}
        hintWithFields="Complete com seus números reais (a gente nunca inventa por você) — depois copie e cole nessa experiência no LinkedIn."
        hintNoFields="Pronto pra usar: copie e cole nessa experiência no seu LinkedIn."
        copyLabel={`Copiar experiência reescrita ${index + 1}`}
      />
      {item.changes.length > 0 && (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-[12.5px] font-medium text-[#8A8A85] hover:text-[#0F4D4A]">
            O que mudou
          </summary>
          <ul className="mt-1.5 flex flex-col gap-1">
            {item.changes.map((change) => (
              <li key={change} className="text-[13px] leading-[1.55] text-[#6E6E72]">
                • {change}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * Reescrita sob demanda (17/set, ideia do Eduardo): o Review mostra UM
 * exemplo; aqui o usuário cola as OUTRAS experiências, uma a uma, e recebe
 * a reescrita de cada — anexada à análise (aparece no Histórico depois),
 * sem consumir uso, até o teto. Sem analysisId (insert da análise falhou),
 * o campo não aparece — as reescritas salvas ainda renderizam.
 */
function ExperienceRewriteSection({
  analysisId,
  initialRewrites,
}: {
  analysisId?: string | null;
  initialRewrites: ExperienceRewrite[];
}) {
  const [rewrites, setRewrites] = useState<ExperienceRewrite[]>(initialRewrites);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Progressive disclosure (padrão da casa): o formulário só abre no clique
  // do botão — e fecha de novo após cada reescrita concluída.
  const [formOpen, setFormOpen] = useState(false);

  const canAddMore = Boolean(analysisId) && rewrites.length < MAX_REWRITES;

  async function handleRewrite() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/linkedin-review/rewrite-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, experienceText: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Não foi possível reescrever agora.",
        );
      }
      setRewrites((prev) => [...prev, data.rewrite as ExperienceRewrite]);
      setDraft("");
      setFormOpen(false);
      track("linkedin_review_experience_rewritten", { total: rewrites.length + 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  if (!canAddMore && rewrites.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {rewrites.map((item, i) => (
        <ExperienceRewriteView key={`${i}-${item.rewritten.slice(0, 40)}`} item={item} index={i} />
      ))}

      {canAddMore && !formOpen && (
        <button
          type="button"
          onClick={() => {
            setFormOpen(true);
            setError(null);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#C9D6D3] bg-[#FAFAF8] px-4 py-3 text-[13.5px] font-medium text-[#0F4D4A] transition-colors hover:border-[#0F4D4A] hover:bg-[#F4F8F7]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Melhorar outra experiência
          <span className="font-normal text-[#A0A09B]">
            · {MAX_REWRITES - rewrites.length} restante{MAX_REWRITES - rewrites.length === 1 ? "" : "s"}
          </span>
        </button>
      )}

      {canAddMore && formOpen ? (
        <div className="rounded-[10px] border border-dashed border-[#D8D8D2] bg-[#FAFAF8] px-4 py-3">
          <p className="text-[13px] font-semibold text-[#1B1B1E]">
            Quer melhorar outra experiência?
          </p>
          <p className="mt-0.5 text-[12.5px] leading-[1.5] text-[#8A8A85]">
            Cole o texto dela (cargo, empresa e descrição, direto do seu LinkedIn) — a reescrita
            usa só os fatos que você colar e fica salva nesta análise.
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ex.: Product Designer · Empresa X · 2021–2023 — Responsável por…"
            rows={4}
            autoFocus
            disabled={loading}
            className="mt-2 w-full resize-y rounded-lg border border-[#E2E2DC] bg-white px-3 py-2 text-[13.5px] leading-[1.55] text-[#1B1B1E] outline-none focus:border-[#0F4D4A]"
          />
          {error && <p className="mt-1.5 text-[13px] text-destructive">{error}</p>}
          <div className="mt-2 flex items-center justify-between gap-3">
            <Button
              onClick={handleRewrite}
              disabled={loading || draft.trim().length < 60}
              className="bg-[#0F4D4A] text-[#FBFEFD] hover:bg-[#0B3F3C]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Reescrevendo…
                </span>
              ) : (
                "Reescrever essa experiência"
              )}
            </Button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setError(null);
              }}
              disabled={loading}
              className="text-[13px] font-medium text-[#8A8A85] underline-offset-2 hover:text-[#3F3F43] hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        rewrites.length >= MAX_REWRITES && (
          <p className="text-[12.5px] leading-[1.5] text-[#A0A09B]">
            Você usou as {MAX_REWRITES} reescritas desta análise. Rode um novo Review quando
            atualizar o perfil pra ganhar mais.
          </p>
        )
      )}
    </div>
  );
}

/** Chip de skill: termo + quantas das vagas do alvo pedem. */
function SkillChip({ item, muted }: { item: SkillsPlanItem; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium ${
        muted ? "bg-[#F5EFEA] text-[#7A4A35]" : "bg-[#EAF1EF] text-[#0F4D4A]"
      }`}
    >
      {item.term}
      <span className={`text-[11px] font-semibold ${muted ? "text-[#B08968]" : "text-[#7BA39E]"}`}>
        {item.count}×
      </span>
    </span>
  );
}

/**
 * Plano de skills (17/set): calculado em código cruzando o Perfil de
 * Mercado com o texto do perfil (lib/skills-plan.ts). Progressive
 * disclosure: o ACIONÁVEL (fixar no topo) fica aberto com Copiar; o plano
 * completo (garantir na lista + gaps reais) mora atrás do toggle. O "N×" de
 * cada chip é a prova — recorrência nas vagas do próprio usuário.
 */
function SkillsPlanSection({ plan }: { plan: SkillsPlan }) {
  const [open, setOpen] = useState(false);
  const hasMore = plan.evidenced.length > 0 || plan.gaps.length > 0;

  if (plan.pinTop.length === 0 && !hasMore) return null;

  return (
    <div className="mt-3">
      {plan.pinTop.length > 0 && (
        <div className="rounded-[10px] border border-[#E2EAE8] bg-[#F6F8F7] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#0F4D4A]">
                Fixe estas no topo das suas Skills
              </p>
              <p className="mt-0.5 text-[12px] leading-[1.5] text-[#8A8A85]">
                Nesta ordem — são as mais pedidas nas vagas do <strong>seu</strong> alvo
                (o número diz em quantas vagas o termo aparece).
              </p>
            </div>
            <CopyButton
              text={plan.pinTop.map((item) => item.term).join(", ")}
              label="Copiar skills do topo"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan.pinTop.map((item) => (
              <SkillChip key={item.term} item={item} />
            ))}
          </div>
        </div>
      )}

      {hasMore && (
        <>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6E6E72] transition-colors hover:text-[#0F4D4A]"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            {open ? "Esconder o plano de skills" : "Ver o plano completo de skills"}
          </button>

          {open && (
            <div className="mt-2.5 flex flex-col gap-3">
              {plan.evidenced.length > 0 && (
                <div>
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#8A8A85]">
                    Garanta que estão na sua lista de Skills
                  </p>
                  <p className="mt-0.5 text-[12px] leading-[1.5] text-[#A0A09B]">
                    Seu perfil evidencia essas — se alguma não está na lista, adicione.
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {plan.evidenced.map((item) => (
                      <SkillChip key={item.term} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {plan.gaps.length > 0 && (
                <div className="rounded-[10px] border border-[#F0DCD4] bg-[#FBF6F3] px-4 py-3">
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#A0522D]">
                    As vagas pedem — seu perfil ainda não mostra
                  </p>
                  <p className="mt-0.5 text-[12px] leading-[1.5] text-[#7A4A35]">
                    NÃO adicione uma skill que você não tem — isso quebra na primeira
                    entrevista. Se você TEM alguma dessas, faça ela aparecer nas suas
                    experiências primeiro; se não tem, aqui está seu roteiro de estudo.
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {plan.gaps.map((item) => (
                      <SkillChip key={item.term} item={item} muted />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function LinkedinReviewResultView({
  result,
  analysisId,
}: {
  result: LinkedinReviewResult;
  analysisId?: string | null;
}) {
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

              {/* Palavras-chave: plano de skills determinístico (fixar no
                  topo / garantir na lista / gaps) quando a análise rodou
                  contra um Perfil de Mercado. */}
              {key === "keywords" && result.skillsPlan && (
                <SkillsPlanSection plan={result.skillsPlan} />
              )}

              {/* Experiências: o exemplo acima é UMA amostra — aqui o usuário
                  cola as outras e reescreve uma a uma (salvo na análise). */}
              {key === "experience" && (
                <ExperienceRewriteSection
                  analysisId={analysisId}
                  initialRewrites={result.experienceRewrites ?? []}
                />
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
