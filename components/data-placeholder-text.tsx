"use client";

import { useMemo, useState } from "react";
import { Check, Copy, CircleSlash } from "lucide-react";

// Texto com placeholders de dados [[rótulo||versão qualitativa]] — o
// contrato anti-invenção da casa: onde o modelo não tem o fato, ele pede
// em vez de inventar. Cada placeholder vira um campo inline; o ícone ⊘
// (popover no hover) usa a versão qualitativa honesta; Copiar só habilita
// com todos os campos resolvidos. Usado pelo LinkedIn Review (exemplos) e
// pelo Interview Prep (resposta melhorada) — ver
// claude/PROPOSTA-INTERVIEW-PREP.md.

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

function parsePlaceholders(text: string): Segment[] {
  const segments: Segment[] = [];
  // exec em loop (em vez de matchAll) — o target baixo do tsconfig não
  // itera IterableIterator (mesmo motivo do forEach em lib/market-intel).
  const re = new RegExp(PLACEHOLDER_RE.source, "g");
  let lastIndex = 0;
  let fieldIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", text: text.slice(lastIndex, match.index) });
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
  if (lastIndex < text.length) {
    segments.push({ kind: "text", text: text.slice(lastIndex) });
  }
  return segments;
}

type FieldState = { value: string; skipped: boolean };

export function CopyButton({
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

/**
 * Caixa de texto acionável com campos inline pros dados que só o usuário
 * tem. `hintWithFields`/`hintNoFields` explicam o que fazer com a caixa.
 */
export function PlaceholderTextBox({
  text,
  title,
  hintWithFields,
  hintNoFields,
  copyLabel,
}: {
  text: string;
  title: string;
  hintWithFields: string;
  hintNoFields: string;
  copyLabel: string;
}) {
  const segments = useMemo(() => parsePlaceholders(text), [text]);
  const fieldCount = segments.filter((s) => s.kind === "field").length;
  const [fields, setFields] = useState<Record<number, FieldState>>({});

  const unresolved = segments.filter(
    (s): s is FieldSegment =>
      s.kind === "field" &&
      !(fields[s.fieldIndex]?.skipped || (fields[s.fieldIndex]?.value ?? "").trim().length > 0),
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
            {title}
          </p>
          <p className="mt-0.5 text-[12px] leading-[1.5] text-[#8A8A85]">
            {fieldCount > 0 ? hintWithFields : hintNoFields}
          </p>
        </div>
        <CopyButton
          text={finalText}
          label={copyLabel}
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
            <span
              key={i}
              className="group relative mx-0.5 inline-flex items-center gap-1 align-baseline"
            >
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
