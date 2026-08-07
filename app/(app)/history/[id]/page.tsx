import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-server";
import { getAnalysisById } from "@/lib/history";
import { ScoreMiniCard } from "@/components/score-mini-card";
import { HeadlineCard } from "@/components/headline-card";
import { CvTailorResultView } from "@/components/cv-tailor-result";
import { CvTailorResultV2View } from "@/components/cv-tailor-result-v2";
import { LinkedinReviewResultView } from "@/components/linkedin-review-result";
import { HeadlineMarketResultView } from "@/components/market-profile/headline-market-result";
import { NetworkingResultView } from "@/components/tools/networking-result";
import { PostResultView } from "@/components/tools/post-result";
import { MarketIntelReportView } from "@/components/tools/market-intel-report";
import { TOOL_TYPE_LABELS } from "@/lib/types";
import type {
  CvTailorResult,
  CvTailorResultV2,
  HeadlineAnalysisResult,
  LinkedinReviewResult,
  MarketHeadlineResult,
  MarketIntelReport,
  NetworkingResult,
  PostResult,
} from "@/lib/types";

export default async function HistoryDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const analysis = user ? await getAnalysisById(user.id, params.id) : null;
  if (!analysis) notFound();

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-6">
      <Link
        href="/history"
        className="flex items-center gap-1 text-[13.5px] text-[#8A8A85] transition-colors hover:text-[#3F3F43]"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar ao histórico
      </Link>

      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
          {TOOL_TYPE_LABELS[analysis.tool_type]}
        </p>
        <p className="mt-1 text-[13px] text-[#8A8A85]">
          {new Date(analysis.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {analysis.tool_type === "market_intel" && (
        <MarketIntelReportView
          report={analysis.output_data as MarketIntelReport}
          showCta={false}
        />
      )}

      {analysis.tool_type === "headline" &&
        (() => {
          const output = analysis.output_data as HeadlineAnalysisResult | MarketHeadlineResult;
          // Resultados via Perfil de Mercado têm shape próprio (kind:
          // "market") — os legados (text/builder) não têm `kind`.
          if ("kind" in output && output.kind === "market") {
            return <HeadlineMarketResultView result={output} />;
          }
          const result = output as HeadlineAnalysisResult;
          return (
            <div className="flex flex-col gap-4">
              <ScoreMiniCard score={result.headlineScore} />
              <HeadlineCard
                original={result.headline.original}
                rewritten={result.headline.rewritten}
                revealed
              />
            </div>
          );
        })()}

      {analysis.tool_type === "cv_tailor" &&
        (() => {
          const output = analysis.output_data as CvTailorResult | CvTailorResultV2;
          // Resultados v2 têm kind próprio; os legados (compatibilityScore
          // do modelo) não têm `kind`.
          if ("kind" in output && output.kind === "cv_tailor_v2") {
            return <CvTailorResultV2View result={output} />;
          }
          return <CvTailorResultView result={output as CvTailorResult} />;
        })()}

      {analysis.tool_type === "linkedin_review" && (
        <LinkedinReviewResultView result={analysis.output_data as LinkedinReviewResult} />
      )}

      {analysis.tool_type === "networking" && (
        <NetworkingResultView result={analysis.output_data as NetworkingResult} />
      )}

      {analysis.tool_type === "post" && (
        <PostResultView result={analysis.output_data as PostResult} />
      )}
    </div>
  );
}
