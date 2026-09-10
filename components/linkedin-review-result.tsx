"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Copy, CircleSlash } from "lucide-react";
import { ScoreMiniCard } from "@/components/score-mini-card";
import { LINKEDIN_REVIEW_CATEGORY_META, type LinkedinReviewResult } from "@/lib/types";

// Progressive disclosure (10/set): a única coisa ACIONÁVEL de cada
// categoria é o exemplo pronto — aberto, com Copiar e instrução de uso.
// Diagnóstico e recomendação ficam atrás de "Entenda essa nota".
//
// Placeholders de dados (10/set): o modelo é PROIBIDO de inventar métricas
// (regra em lib/prompts.ts). Onde falta um dado que só o usuário tem, o
// exemplo traz [[rótulo||versão qualitativa]] — aqui cada um vira um campo
// inline. O usuário preenche com o número real OU marca "não tenho esse
// dado" (ícone com popover), que usa a versão qualitativa honesta. Copiar
// só habilita com todos os campos resolvidos — preenchidos ou pulados de
// propósito. As duas respostas são legítimas; fingir é a única que não é.

interface TextSegment {
  kind: "text";
  text: string;
}
interface FieldSegment {
  kind: "field";
  /** Índice do campo (ordem de aparição) — chave do estado. */
  fieldIndex: number;
  label: string;
  fallback: string;
}
type Segment = TextSegment | FieldSegment;

const PLACEHOLDER_RE = /\[\[(.+?)\]\]/g;

function parseExample(example: string): Segment[] {
  const segments: Segment[] = [];
  // exec em loop (em vez de matchAll) — o target baixo do tsconfig não
  // itera IterableIterator (mesmo motivo do forEach em lib/market-intel).
  const re = new RegExp(PLACEHOLDER_RE.source, "g");
  let lastIndex = 0;
  let fieldIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(example)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", text: example.slice(lastIndex, match.index) });
    }
    const [label, fallback] = match[1].split("||", 2).map((s) => s.trim());
    segments.push({
      kind: "field",
      fieldIndex: fieldIndex++,
      label: label || "seu dado",
      fallback: fallback || "",
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < example.length) {
    segments.push({ kind: "text", text: example.slice(lastIndex) });
  }
  return segments;
}

type FieldState = { value: string; skipped: boolean };

function CopyButton({
  text,
  label,
  disabled,
  disabledHint,
}: {
  text: string;
  label: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard bloqueado: o texto está visível e dá pra selecionar à mão.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      aria-label={label}
      title={disabled ? disabledHint : undefined}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
        copied
          ? "border-[#0F4D4A] bg-[#0F4D4A] text-white"
          : "border-[#D8E5E2] bg-white text-[#0F4D4A] hover:bg-[#EAF1EF]"
      } disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-white`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

/** Caixa do exemplo com campos inline pros dados que só o usuário tem. */
function ExampleBox({ example, categoryLabel }: { example: string; categoryLabel: string }) {
  const segments = useMemo(() => parseExample(example), [example]);
  const fieldCount = segments.filter((s) => s.kind === "field").length;
  const [fields, setFields] = useState<Record<number, FieldState>>({});

  const unresolved = segments.filter(
    (s): s is FieldSegment =>
      s.kind === "field" && !(fields[s.fieldIndex]?.skipped || (fields[s.fieldIndex]?.value ?? "").trim().length > 0),
  ).length;

  function setValue(index: number, value: string) {
    setFields((prev) => ({ ...prev, [index]: { value, skipped: false } }));
  }
  function toggleSkip(index: number) {
    setFields((prev) => ({
      ...prev,
      [index]: { value: prev[index]?.value ?? "", skipped: !prev[index]?.skipped },
    }));
  }

  const finalText = segments
    .map((s) => {
      if (s.kind === "text") return s.text;
      const state = fields[s.fieldIndex];
      if (state?.skipped) return s.fallback;
      return (state?.value ?? "").trim();
    })
    .join("");

  return (
    <div className="mt-4 rounded-[10px] border border-[#E2EAE8] bg-[#F6F8F7] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#0F4D4A]">
            Exemplo melhorado
          </p>
          <p className="mt-0.5 text-[12px] leading-[1.5] text-[#8A8A85]">
            {fieldCount > 0
              ? "Complete com seus números reais (a gente nunca inventa por você) — depois copie e cole no LinkedIn."
              : "Pronto pra usar: copie, ajuste o que quiser e cole nessa seção do seu LinkedIn."}
          </p>
        </div>
        <CopyButton
          text={finalText}
          label={`Copiar exemplo de ${categoryLabel}`}
          disabled={unresolved > 0}
          disabledHint="Preencha seus dados (ou marque 'não tenho esse dado') pra liberar"
        />
      </div>

      <p className="mt-2 whitespace-pre-line text-[13.5px] leading-[1.9] text-[#1B1B1E]">
        {segments.map((s, i) => {
          if (s.kind === "text") return <span key={i}>{s.text}</span>;
          const state = fields[s.fieldIndex];
          if (state?.skipped) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleSkip(s.fieldIndex)}
                title="Usando a versão sem número — clique pra voltar a preencher"
                className="mx-0.5 inline rounded-md bg-[#EAF1EF] px-1.5 py-0.5 italic text-[#0F4D4A] underline decoration-dashed underline-offset-2"
              >
                {s.fallback || "—"}
              </button>
            );
          }
          return (
            <span key={i} className="group relative mx-0.5 inline-flex items-center gap-1 align-baseline">
              <input
                value={state?.value ?? ""}
                onChange={(e) => setValue(s.fieldIndex, e.target.value)}
                placeholder={s.label}
                size={Math.max(s.label.length, (state?.value ?? "").length, 6)}
                className="inline rounded-md border border-dashed border-[#0F4D4A]/50 bg-white px-1.5 py-0.5 text-[13px] text-[#0F4D4A] placeholder:text-[#0F4D4A]/45 focus:border-[#0F4D4A] focus:outline-none"
                aria-label={s.label}
              />
              <button
                type="button"
                onClick={() => toggleSkip(s.fieldIndex)}
                aria-label="Não tenho esse dado"
                className="text-[#A0A09B] transition-colors hover:text-[#0F4D4A]"
              >
                <CircleSlash className="h-3.5 w-3.5" />
              </button>
              {/* Popover no hover do ícone (e foco, pra teclado). */}
              <span
                role="tooltip"
                className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1B1B1E] px-2.5 py-1.5 text-[11.5px] font-medium text-white opacity-0 shadow-md transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
              >
                Não tenho esse dado — usar a versão sem número
              </span>
            </span>
          );
        })}
      </p>

      {fieldCount > 0 && unresolved > 0 && (
        <p className="mt-2 text-[12px] text-[#8A8A85]">
          {unresolved} campo{unresolved === 1 ? "" : "s"} pra resolver — preencha com seu número
          real ou clique no ícone <CircleSlash className="inline h-3 w-3 align-[-1px]" /> se não
          tiver o dado.
        </p>
      )}
    </div>
  );
}

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
                <ExampleBox example={category.example} categoryLabel={label} />
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
