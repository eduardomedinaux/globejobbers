import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { expandRoleQueries } from "@/lib/anthropic";
import { searchJobs } from "@/lib/job-source";
import { cacheKeyRole } from "@/lib/market-intel";
import { getUsageStatus } from "@/lib/usage";
import type { MarketIntelRegion, MarketIntelReport } from "@/lib/types";

export const maxDuration = 60;

const REGIONS: MarketIntelRegion[] = ["us", "europe", "latam", "br"];
// Teto de requisições ao JSearch por relatório fresco (custo previsível:
// free tier = 200/mês → ~8 relatórios; plano Pro US$25 = 10k/mês).
const MAX_SOURCE_REQUESTS = 24;
// Teto de vagas que seguem pra extração (controla custo Haiku e nº de lotes).
const MAX_JOBS = 120;
// Mesmo valor usado em ../extract/route.ts — vagas por lote de extração.
const MARKET_INTEL_BATCH_SIZE = 12;

/**
 * Market Intelligence — etapa 1 (start). Fluxo completo orquestrado pelo
 * client (cabe no timeout da Vercel e no rate limit da conta Anthropic):
 *   start   → cache? devolve pronto : coleta vagas e cria staging
 *   extract → processa um lote de vagas por chamada (Haiku)
 *   finalize→ agrega em código + insight (Sonnet) + persiste + cacheia
 *
 * Cache por (cargo normalizado × região), TTL 14 dias: o segundo usuário
 * do mesmo mercado recebe o relatório pronto — custo ~zero.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const usage = await getUsageStatus(user.id, "market_intel");
  if (usage.limitReached) {
    // Degustação esgotada no free → paywall (a UI leva pra /assinatura).
    if (usage.plan === "free") {
      return NextResponse.json(
        { error: "Seu uso gratuito desta ferramenta acabou.", code: "PLAN_REQUIRED", usage },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "Você atingiu o limite do seu plano neste mês.", code: "LIMIT_REACHED", usage },
      { status: 403 },
    );
  }

  let role: string;
  let region: MarketIntelRegion;
  try {
    const body = await request.json();
    role = String(body.role ?? "").trim().slice(0, 80);
    region = body.region;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (role.length < 2) {
    return NextResponse.json({ error: "Informe o cargo que você quer pesquisar." }, { status: 400 });
  }
  if (!REGIONS.includes(region)) {
    return NextResponse.json({ error: "Região inválida." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const roleKey = cacheKeyRole(role);

  // Cache: relatório pronto e não expirado pro mesmo (cargo × região).
  const { data: cached } = await admin
    .from("market_reports")
    .select("id, report")
    .eq("role_key", roleKey)
    .eq("region", region)
    .eq("status", "ready")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached?.report) {
    const report = cached.report as MarketIntelReport;
    // Relatório servido conta como uso (é o valor entregue) — histórico incluso.
    const { error: insertError } = await admin.from("analyses").insert({
      user_id: user.id,
      tool_type: "market_intel",
      input_summary: role,
      input_data: { role, region, cachedReportId: cached.id },
      output_data: report,
      score: null,
    });
    if (insertError) {
      console.error("ANALYSIS_INSERT_FAILED", { userId: user.id, toolType: "market_intel", insertError });
    }
    return NextResponse.json({ cached: true, report });
  }

  // Coleta fresca: expande nomenclaturas e busca em paralelo.
  let queries: string[];
  try {
    queries = await expandRoleQueries(role);
  } catch (error) {
    console.error("[market-intel/start] expansion", error);
    queries = [role];
  }

  let sourced;
  try {
    sourced = await searchJobs(queries, region, MAX_SOURCE_REQUESTS);
  } catch (error) {
    console.error("[market-intel/start] search", error);
    return NextResponse.json(
      { error: "Não foi possível coletar vagas agora. Tente novamente em instantes." },
      { status: 502 },
    );
  }

  const jobs = sourced.jobs.slice(0, MAX_JOBS);
  if (jobs.length < 10) {
    return NextResponse.json(
      {
        error:
          "Encontramos poucas vagas para esse cargo nessa região. Tente uma nomenclatura mais comum (em inglês) ou outra região.",
      },
      { status: 422 },
    );
  }

  const { data: row, error: stagingError } = await admin
    .from("market_reports")
    .insert({
      created_by: user.id,
      role_key: roleKey,
      region,
      status: "extracting",
      raw_jobs: { role, queries, jobs },
      jobs_collected: jobs.length,
    })
    .select("id")
    .single();

  if (stagingError || !row) {
    console.error("MARKET_INTEL_STAGING_FAILED", { userId: user.id, stagingError });
    return NextResponse.json(
      { error: "Não foi possível iniciar o relatório. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    cached: false,
    reportId: row.id,
    totalJobs: jobs.length,
    batchSize: MARKET_INTEL_BATCH_SIZE,
    queries,
  });
}
