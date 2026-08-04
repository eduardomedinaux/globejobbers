import Link from "next/link";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { AssetCards } from "@/components/dashboard/asset-cards";
import { ToolCard, type ToolIcon } from "@/components/dashboard/tool-card";
import { getCurrentUser } from "@/lib/supabase-server";
import { getActiveMarketProfile } from "@/lib/market-profile";
import { getActiveDocument, toDocumentSummary } from "@/lib/user-documents";
import { getPlanStatus } from "@/lib/plan";
import { getUsageStatus, FREE_LIMITS } from "@/lib/usage";
import { getRecentAnalyses } from "@/lib/history";
import { TARGET_MARKET_LABELS, TOOL_TYPE_LABELS, type MarketKeyword } from "@/lib/types";

function remainingLabel(remaining: number, limit: number) {
  return `${remaining} de ${limit} análise${limit === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"} este mês`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  // Layout já garante user !== null aqui — checado de novo só pro TS.
  const recentAnalyses = user ? await getRecentAnalyses(user.id, 5) : [];

  // Plano efetivo buscado uma vez e repassado — evita 1 query por ferramenta.
  const plan = user ? (await getPlanStatus(user.id)).plan : "free";

  // Os dois ativos do dashboard vivo (ver components/dashboard/asset-cards.tsx).
  const [marketProfile, linkedinDoc] = user
    ? await Promise.all([
        getActiveMarketProfile(user.id),
        getActiveDocument(user.id, "linkedin_pdf"),
      ])
    : [null, null];
  const marketProfileCard = marketProfile
    ? {
        targetRole: marketProfile.targetRole,
        marketLabel: TARGET_MARKET_LABELS[marketProfile.targetMarket],
        keywordCount: Object.values(marketProfile.keywords).reduce(
          (sum: number, list: MarketKeyword[]) => sum + list.length,
          0,
        ),
        // As vagas que montaram o perfil — visíveis no card (só os títulos).
        jobs: marketProfile.sourceJobs.map((j) => j.title),
      }
    : null;

  // Headline não tem mais card próprio: virou aba do LinkedIn Review, e o
  // limite dela aparece dentro da própria aba.
  const [cvTailorUsage, linkedinReviewUsage, networkingUsage, postUsage] = user
    ? await Promise.all([
        getUsageStatus(user.id, "cv_tailor", plan),
        getUsageStatus(user.id, "linkedin_review", plan),
        getUsageStatus(user.id, "networking", plan),
        getUsageStatus(user.id, "post", plan),
      ])
    : [
        { used: 0, limit: FREE_LIMITS.cv_tailor, remaining: FREE_LIMITS.cv_tailor, limitReached: false },
        {
          used: 0,
          limit: FREE_LIMITS.linkedin_review,
          remaining: FREE_LIMITS.linkedin_review,
          limitReached: false,
        },
        { used: 0, limit: FREE_LIMITS.networking, remaining: FREE_LIMITS.networking, limitReached: false },
        { used: 0, limit: FREE_LIMITS.post, remaining: FREE_LIMITS.post, limitReached: false },
      ];

  const TOOLS: {
    icon: ToolIcon;
    name: string;
    description: string;
    href: string;
    remainingLabel: string;
  }[] = [
    {
      icon: "scan-search",
      name: "LinkedIn Review",
      description:
        "Análise completa do seu perfil em 8 categorias + otimizador de headline pro mercado internacional.",
      href: "/tools/linkedin-review",
      remainingLabel: remainingLabel(linkedinReviewUsage.remaining, linkedinReviewUsage.limit),
    },
    {
      icon: "file-text",
      name: "CV Tailor",
      description: "Adapte seu currículo para cada vaga usando palavras-chave da job description.",
      href: "/tools/cv-tailor",
      remainingLabel: remainingLabel(cvTailorUsage.remaining, cvTailorUsage.limit),
    },
    {
      icon: "users",
      name: "Mensagens de Networking",
      description: "Aborde recrutadores e hiring managers com mensagens que constroem relacionamento.",
      href: "/tools/networking",
      remainingLabel: remainingLabel(networkingUsage.remaining, networkingUsage.limit),
    },
    {
      icon: "pen-square",
      name: "Criador de Posts",
      description: "Transforme suas experiências reais em posts que constroem autoridade no seu alvo.",
      href: "/tools/posts",
      remainingLabel: remainingLabel(postUsage.remaining, postUsage.limit),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <ViewTracker event="dashboard_viewed" />
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161618]">
          Bem-vindo de volta
        </h1>
        <p className="mt-1 text-[14.5px] text-[#6E6E72]">
          Escolha uma ferramenta pra continuar sua evolução rumo a vagas
          internacionais.
        </p>
      </div>

      <AssetCards
        marketProfile={marketProfileCard}
        document={linkedinDoc ? toDocumentSummary(linkedinDoc) : null}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <ToolCard key={tool.name} {...tool} />
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-[#1B1B1E]">Histórico recente</h2>
          {recentAnalyses.length > 0 && (
            <Link
              href="/history"
              className="text-[13px] font-medium text-[#0F4D4A] hover:underline"
            >
              Ver tudo
            </Link>
          )}
        </div>

        {recentAnalyses.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-[#D8D8D2] bg-[#FAFAF8] p-8 text-center">
            <p className="text-[14px] text-[#8A8A85]">
              Nenhuma análise ainda. Use uma das ferramentas acima pra começar.
            </p>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2.5">
            {recentAnalyses.map((analysis) => (
              <Link
                key={analysis.id}
                href={`/history/${analysis.id}`}
                className="flex items-center justify-between rounded-xl border border-[#EAEAE4] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(20,20,20,0.03)] transition-colors hover:bg-[#FAFAF8]"
              >
                <div>
                  <p className="text-[14px] font-semibold text-[#1B1B1E]">
                    {TOOL_TYPE_LABELS[analysis.tool_type]}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-[#8A8A85]">{formatDate(analysis.created_at)}</p>
                </div>
                {analysis.score !== null && (
                  <span className="rounded-full bg-[#EAF1EF] px-2.5 py-1 text-[12.5px] font-semibold text-[#0F4D4A]">
                    {analysis.score}/100
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
