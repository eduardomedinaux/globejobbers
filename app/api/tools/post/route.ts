import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generatePost } from "@/lib/anthropic";
import { getActiveMarketProfile } from "@/lib/market-profile";
import { getUsageStatus } from "@/lib/usage";
import type { HeadlineLanguage } from "@/lib/types";

// O post nasce de uma história/tema REAL do usuário — tema raso demais não
// tem matéria-prima (mesmo princípio de validação de input das outras
// ferramentas: input ruim não vira conteúdo-lixo silenciosamente).
const MIN_TOPIC_LENGTH = 80;
const MAX_TOPIC_LENGTH = 5000;

interface RequestBody {
  topic?: unknown;
  language?: unknown;
}

/**
 * Criador de Posts (apoio direto à mentoria): 2 variações (story + insight)
 * posicionadas nas keywords do mercado-alvo. Consome o Perfil de Mercado
 * ativo quando existe. Auth + limite mensal + persistência em `analyses`.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const usage = await getUsageStatus(user.id, "post");
  if (usage.plan === "free") {
    // Cobrança desde o início: sem plano ativo não há acesso (ver lib/usage.ts).
    return NextResponse.json(
      { error: "Sua conta ainda não tem um plano ativo.", code: "PLAN_REQUIRED", usage },
      { status: 403 },
    );
  }
  if (usage.limitReached) {
    return NextResponse.json(
      { error: "Você atingiu o limite do seu plano neste mês.", code: "LIMIT_REACHED", usage },
      { status: 403 },
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, MAX_TOPIC_LENGTH) : "";
  if (topic.length < MIN_TOPIC_LENGTH) {
    return NextResponse.json(
      {
        error:
          "Conte um pouco mais sobre o tema — a história real é a matéria-prima do post (detalhes, contexto, o que aconteceu).",
      },
      { status: 400 },
    );
  }
  const language: HeadlineLanguage = body.language === "pt" ? "pt" : "en";

  const profile = await getActiveMarketProfile(user.id);

  let result;
  try {
    result = await generatePost(topic, language, profile);
  } catch (error) {
    console.error("[/api/tools/post]", error);
    return NextResponse.json(
      { error: "Não foi possível gerar seu post agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error: insertError } = await admin.from("analyses").insert({
    user_id: user.id,
    tool_type: "post",
    input_summary: topic.slice(0, 200),
    input_data: { topic, language, marketProfileId: profile?.id ?? null },
    output_data: result,
    score: null,
  });

  if (insertError) {
    // Tolerante a falha, mesmo padrão das demais ferramentas.
    console.error("ANALYSIS_INSERT_FAILED", { userId: user.id, toolType: "post", insertError });
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
