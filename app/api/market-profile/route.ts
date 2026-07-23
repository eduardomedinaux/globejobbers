import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { extractMarketProfile } from "@/lib/anthropic";
import { getUsageStatus } from "@/lib/usage";
import type {
  HeadlineLanguage,
  MarketProfile,
  MarketProfileKeywords,
  MarketProfileTarget,
  TargetMarket,
} from "@/lib/types";

// Vaga colada precisa parecer uma descrição real (mesmo princípio do PDF
// ilegível: input ruim não vira perfil-lixo silenciosamente).
const MIN_JOB_TEXT_LENGTH = 300;
const MAX_JOB_TEXT_LENGTH = 15000;
const MAX_JOBS = 3;

const VALID_MARKETS: TargetMarket[] = ["us_remote", "canada", "europe", "latam_remote", "other"];

interface RequestBody {
  target?: unknown;
  /** 1-3 descrições de vaga coladas. Ausente/vazio + synthetic=true → fallback estimado. */
  jobs?: unknown;
  synthetic?: unknown;
}

function validateTarget(raw: unknown): MarketProfileTarget | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const currentRole = typeof obj.currentRole === "string" ? obj.currentRole.trim().slice(0, 120) : "";
  const targetRole = typeof obj.targetRole === "string" ? obj.targetRole.trim().slice(0, 120) : "";
  const seniority = typeof obj.seniority === "string" ? obj.seniority.trim().slice(0, 60) : "";
  const targetMarket = obj.targetMarket as TargetMarket;
  const language: HeadlineLanguage = obj.language === "pt" ? "pt" : "en";

  if (!currentRole || !targetRole || !seniority || !VALID_MARKETS.includes(targetMarket)) {
    return null;
  }

  return { currentRole, targetRole, targetMarket, seniority, language };
}

/** Converte a linha do banco (snake_case) pro shape do front (lib/types.ts). */
function rowToProfile(row: Record<string, unknown>): MarketProfile {
  return {
    id: row.id as string,
    currentRole: row.current_role as string,
    targetRole: row.target_role as string,
    targetMarket: row.target_market as TargetMarket,
    seniority: row.seniority as string,
    language: (row.language as HeadlineLanguage) ?? "en",
    keywords: row.keywords as MarketProfileKeywords,
    inferredSpecialties: (row.inferred_specialties as string[]) ?? [],
    confirmedSpecialties: (row.confirmed_specialties as string[]) ?? [],
    origin: row.origin as MarketProfile["origin"],
    createdAt: row.created_at as string,
  };
}

/**
 * Cria o Perfil de Mercado (Passos 1-2 do wizard → Passo 3).
 *
 * Contabilidade de uso: a criação NÃO grava em `analyses` (o fluxo completo
 * perfil+headline consome 1 uso de headline, contado na geração). Mas o
 * limite é checado AQUI também, pra não deixar o usuário colar 3 vagas e só
 * descobrir o limite estourado na hora de gerar.
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

  const target = validateTarget(body.target);
  if (!target) {
    return NextResponse.json(
      { error: "Preencha cargo atual, cargo desejado, mercado e senioridade." },
      { status: 400 },
    );
  }

  const synthetic = body.synthetic === true;
  let jobs: string[] = [];

  if (!synthetic) {
    const rawJobs = Array.isArray(body.jobs) ? body.jobs : [];
    jobs = rawJobs
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
  }

  let extraction;
  try {
    extraction = await extractMarketProfile(target, synthetic ? null : jobs);
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
      current_role: target.currentRole,
      target_role: target.targetRole,
      target_market: target.targetMarket,
      seniority: target.seniority,
      language: target.language,
      keywords: extraction.keywords,
      inferred_specialties: extraction.inferredSpecialties,
      confirmed_specialties: [],
      origin: synthetic ? "synthetic" : "jobs",
      source_jobs: synthetic ? null : jobs.map((text, i) => ({ index: i + 1, text, chars: text.length })),
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

  return NextResponse.json({ profile: rowToProfile(row) });
}

/** Devolve o perfil ativo (mais recente) do usuário — consumido pelas outras ferramentas no futuro. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("market_profiles")
    .select()
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("MARKET_PROFILE_FETCH_FAILED", { userId: user.id, error });
    return NextResponse.json({ error: "Não foi possível carregar seu perfil." }, { status: 500 });
  }

  return NextResponse.json({ profile: data ? rowToProfile(data) : null });
}
