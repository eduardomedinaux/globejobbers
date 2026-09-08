import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { extractMarketProfile } from "@/lib/anthropic";
import { corpusJobs, jobTextAt } from "@/lib/onboarding";
import { rowToMarketProfile } from "@/lib/market-profile";
import { getActiveDocument } from "@/lib/user-documents";
import { getUsageStatus } from "@/lib/usage";

// Mesmos guarda-corpos de /api/market-profile (vagas coladas): o Perfil de
// Mercado nasce das MESMAS validações, só muda a origem das vagas (corpus
// do Market Intelligence em vez de colar).
const MIN_JOB_TEXT_LENGTH = 300;
const MAX_JOB_TEXT_LENGTH = 15000;
const MAX_SELECTED = 5;
const MIN_SELECTED = 1;

/**
 * Passo 3 do onboarding: o usuário marcou 1-5 vagas do corpus → montamos o
 * Perfil de Mercado com o fluxo existente (extractMarketProfile + insert em
 * market_profiles). O cargo atual vem do PDF (extracted_role), quando houver.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  // Mesma contabilidade do fluxo de colar vagas: o limite checado é o de
  // headline (o uso é consumido na geração da headline, não aqui).
  const usage = await getUsageStatus(user.id, "headline");
  if (usage.limitReached) {
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

  let reportId: string;
  let indexes: number[];
  try {
    const body = await request.json();
    reportId = String(body.reportId ?? "");
    indexes = Array.isArray(body.indexes)
      ? body.indexes.filter((i: unknown): i is number => Number.isInteger(i)).slice(0, MAX_SELECTED)
      : [];
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!reportId || indexes.length < MIN_SELECTED) {
    return NextResponse.json({ error: "Marque pelo menos 1 vaga." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: report } = await admin
    .from("market_reports")
    .select("id, raw_jobs")
    .eq("id", reportId)
    .eq("status", "ready")
    .maybeSingle();
  if (!report || corpusJobs(report).length === 0) {
    return NextResponse.json(
      { error: "Essas vagas não estão mais disponíveis. Rode o Market Intelligence de novo." },
      { status: 404 },
    );
  }

  const jobs = indexes
    .map((i) => jobTextAt(report, i))
    .filter((t): t is string => typeof t === "string" && t.length >= MIN_JOB_TEXT_LENGTH)
    .map((t) => t.slice(0, MAX_JOB_TEXT_LENGTH));
  if (jobs.length === 0) {
    return NextResponse.json(
      { error: "As vagas marcadas estão incompletas. Tente outras — ou cole as suas." },
      { status: 400 },
    );
  }

  // Cargo atual: o extraído do PDF no passo 1 (contexto opcional da extração).
  const doc = await getActiveDocument(user.id, "linkedin_pdf");
  const currentRole = doc?.extractedRole ?? "";

  let extraction;
  try {
    extraction = await extractMarketProfile(currentRole || null, jobs);
  } catch (error) {
    console.error("[/api/onboarding/select-jobs]", error);
    return NextResponse.json(
      { error: "Não foi possível analisar as vagas agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }

  const { data: row, error: insertError } = await admin
    .from("market_profiles")
    .insert({
      user_id: user.id,
      current_role: currentRole || null,
      target_role: extraction.identified.targetRole,
      target_market: extraction.identified.targetMarket,
      seniority: extraction.identified.seniority,
      language: "en",
      keywords: extraction.keywords,
      source_jobs: jobs.map((text, i) => ({ index: i + 1, text, chars: text.length })),
    })
    .select()
    .single();

  if (insertError || !row) {
    console.error("MARKET_PROFILE_INSERT_FAILED", { userId: user.id, insertError, via: "onboarding" });
    return NextResponse.json(
      { error: "Não foi possível salvar seu Perfil de Mercado. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile: rowToMarketProfile(row) });
}
