import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { generateInterviewQuestions } from "@/lib/anthropic";
import { getActiveMarketProfile } from "@/lib/market-profile";
import { getUsageStatus } from "@/lib/usage";
import { TARGET_MARKET_LABELS, type MarketProfile } from "@/lib/types";

// Sem Perfil de Mercado o treino ainda funciona (cargo digitado), mas o
// caminho premium é o perfil — as perguntas saem ancoradas em vagas reais.
const FALLBACK_MARKET_LABEL = "Mercado internacional (remoto)";

// Vaga específica (opcional): abaixo do mínimo não é uma vaga de verdade;
// o teto protege o custo do prompt (a descrição entra em TODAS as chamadas).
const MIN_JOB_TEXT_CHARS = 200;
const MAX_JOB_TEXT_CHARS = 12000;

function keywordsBlock(profile: MarketProfile): string {
  const groups = [
    ["Hard skills", profile.keywords.hardSkills],
    ["Soft skills", profile.keywords.softSkills],
    ["Ferramentas & tecnologias", profile.keywords.tools],
    ["Responsabilidades", profile.keywords.responsibilities],
    ["Termos ATS", profile.keywords.atsTerms],
  ] as const;
  return groups
    .map(
      ([label, list]) =>
        `${label}: ${list.map((k) => `${k.term} (${k.count}x)`).join(", ") || "—"}`,
    )
    .join("\n");
}

/**
 * Interview Prep — etapa 1 (start): gera as 6 perguntas da sessão a partir
 * do Perfil de Mercado ativo (ou do cargo digitado, no fallback). NÃO
 * consome uso — o uso é consumido no finish, quando a sessão vira análise.
 * O limite é checado aqui também, pra ninguém treinar 6 respostas e só
 * descobrir o paywall no fim (mesmo padrão do /api/market-profile).
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const usage = await getUsageStatus(user.id, "interview_prep");
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

  let typedRole = "";
  let jobText = "";
  try {
    const body = await request.json();
    typedRole = typeof body.role === "string" ? body.role.trim().slice(0, 80) : "";
    // Vaga específica (opcional): âncora principal das perguntas quando
    // presente. Texto muito curto não dá âncora — tratamos como ausente.
    const rawJob = typeof body.jobText === "string" ? body.jobText.trim() : "";
    jobText = rawJob.length >= MIN_JOB_TEXT_CHARS ? rawJob.slice(0, MAX_JOB_TEXT_CHARS) : "";
  } catch {
    // Body vazio é válido — o cargo pode vir do Perfil de Mercado.
  }

  const profile = await getActiveMarketProfile(user.id);
  const targetRole = profile?.targetRole ?? typedRole;
  if (targetRole.trim().length < 2) {
    return NextResponse.json(
      { error: "Informe o cargo que você quer treinar (ou crie seu Perfil de Mercado)." },
      { status: 400 },
    );
  }
  const marketLabel = profile ? TARGET_MARKET_LABELS[profile.targetMarket] : FALLBACK_MARKET_LABEL;

  let questions;
  try {
    questions = await generateInterviewQuestions(
      targetRole,
      profile?.seniority ?? "",
      marketLabel,
      profile ? keywordsBlock(profile) : "",
      jobText,
    );
  } catch (error) {
    console.error("[/api/tools/interview-prep/start]", error);
    return NextResponse.json(
      { error: "Não foi possível montar sua sessão agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    questions,
    targetRole,
    marketLabel,
    fromProfile: Boolean(profile),
    jobProvided: jobText.length > 0,
    usage,
  });
}
