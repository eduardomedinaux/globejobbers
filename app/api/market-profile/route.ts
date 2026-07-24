import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { extractMarketProfile } from "@/lib/anthropic";
import { getActiveMarketProfile, rowToMarketProfile } from "@/lib/market-profile";
import { getUsageStatus } from "@/lib/usage";

// Vaga colada precisa parecer uma descrição real (mesmo princípio do PDF
// ilegível: input ruim não vira perfil-lixo silenciosamente).
const MIN_JOB_TEXT_LENGTH = 300;
const MAX_JOB_TEXT_LENGTH = 15000;
const MAX_JOBS = 5;

interface RequestBody {
  /** Cargo atual — opcional, só contexto (a fonte de verdade são as vagas). */
  currentRole?: unknown;
  /** 1-5 descrições de vaga (coladas ou importadas de URL no client). */
  jobs?: unknown;
}

/**
 * Cria o Perfil de Mercado lendo as vagas desejadas: cargo-alvo,
 * senioridade e mercado são IDENTIFICADOS pela IA (o usuário confirma/edita
 * na tela seguinte — nunca declara). Ver PROPOSTA-PERFIL-DE-MERCADO.md.
 *
 * Contabilidade de uso: a criação NÃO grava em `analyses` (o fluxo completo
 * perfil+headline consome 1 uso de headline, contado na geração). Mas o
 * limite é checado AQUI também, pra não deixar o usuário colar as vagas e
 * só descobrir o limite estourado na hora de gerar.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const usage = await getUsageStatus(user.id, "headline");
  if (usage.limitReached) {
    return NextResponse.json(
      { error: "Você atingiu o limite gratuito deste mês.", code: "LIMIT_REACHED", usage },
      { status: 403 },
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const currentRole =
    typeof body.currentRole === "string" ? body.currentRole.trim().slice(0, 120) : "";

  const rawJobs = Array.isArray(body.jobs) ? body.jobs : [];
  const jobs = rawJobs
    .filter((j): j is string => typeof j === "string" && j.trim().length > 0)
    .map((j) => j.trim().slice(0, MAX_JOB_TEXT_LENGTH))
    .slice(0, MAX_JOBS);

  if (jobs.length === 0) {
    return NextResponse.json({ error: "Cole pelo menos 1 descrição de vaga." }, { status: 400 });
  }

  const tooShort = jobs.findIndex((j) => j.length < MIN_JOB_TEXT_LENGTH);
  if (tooShort !== -1) {
    return NextResponse.json(
      {
        error: `A vaga ${tooShort + 1} parece incompleta. Cole a descrição completa (requisitos, responsabilidades).`,
      },
      { status: 400 },
    );
  }

  let extraction;
  try {
    extraction = await extractMarketProfile(currentRole || null, jobs);
  } catch (error) {
    console.error("[/api/market-profile]", error);
    return NextResponse.json(
      { error: "Não foi possível analisar as vagas agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }

  const admin = getSupabaseAdmin();
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
    // Diferente do padrão fail-open de /api/leads: sem a linha no banco não
    // há id pra gerar a headline depois — aqui o erro é bloqueante mesmo.
    console.error("MARKET_PROFILE_INSERT_FAILED", { userId: user.id, insertError });
    return NextResponse.json(
      { error: "Não foi possível salvar seu Perfil de Mercado. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile: rowToMarketProfile(row) });
}

/** Devolve o perfil ativo (mais recente) do usuário — consumido pelo LinkedIn Review e futuras ferramentas. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const profile = await getActiveMarketProfile(user.id);
  return NextResponse.json({ profile });
}
