"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  MARKET_INTEL_REGION_LABELS,
  MARKET_INTEL_SENIORITY_LABELS,
  type MarketIntelCount,
  type MarketIntelReport,
} from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
      <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
        {title}
      </p>
      {children}
    </div>
  );
}

/** Linha de ranking com barra proporcional discreta (número é o dado; a barra só apoia). */
function CountRow({ item, max }: { item: MarketIntelCount; max: number }) {
  const width = Math.max(4, Math.round((100 * item.count) / Math.max(1, max)));
  return (
    <div className="flex items-center gap-3">
      <div className="w-[46%] min-w-0 sm:w-[38%]">
        <p className="truncate text-[14px] font-medium text-[#1B1B1E]">{item.term}</p>
      </div>
      <div className="h-1.5 flex-1 rounded-full bg-[#F0F0EA]">
        <div className="h-1.5 rounded-full bg-[#0F4D4A]/70" style={{ width: `${width}%` }} />
      </div>
      <p className="w-[72px] shrink-0 text-right text-[12.5px] tabular-nums text-[#6E6E72]">
        {item.percent}%
      </p>
    </div>
  );
}

function CountList({ items }: { items: MarketIntelCount[] }) {
  const max = items[0]?.count ?? 1;
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <CountRow key={item.term} item={item} max={max} />
      ))}
    </div>
  );
}

/**
 * O relatório de Market Intelligence — exatamente 6 blocos (decisão de
 * produto: sem gráficos, sem PDF, sem empresas, sem salário no MVP) + o
 * rodapé de auditabilidade e o CTA que puxa o usuário pro passo 2 da
 * jornada (Perfil de Mercado).
 */
export function MarketIntelReportView({
  report,
  showCta = true,
}: {
  report: MarketIntelReport;
  showCta?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* 1. Como o mercado chama esse cargo */}
      <Block title="Como o mercado chama esse cargo">
        <CountList items={report.titles} />
      </Block>

      {/* 2. Skills mais pedidas */}
      <Block title="Skills mais pedidas">
        <CountList items={report.skills} />
      </Block>

      {/* 3. Ferramentas mais pedidas */}
      <Block title="Ferramentas mais pedidas">
        <CountList items={report.tools} />
      </Block>

      {/* 4. Responsabilidades mais frequentes */}
      <Block title="Responsabilidades mais frequentes">
        <CountList items={report.responsibilities} />
      </Block>

      {/* 5. Senioridade predominante */}
      <Block title="Senioridade predominante">
        <div className="flex flex-col gap-2.5">
          {report.seniority.map((s) => (
            <CountRow
              key={s.level}
              item={{ term: MARKET_INTEL_SENIORITY_LABELS[s.level], count: s.count, percent: s.percent }}
              max={report.seniority[0]?.count ?? 1}
            />
          ))}
        </div>
      </Block>

      {/* 6. O que mais chamou atenção (Sonnet, a partir dos números) */}
      <div className="rounded-2xl border border-[#D8E5E2] bg-[#F4F8F7] p-6">
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#0F4D4A]">
          O que mais chamou atenção
        </p>
        <div className="flex flex-col gap-3">
          {report.insights.split(/\n{2,}|\n/).filter(Boolean).map((paragraph, i) => (
            <p key={i} className="text-[14.5px] leading-[1.65] text-[#1B1B1E]">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Auditabilidade — todo número acima é contável a partir das vagas */}
      <p className="text-center text-[12.5px] text-[#A0A09B]">
        Baseado em {report.jobsAnalyzed} vagas únicas e relevantes ({report.jobsCollected} coletadas)
        · {MARKET_INTEL_REGION_LABELS[report.region]} · {formatDate(report.generatedAt)}
      </p>

      {showCta && (
        <div className="rounded-2xl border border-[#0F4D4A] bg-white p-6 text-center">
          <p className="text-[16px] font-semibold text-[#1B1B1E]">
            Você já sabe o que o mercado procura.
          </p>
          <p className="mt-1 text-[14px] text-[#6E6E72]">
            Agora vamos descobrir o quanto você está preparado.
          </p>
          <Link
            href="/tools/linkedin-review"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0F4D4A] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0C403D]"
          >
            Comparar meu perfil com esse mercado
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
