import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateCvTailoring } from "@/lib/anthropic";
import { getUsageStatus } from "@/lib/usage";
import { extractTextFromPdf } from "@/lib/pdf";
import { validateProfileText } from "@/lib/profile-validation";

const MAX_TEXT_LENGTH = 20_000;
const MIN_JOB_DESCRIPTION_LENGTH = 30;

/**
 * CV Tailor. Recebe o CV (PDF opcional, reaproveitando lib/pdf.ts, ou texto
 * colado) + job description + cargo-alvo via FormData. Autenticação +
 * limite mensal + persistência em `analyses`, mesmo padrão de
 * /api/tools/headline.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const usage = await getUsageStatus(user.id, "cv_tailor");
  if (usage.limitReached) {
    return NextResponse.json(
      { error: "Você atingiu o limite gratuito deste mês.", code: "LIMIT_REACHED", usage },
      { status: 403 },
    );
  }

  let cvText: string;
  let jobDescription: string;
  let targetRole: string;
  let language: "en" | "pt";

  try {
    const formData = await request.formData();
    const file = formData.get("cvFile");
    const rawCvText = formData.get("cvText");
    jobDescription = String(formData.get("jobDescription") ?? "").trim();
    targetRole = String(formData.get("targetRole") ?? "").trim();
    language = formData.get("language") === "pt" ? "pt" : "en";

    if (file instanceof File && file.size > 0) {
      if (file.type !== "application/pdf") {
        return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
      }
      const buffer = await file.arrayBuffer();
      cvText = await extractTextFromPdf(buffer);
    } else {
      cvText = typeof rawCvText === "string" ? rawCvText : "";
    }
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o conteúdo enviado." }, { status: 400 });
  }

  cvText = cvText.trim().slice(0, MAX_TEXT_LENGTH);
  jobDescription = jobDescription.slice(0, MAX_TEXT_LENGTH);

  const cvValidationError = validateProfileText(cvText);
  if (cvValidationError) {
    return NextResponse.json({ error: cvValidationError }, { status: 400 });
  }
  if (jobDescription.length < MIN_JOB_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: "Cole a descrição completa da vaga." }, { status: 400 });
  }
  if (!targetRole) {
    return NextResponse.json({ error: "Informe o cargo-alvo." }, { status: 400 });
  }

  let result;
  try {
    result = await generateCvTailoring(cvText, jobDescription, targetRole, language);
  } catch (error) {
    console.error("[/api/tools/cv-tailor]", error);
    return NextResponse.json(
      { error: "Não foi possível adaptar seu currículo agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error: insertError } = await admin.from("analyses").insert({
    user_id: user.id,
    tool_type: "cv_tailor",
    input_summary: targetRole,
    input_data: { cvText, jobDescription, targetRole, language },
    output_data: result,
    score: result.compatibilityScore,
  });

  if (insertError) {
    // Tolerante a falha, mesmo padrão de /api/tools/headline e /api/leads.
    console.error("ANALYSIS_INSERT_FAILED", { userId: user.id, toolType: "cv_tailor", insertError });
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
