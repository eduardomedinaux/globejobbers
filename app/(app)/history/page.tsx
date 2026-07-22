import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase-server";
import { getRecentAnalyses } from "@/lib/history";
import { TOOL_TYPE_LABELS } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function HistoryPage() {
  const user = await getCurrentUser();
  const analyses = user ? await getRecentAnalyses(user.id, 100) : [];

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161618]">Histórico</h1>
        <p className="mt-1 text-[14.5px] text-[#6E6E72]">
          Todas as suas análises, mais recentes primeiro.
        </p>
      </div>

      {analyses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D8D8D2] bg-[#FAFAF8] p-8 text-center">
          <p className="text-[14px] text-[#8A8A85]">
            Nenhuma análise ainda. Use uma das ferramentas do dashboard pra começar.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {analyses.map((analysis) => (
            <Link
              key={analysis.id}
              href={`/history/${analysis.id}`}
              className="flex items-center justify-between rounded-xl border border-[#EAEAE4] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(20,20,20,0.03)] transition-colors hover:bg-[#FAFAF8]"
            >
              <div>
                <p className="text-[14.5px] font-semibold text-[#1B1B1E]">
                  {TOOL_TYPE_LABELS[analysis.tool_type]}
                </p>
                <p className="mt-0.5 text-[13px] text-[#8A8A85]">{formatDate(analysis.created_at)}</p>
              </div>
              {analysis.score !== null && (
                <span className="rounded-full bg-[#EAF1EF] px-2.5 py-1 text-[13px] font-semibold text-[#0F4D4A]">
                  {analysis.score}/100
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
