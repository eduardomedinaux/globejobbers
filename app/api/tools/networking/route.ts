import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateNetworkingMessages } from "@/lib/anthropic";
import { getActiveMarketProfile } from "@/lib/market-profile";
import { getUsageStatus } from "@/lib/usage";
import type { HeadlineLanguage, NetworkingRecipient } from "@/lib/types";

const VALID_RECIPIENTS: NetworkingRecipient[] = [
  "recruiter",
  "hiring_manager",
  "employee",
  "alumni",
];
const MAX_CONTEXT_LENGTH = 5000;

interface RequestBody {
  recipient?: unknown;
  company?: unknown;
  jobContext?: unknown;
  personalContext?: unknown;
  language?: unknown;
}

/**
 * Mensagens de Networking (apoio direto à mentoria): nota de conexão
 * (≤300 chars), follow-up e versão InMail, por tipo de destinatário.
 * Consome o Perfil de Mercado ativo quando existe (fail-open: sem perfil,
 * gera a partir dos campos informados). Mesmo padrão das demais rotas:
 * auth + limite mensal + persistência em `analyses`.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const usage = await getUsageStatus(user.id, "networking");
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

  const recipient = body.recipient as NetworkingRecipient;
  if (!VALID_RECIPIENTS.includes(recipient)) {
    return NextResponse.json({ error: "Escolha o tipo de destinatário." }, { status: 400 });
  }
  const company =
    typeof body.company === "string" ? body.company.trim().slice(0, 120) : "";
  const jobContext =
    typeof body.jobContext === "string" ? body.jobContext.trim().slice(0, MAX_CONTEXT_LENGTH) : "";
  const personalContext =
    typeof body.personalContext === "string"
      ? body.personalContext.trim().slice(0, MAX_CONTEXT_LENGTH)
      : "";
  const language: HeadlineLanguage = body.language === "pt" ? "pt" : "en";

  const profile = await getActiveMarketProfile(user.id);

  let result;
  try {
    result = await generateNetworkingMessages(
      recipient,
      company,
      jobContext,
      personalContext,
      language,
      profile,
    );
  } catch (error) {
    console.error("[/api/tools/networking]", error);
    return NextResponse.json(
      { error: "Não foi possível gerar suas mensagens agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error: insertError } = await admin.from("analyses").insert({
    user_id: user.id,
    tool_type: "networking",
    input_summary: `${recipient}${company ? ` — ${company}` : ""}`,
    input_data: {
      recipient,
      company,
      jobContext,
      personalContext,
      language,
      marketProfileId: profile?.id ?? null,
    },
    output_data: result,
    score: null,
  });

  if (insertError) {
    // Tolerante a falha, mesmo padrão das demais ferramentas.
    console.error("ANALYSIS_INSERT_FAILED", { userId: user.id, toolType: "networking", insertError });
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
