import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { AREA_OPTIONS, AREA_ROLE_KEYS, curatedResult, type QuizArea, type QuizResult } from "@/lib/quiz";
import type { MarketIntelReport } from "@/lib/types";

// Relatório do cache vale como referência por mais tempo que o TTL do MI
// (14 dias): aqui é só uma prévia, e vaga real de 2 meses atrás ainda diz
// muito mais que uma lista fixa.
const MAX_REPORT_AGE_DAYS = 60;

/**
 * Mini-resultado do quiz público. NUNCA dispara coleta de vagas (JSearch é
 * pago e o tráfego aqui é anônimo): só lê um relatório pronto do cache do
 * Market Intelligence pra área escolhida. Sem relatório, devolve a versão
 * fixa por área (lib/quiz.ts), sem percentuais.
 */
export async function POST(request: NextRequest) {
  let area: QuizArea;
  try {
    const body = (await request.json()) as { area?: unknown };
    if (!AREA_OPTIONS.some((o) => o.value === body.area)) {
      return NextResponse.json({ error: "Área inválida." }, { status: 400 });
    }
    area = body.area as QuizArea;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const roleKeys = AREA_ROLE_KEYS[area];
  if (roleKeys.length > 0) {
    try {
      const since = new Date(Date.now() - MAX_REPORT_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await getSupabaseAdmin()
        .from("market_reports")
        .select("report, region, created_at")
        .in("role_key", roleKeys)
        .eq("status", "ready")
        .gt("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10);

      // Prioriza EUA (o mercado que a maioria do público mira); senão o mais recente.
      const row = data?.find((r) => r.region === "us") ?? data?.[0];
      const report = row?.report as MarketIntelReport | undefined;
      if (report && report.jobsAnalyzed >= 10 && report.titles.length > 0) {
        const result: QuizResult = {
          source: "market",
          jobsAnalyzed: report.jobsAnalyzed,
          titles: report.titles.slice(0, 3).map((t) => ({ term: t.term, percent: t.percent })),
          skills: report.skills.slice(0, 5).map((s) => ({ term: s.term, percent: s.percent })),
        };
        return NextResponse.json(result);
      }
    } catch (err) {
      // Cache indisponível não quebra o quiz: cai pra versão fixa.
      console.error("QUIZ_RESULT_CACHE_FAILED", { area, err });
    }
  }

  return NextResponse.json(curatedResult(area));
}
