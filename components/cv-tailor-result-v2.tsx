"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Check, Copy, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildCvPrintHtml, parseCvText, stripDividers } from "@/lib/cv-print";
import type { CvMatchBreakdown, CvRequirement, CvTailorResultV2 } from "@/lib/types";

function breakdownLabel(b: CvMatchBreakdown): string {
  return `${b.strong} bem representado${b.strong === 1 ? "" : "s"} · ${b.weak} parcialmente representado${b.weak === 1 ? "" : "s"} · ${b.missing} não encontrado${b.missing === 1 ? "" : "s"}`;
}

function RequirementPills({
  items,
  tone,
}: {
  items: CvRequirement[];
  tone: "strong" | "weak" | "missing";
}) {
  const styles = {
    strong: { pill: "bg-[#EAF1EF] text-[#0F4D4A]", Icon: Check },
    weak: { pill: "bg-[#FBF6E9] text-[#7A6428]", Icon: AlertTriangle },
    missing: { pill: "bg-[#F4F4F0] text-[#6E6E72]", Icon: X },
  }[tone];
  const { Icon } = styles;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((req) => (
        <span
          key={req.term}
          title={req.evidence ? `Evidência no seu CV: "${req.evidence}"` : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold",
            styles.pill,
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {req.term}
          {req.weight === "must" && (
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
              obrigatório
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/**
 * Preview formatado do CV adaptado: usa o MESMO parser do PDF
 * (lib/cv-print.ts), então tela e impressão contam a mesma história —
 * nome grande, título em teal, seções em negrito, empresas em bold,
 * datas discretas. As linhas divisórias ("---") não aparecem.
 */
function CvFormattedPreview({ cvText }: { cvText: string }) {
  const parsed = useMemo(() => parseCvText(cvText), [cvText]);

  const elements: React.ReactNode[] = [];
  let key = 0;
  let list: string[] = [];
  const flushList = () => {
    if (list.length === 0) return;
    elements.push(
      <ul key={key++} className="mb-2 mt-1 flex list-disc flex-col gap-1 pl-4 marker:text-[#B4B4AF]">
        {list.map((item, i) => (
          <li key={i} className="text-[13.5px] leading-[1.55] text-[#3F3F43]">
            {item}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const block of parsed.blocks) {
    if (block.type === "li") {
      list.push(block.text);
      continue;
    }
    flushList();
    if (block.type === "gap") continue;
    if (block.type === "h2") {
      elements.push(
        <p
          key={key++}
          className="mb-1.5 mt-5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#0F4D4A]"
        >
          {block.text}
        </p>,
      );
    } else if (block.type === "org") {
      elements.push(
        <p key={key++} className="mt-3 text-[14px] font-bold text-[#1B1B1E]">
          {block.text}
        </p>,
      );
    } else if (block.type === "role") {
      elements.push(
        <p key={key++} className="text-[13.5px] font-semibold text-[#1B1B1E]">
          {block.text}
        </p>,
      );
    } else if (block.type === "meta") {
      elements.push(
        <p key={key++} className="mb-1 text-[12px] text-[#8A8A85]">
          {block.text}
        </p>,
      );
    } else {
      elements.push(
        <p key={key++} className="mb-1.5 text-[13.5px] leading-[1.6] text-[#3F3F43]">
          {block.text}
        </p>,
      );
    }
  }
  flushList();

  return (
    <div>
      {parsed.name && (
        <p className="text-[18px] font-bold tracking-[-0.01em] text-[#1B1B1E]">{parsed.name}</p>
      )}
      {parsed.subtitle && (
        <p className="text-[14px] font-semibold text-[#0F4D4A]">{parsed.subtitle}</p>
      )}
      {parsed.contact.map((c, i) => (
        <p key={i} className="text-[12px] text-[#8A8A85]">
          {c}
        </p>
      ))}
      {elements}
    </div>
  );
}

/**
 * Resultado do CV Tailor v2: match auditável (calculado em lib/match.ts, o
 * usuário vê a conta), o que a vaga procura, como o CV se encaixa (com a
 * regra de produto: "não encontrada" ≠ "adicione ao CV"), a estratégia da
 * adaptação e o CV final. Usado na página da ferramenta e no histórico.
 */
export function CvTailorResultV2View({ result }: { result: CvTailorResultV2 }) {
  const [copied, setCopied] = useState(false);

  const strong = result.requirements.filter((r) => r.status === "strong");
  const weak = result.requirements.filter((r) => r.status === "weak");
  const missing = result.requirements.filter((r) => r.status === "missing");
  const improved = result.matchAfter.percent > result.matchBefore.percent;

  async function handleCopy() {
    // Copia o texto puro (cola limpo em Word/Notion), sem as divisórias "---".
    await navigator.clipboard.writeText(stripDividers(result.rewrittenCv));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadPdf() {
    // PDF nativo do navegador: abre uma visualização de impressão A4 do CV
    // tipografado (lib/cv-print.ts — títulos em negrito, hierarquia, respiro)
    // e dispara o diálogo (que já oferece "Salvar como PDF"). Zero
    // dependência; o nome do arquivo vem do título do documento. Todo o
    // texto do CV é escapado dentro de buildCvPrintHtml — nada é interpretado.
    const w = window.open("", "_blank", "width=820,height=1060");
    if (!w) return;
    w.document.write(buildCvPrintHtml(result.rewrittenCv));
    w.document.title = `CV - ${result.job.role}`.slice(0, 80);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Seu CV adaptado — o entregável vem primeiro; a análise embaixo */}
      <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
            Seu CV adaptado
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E2DC] px-2.5 py-1.5 text-[12.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 rounded-lg border border-[#E2E2DC] px-2.5 py-1.5 text-[12.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8]"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar PDF
            </button>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto rounded-xl border border-[#F0F0EA] bg-[#FDFDFB] px-5 py-4">
          <CvFormattedPreview cvText={result.rewrittenCv} />
        </div>
      </div>

      {/* Match com a vaga — nunca "ATS Score" */}
      <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
        <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
          Match com a vaga
        </p>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-[40px] font-semibold leading-none tracking-[-0.02em] text-[#0F4D4A]">
            {result.matchBefore.percent}%
          </span>
          {improved && (
            <span className="flex items-center gap-1.5 text-[15px] font-medium text-[#6E6E72]">
              <ArrowRight className="h-4 w-4" />
              CV adaptado: <strong className="text-[#0F4D4A]">{result.matchAfter.percent}%</strong>
            </span>
          )}
        </div>
        <p className="mt-2 text-[13.5px] text-[#6E6E72]">{breakdownLabel(result.matchBefore)}</p>
        <p className="mt-3 border-t border-[#F0F0EA] pt-3 text-[12.5px] leading-[1.55] text-[#A0A09B]">
          Como calculamos: cada requisito da vaga vale 2 pontos (obrigatório) ou 1 (desejável);
          bem representado conta 100%, parcial 50%, não encontrado 0. Seu match ={" "}
          {result.matchBefore.earnedPoints} de {result.matchBefore.totalPoints} pontos.
          {improved &&
            " A projeção do CV adaptado vem apenas de evidenciar o que JÁ EXISTE no seu CV — nada foi adicionado."}
        </p>
      </div>

      {/* O que esta vaga procura */}
      <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
        <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
          O que esta vaga procura
        </p>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
              Cargo identificado
            </dt>
            <dd className="mt-0.5 text-[16px] font-semibold text-[#1B1B1E]">{result.job.role}</dd>
          </div>
          <div className="flex gap-8">
            <div>
              <dt className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                Senioridade
              </dt>
              <dd className="mt-0.5 text-[14px] font-medium text-[#1B1B1E]">
                {result.job.seniority}
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
                Área
              </dt>
              <dd className="mt-0.5 text-[14px] font-medium text-[#1B1B1E]">{result.job.area}</dd>
            </div>
          </div>
        </dl>
        {result.job.context && (
          <p className="mt-3 text-[13.5px] leading-[1.55] text-[#6E6E72]">{result.job.context}</p>
        )}
      </div>

      {/* Como seu CV se encaixa */}
      <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
        <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
          Como seu CV se encaixa
        </p>
        <div className="flex flex-col gap-5">
          {strong.length > 0 && (
            <div>
              <p className="mb-2 text-[13.5px] font-semibold text-[#0F4D4A]">
                Bem representadas no seu CV
              </p>
              <RequirementPills items={strong} tone="strong" />
            </div>
          )}
          {weak.length > 0 && (
            <div>
              <p className="mb-2 text-[13.5px] font-semibold text-[#7A6428]">
                Presentes, mas pouco evidentes
              </p>
              <RequirementPills items={weak} tone="weak" />
            </div>
          )}
          {missing.length > 0 && (
            <div>
              <p className="mb-2 text-[13.5px] font-semibold text-[#6E6E72]">
                Não encontradas no CV
              </p>
              <RequirementPills items={missing} tone="missing" />
              <p className="mt-2.5 text-[12.5px] leading-[1.55] text-[#A0A09B]">
                &ldquo;Não encontrada&rdquo; significa que a vaga pede e não achamos evidência no
                material que você enviou — NÃO adicionamos nada disso ao seu CV. Se você tem essa
                experiência e ela não está no CV, inclua você mesmo (veja as recomendações abaixo).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* O que recomendamos mudar */}
      {result.changes.length > 0 && (
        <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
            O que recomendamos mudar
          </p>
          <ul className="flex flex-col gap-3.5">
            {result.changes.map((change, i) => (
              <li key={i}>
                <p className="text-[14px] font-semibold text-[#1B1B1E]">{change.section}</p>
                <p className="mt-0.5 text-[13.5px] leading-[1.55] text-[#6E6E72]">
                  {change.change}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recomendações (o que só o candidato pode fazer) */}
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
