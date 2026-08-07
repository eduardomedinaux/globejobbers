import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { writeMarketIntelInsights } from "@/lib/anthropic";
import { aggregateExtractions, buildReport } from "@/lib/market-intel";
import { getUsageStatus } from "@/lib/usage";
import {
  MARKET_INTEL_REGION_LABELS,
  MARKET_INTEL_SENIORITY_LABELS,
  type MarketIntelJobExtraction,
  type MarketIntelRegion,
} from "@/lib/types";

export const maxDuration = 60;

// Cache TTL do relatório pronto (cargo × região).
const CACHE_TTL_DAYS = 14;
// Mínimo de vagas RELEVANTES pra publicar números com honestidade.
const MIN_RELEVANT_JOBS = 8;

/**
 * Market Intelligence — etapa 3 (finalize). Agrega as extrações EM CÓDIGO
 * (números auditáveis), pede ao Sonnet só o bloco "O que mais chamou
 * atenção" (proibido inventar números), persiste em analyses (consome 1
 * uso) e transforma o staging em cache pro próximo usuário.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  let reportId: string;
  try {
    const body = await request.json();
    reportId = String(body.reportId ?? "");
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: row } = await admin
    .from("market_reports")
    .select("id, status, region, raw_jobs, extractions, jobs_collected")
    .eq("id", reportId)
    .eq("created_by", user.id)
    .maybeSingle();

  if (!row || row.status !== "extracting") {
    return NextResponse.json({ error: "Relatório não encontrado ou já finalizado." }, { status: 404 });
  }

  const staging = row.raw_jobs as { role: string } | null;
  const role = staging?.role ?? "";
  const region = row.region as MarketIntelRegion;
  const extractions = (row.extractions as MarketIntelJobExtraction[]) ?? [];

  const aggregates = aggregateExtractions(extractions);
  if (aggregates.jobsAnalyzed < MIN_RELEVANT_JOBS) {
    // Coleta insuficiente: não publicamos números sem lastro (mesmo
    // princípio do salário omitido). Não consome uso do usuário.
    await admin.from("market_reports").update({ status: "failed", raw_jobs: null }).eq("id", reportId);
    return NextResponse.json(
      {
        error:
          "Não encontramos vagas relevantes o bastante para gerar um relatório confiável. Tente uma nomenclatura mais comum (em inglês) ou outra região.",
      },
      { status: 422 },
    );
  }

  // Estatísticas legíveis pro Sonnet — única fonte de números permitida.
  const statsJson = JSON.stringify(
    {
      vagas_relevantes_analisadas: aggregates.jobsAnalyzed,
      nomenclaturas: aggregates.titles,
      skills: aggregates.skills,
      ferramentas: aggregates.tools,
      responsabilidades: aggregates.responsibilities,
      senioridade: aggregates.seniority.map((s) => ({
        nivel: MARKET_INTEL_SENIORITY_LABELS[s.level],
        vagas: s.count,
        percentual: s.percent,
      })),
    },
    null,
    2,
  );

  let insights: string;
  try {
    insights = await writeMarketIntelInsights(role, MARKET_INTEL_REGION_LABELS[region], statsJson);
  } catch (error) {
    console.error("[market-intel/finalize] insights", error);
    return NextResponse.json(
      { error: "Não foi possível concluir o relatório agora. Tente de novo.", retryable: true },
      { status: 502 },
    );
  }

  const report = buildReport(role, region, row.jobs_collected, aggregates, insights);

  const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error: readyError } = await admin
    .from("market_reports")
    .update({ status: "ready", report, expires_at: expiresAt, raw_jobs: null })
    .eq("id", reportId);
  if (readyError) {
    // Cache que falha não pune o usuário — o relatório dele segue.
    console.error("MARKET_INTEL_CACHE_FAILED", { reportId, readyError });
  }

  const { error: insertError } = await admin.from("analyses").insert({
    user_id: user.id,
    tool_type: "market_intel",
    input_summary: role,
    input_data: { role, region, reportId },
    output_data: report,
    score: null,
  });
  if (insertError) {
    console.error("ANALYSIS_INSERT_FAILED", { userId: user.id, toolType: "market_intel", insertError });
  }

  const usage = await getUsageStatus(user.id, "market_intel");
  return NextResponse.json({ report, usage });
}
