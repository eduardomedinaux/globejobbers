import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateHeadlineFromMarketProfile, generateHeadlineFromText } from "@/lib/anthropic";
import { getUsageStatus } from "@/lib/usage";
import type {
  HeadlineLanguage,
  MarketProfile,
  MarketProfileKeywords,
  TargetMarket,
} from "@/lib/types";

const MAX_HEADLINE_TEXT_LENGTH = 300;
const MAX_CONFIRMED_SPECIALTIES = 6;

interface RequestBody {
  mode?: "text" | "market";
  text?: string;
  marketProfileId?: unknown;
  confirmedSpecialties?: unknown;
}

/**
 * Headline Optimizer logado. Dois modos:
 *  - "text": cola a headline atual pra avaliar/reescrever (inalterado).
 *  - "market": gera 2 variações a partir do Perfil de Mercado salvo
 *    (metodologia da mentoria — ver PROPOSTA-PERFIL-DE-MERCADO.md). O modo
 *    "builder" (especialidades autodeclaradas) foi removido: era o
 *    anti-padrão da metodologia.
 *
 * Autenticação + limite mensal + persistência em `analyses`. O fluxo
 * completo perfil+headline consome 1 uso (contado aqui, na geração —
 * /api/market-profile não grava em analyses).
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const usage = await getUsageStatus(user.id, "headline");
  if (usage.limitReached) {
    return NextResponse.json(
      {
        error: "Você atingiu o limite gratuito deste mês.",
        code: "LIMIT_REACHED",
        usage,
      },
      { status: 403 },
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  let result;
  let score: number | null;
  let inputSummary: string;
  let inputData: Record<string, unknown>;

  try {
    if (body.mode === "text") {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) {
        return NextResponse.json({ error: "Cole sua headline atual." }, { status: 400 });
      }
      const truncated = text.slice(0, MAX_HEADLINE_TEXT_LENGTH);
      result = await generateHeadlineFromText(truncated);
      score = result.headlineScore;
      inputSummary = truncated;
      inputData = { mode: "text", text: truncated };
    } else if (body.mode === "market") {
      const marketProfileId =
        typeof body.marketProfileId === "string" ? body.marketProfileId : "";
      if (!marketProfileId) {
        return NextResponse.json({ error: "Perfil de Mercado não informado." }, { status: 400 });
      }

      const confirmedSpecialties = Array.isArray(body.confirmedSpecialties)
        ? body.confirmedSpecialties
            .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
            .map((s) => s.trim().slice(0, 60))
            .slice(0, MAX_CONFIRMED_SPECIALTIES)
        : [];

      // .eq("user_id") junto do id: perfil de outro usuário é 404, não vaza.
      const { data: row, error: fetchError } = await admin
        .from("market_profiles")
        .select()
        .eq("id", marketProfileId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError || !row) {
        return NextResponse.json({ error: "Perfil de Mercado não encontrado." }, { status: 404 });
      }

      // Persiste a confirmação (chips) — vale pras próximas ferramentas que
      // consumirem o perfil, não só pra esta geração.
      const { error: updateError } = await admin
        .from("market_profiles")
        .update({
          confirmed_specialties: confirmedSpecialties,
          updated_at: new Date().toISOString(),
        })
        .eq("id", marketProfileId);
      if (updateError) {
        // Não bloqueia a geração — a confirmação segue no prompt desta chamada.
        console.error("MARKET_PROFILE_CONFIRM_FAILED", { marketProfileId, updateError });
      }

      const profile: MarketProfile = {
        id: row.id as string,
        currentRole: row.current_role as string,
        targetRole: row.target_role as string,
        targetMarket: row.target_market as TargetMarket,
        seniority: row.seniority as string,
        language: (row.language as HeadlineLanguage) ?? "en",
        keywords: row.keywords as MarketProfileKeywords,
        inferredSpecialties: (row.inferred_specialties as string[]) ?? [],
        confirmedSpecialties,
        origin: row.origin as MarketProfile["origin"],
        createdAt: row.created_at as string,
      };

      result = await generateHeadlineFromMarketProfile(profile, confirmedSpecialties);
      // Sem score aqui: o resultado é um par de variações + cobertura, não
      // uma nota. `analyses.score` é nullable justamente pra isso.
      score = null;
      inputSummary = `${profile.targetRole} → ${profile.targetMarket}`;
      inputData = { mode: "market", marketProfileId, confirmedSpecialties };
    } else {
      return NextResponse.json({ error: "Modo inválido." }, { status: 400 });
    }
  } catch (error) {
    console.error("[/api/tools/headline]", error);
    return NextResponse.json(
      { error: "Não foi possível gerar sua headline agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }

  const { error: insertError } = await admin.from("analyses").insert({
    user_id: user.id,
    tool_type: "headline",
    input_summary: inputSummary,
    input_data: inputData,
    output_data: result,
    score,
  });

  if (insertError) {
    // Não bloqueia o usuário por erro nosso ao salvar — mesmo padrão de
    // tolerância a falha de /api/leads. Efeito colateral: a contagem de uso
    // deste request específico pode ficar levemente subestimada.
    console.error("ANALYSIS_INSERT_FAILED", { userId: user.id, toolType: "headline", insertError });
  }

  return NextResponse.json({
    analysis: result,
    usage: {
      used: usage.used + 1,
      limit: usage.limit,
      remaining: Math.max(0, usage.limit - (usage.used + 1)),
    },
  });
}
