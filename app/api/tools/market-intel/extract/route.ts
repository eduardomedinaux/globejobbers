import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { extractJobsBatch } from "@/lib/anthropic";
import type { MarketIntelJobExtraction } from "@/lib/types";
import type { SourcedJob } from "@/lib/job-source";

export const maxDuration = 60;

// Mesmo valor de ../start/route.ts.
const BATCH_SIZE = 12;

/**
 * Market Intelligence — etapa 2 (extract). O client chama uma vez por lote
 * (batchIndex 0..N): cada chamada processa até 12 vagas com Haiku e acumula
 * o resultado no staging. Lotes sequenciais mantêm a chamada dentro do
 * timeout da Vercel e do rate limit da conta Anthropic (tier baixo).
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  let reportId: string;
  let batchIndex: number;
  try {
    const body = await request.json();
    reportId = String(body.reportId ?? "");
    batchIndex = Number(body.batchIndex);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!reportId || !Number.isInteger(batchIndex) || batchIndex < 0) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: row } = await admin
    .from("market_reports")
    .select("id, status, raw_jobs, extractions, created_by")
    .eq("id", reportId)
    .eq("created_by", user.id)
    .maybeSingle();

  if (!row || row.status !== "extracting") {
    return NextResponse.json({ error: "Relatório não encontrado ou já finalizado." }, { status: 404 });
  }

  const staging = row.raw_jobs as { role: string; jobs: SourcedJob[] } | null;
  const jobs = staging?.jobs ?? [];
  const batch = jobs.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
  if (batch.length === 0) {
    return NextResponse.json({ error: "Lote fora do intervalo." }, { status: 400 });
  }

  let extracted: MarketIntelJobExtraction[];
  try {
    extracted = await extractJobsBatch(
      staging?.role ?? "",
      batch.map((j) => `${j.title}\n\n${j.description.slice(0, 6000)}`),
    );
  } catch (error) {
    console.error("[market-intel/extract] batch", { reportId, batchIndex, error });
    return NextResponse.json(
      { error: "Falha ao analisar este lote de vagas. Tente de novo.", retryable: true },
      { status: 502 },
    );
  }

  const accumulated = [
    ...((row.extractions as MarketIntelJobExtraction[]) ?? []),
    ...extracted,
  ];
  const { error: updateError } = await admin
    .from("market_reports")
    .update({ extractions: accumulated })
    .eq("id", reportId);

  if (updateError) {
    console.error("MARKET_INTEL_EXTRACT_SAVE_FAILED", { reportId, batchIndex, updateError });
    return NextResponse.json(
      { error: "Falha ao salvar o lote. Tente de novo.", retryable: true },
      { status: 500 },
    );
  }

  return NextResponse.json({
    processed: accumulated.length,
    total: jobs.length,
    relevantSoFar: accumulated.filter((e) => e.relevant).length,
  });
}
