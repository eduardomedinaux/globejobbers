import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { evaluateInterviewAnswer } from "@/lib/anthropic";
import { getActiveDocument } from "@/lib/user-documents";
import { getUsageStatus } from "@/lib/usage";

const MIN_ANSWER_LENGTH = 40;
const MAX_ANSWER_LENGTH = 4000;
// Trecho do perfil/CV que ancora a improvedAnswer (regra dos números).
const MAX_PROFILE_EXCERPT = 6000;
// Vaga específica (opcional) — mesmos limites do start.
const MIN_JOB_TEXT_CHARS = 200;
const MAX_JOB_TEXT_CHARS = 12000;

/**
 * Interview Prep — etapa 2 (answer): avalia UMA resposta. O feedback usa o
 * perfil/CV salvo como única fonte extra de fatos — a versão melhorada
 * nunca inventa número (placeholder [[...]] quando faltar). Servidor
 * stateless: pergunta e resposta vêm no payload; a sessão vive no client
 * até o finish.
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

  let question = "";
  let answer = "";
  let targetRole = "";
  let marketLabel = "";
  let jobText = "";
  try {
    const body = await request.json();
    question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
    answer = typeof body.answer === "string" ? body.answer.trim().slice(0, MAX_ANSWER_LENGTH) : "";
    targetRole = typeof body.targetRole === "string" ? body.targetRole.trim().slice(0, 80) : "";
    marketLabel = typeof body.marketLabel === "string" ? body.marketLabel.trim().slice(0, 80) : "";
    const rawJob = typeof body.jobText === "string" ? body.jobText.trim() : "";
    jobText = rawJob.length >= MIN_JOB_TEXT_CHARS ? rawJob.slice(0, MAX_JOB_TEXT_CHARS) : "";
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: "Pergunta ausente." }, { status: 400 });
  }
  if (answer.length < MIN_ANSWER_LENGTH) {
    return NextResponse.json(
      {
        error:
          "Escreva uma resposta completa (como você falaria na entrevista) — respostas de uma linha não dão material pro feedback.",
      },
      { status: 400 },
    );
  }

  // Fatos reais do usuário: PDF do LinkedIn (preferido) ou CV salvo.
  const doc =
    (await getActiveDocument(user.id, "linkedin_pdf")) ??
    (await getActiveDocument(user.id, "cv"));
  const profileExcerpt = doc?.content.slice(0, MAX_PROFILE_EXCERPT) ?? "";

  let feedback;
  try {
    feedback = await evaluateInterviewAnswer(
      question,
      answer,
      targetRole,
      marketLabel,
      profileExcerpt,
      jobText,
    );
  } catch (error) {
    console.error("[/api/tools/interview-prep/answer]", error);
    return NextResponse.json(
      { error: "Não foi possível avaliar sua resposta agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }

  return NextResponse.json({ feedback: { question, answer, ...feedback } });
}
