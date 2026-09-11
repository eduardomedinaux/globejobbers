import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUsageStatus } from "@/lib/usage";
import type {
  InterviewAnswerFeedback,
  InterviewPrepResult,
  InterviewQuestion,
  InterviewQuestionCategory,
} from "@/lib/types";

const CATEGORIES: InterviewQuestionCategory[] = ["intro", "behavioral", "role_specific", "reverse"];
const MAX_QUESTIONS = 6;

function clamp(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
  return Math.max(0, Math.min(100, n));
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function strList(value: unknown, maxItems: number, maxLen: number): string[] {
  return Array.isArray(value)
    ? value
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim().slice(0, maxLen))
        .slice(0, maxItems)
    : [];
}

/**
 * Interview Prep — etapa 3 (finish): persiste a sessão inteira como UMA
 * análise (consome 1 uso — a contagem de uso é a contagem de linhas em
 * `analyses`, ver lib/usage.ts). O payload é remontado campo a campo no
 * servidor: nada entra no banco sem sanitização, mesmo vindo do nosso
 * próprio client. Score da análise = média das notas das respostas.
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const targetRole = str(body.targetRole, 80);
  const targetMarketLabel = str(body.marketLabel, 80);
  // Vaga específica (opcional): guardamos só o título derivado no client —
  // suficiente pro histórico ("Treino pra {vaga}") sem inchar o banco.
  const jobTitle = str(body.jobTitle, 120) || null;

  const questions: InterviewQuestion[] = (Array.isArray(body.questions) ? body.questions : [])
    .filter((q): q is Record<string, unknown> => typeof q === "object" && q !== null)
    .map((q) => ({
      category: CATEGORIES.includes(q.category as InterviewQuestionCategory)
        ? (q.category as InterviewQuestionCategory)
        : ("behavioral" as const),
      question: str(q.question, 500),
      why: str(q.why, 600),
    }))
    .filter((q) => q.question.length > 0)
    .slice(0, MAX_QUESTIONS);

  const answers: InterviewAnswerFeedback[] = (Array.isArray(body.answers) ? body.answers : [])
    .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
    .map((a) => ({
      question: str(a.question, 500),
      answer: str(a.answer, 4000),
      clarity: clamp(a.clarity),
      evidence: clamp(a.evidence),
      english: clamp(a.english),
      feedback: str(a.feedback, 2000),
      englishFixes: strList(a.englishFixes, 6, 400),
      redFlags: strList(a.redFlags, 4, 300),
      improvedAnswer: str(a.improvedAnswer, 3000),
    }))
    .filter((a) => a.question.length > 0 && a.answer.length > 0 && a.feedback.length > 0)
    .slice(0, MAX_QUESTIONS);

  if (!targetRole || questions.length === 0 || answers.length === 0) {
    return NextResponse.json(
      { error: "Responda pelo menos 1 pergunta antes de encerrar o treino." },
      { status: 400 },
    );
  }

  const result: InterviewPrepResult = {
    kind: "interview_prep",
    targetRole,
    targetMarketLabel,
    jobTitle,
    questions,
    answers,
  };

  // Média das 3 notas de cada resposta — calculada AQUI, em código.
  const score = Math.round(
    answers.reduce((sum, a) => sum + (a.clarity + a.evidence + a.english) / 3, 0) / answers.length,
  );

  const admin = getSupabaseAdmin();
  const { data: row, error: insertError } = await admin
    .from("analyses")
    .insert({
      user_id: user.id,
      tool_type: "interview_prep",
      input_summary: targetRole,
      input_data: { targetRole, targetMarketLabel, jobTitle, answered: answers.length },
      output_data: result,
      score,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    // Aqui o insert É o produto (sessão salva + uso contado) — erro é
    // bloqueante e o client pode tentar de novo sem perder o treino.
    console.error("ANALYSIS_INSERT_FAILED", {
      userId: user.id,
      toolType: "interview_prep",
      insertError,
    });
    return NextResponse.json(
      { error: "Não foi possível salvar sua sessão. Tente encerrar de novo." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    analysisId: row.id,
    score,
    usage: {
      used: usage.used + 1,
      limit: usage.limit,
      remaining: Math.max(0, usage.limit - (usage.used + 1)),
    },
  });
}
