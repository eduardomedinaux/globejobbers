import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateHeadlineFromAnswers, generateHeadlineFromText } from "@/lib/anthropic";
import { getUsageStatus } from "@/lib/usage";
import type { HeadlineBuilderAnswers } from "@/lib/types";

const MAX_HEADLINE_TEXT_LENGTH = 300;

interface RequestBody {
  mode?: "text" | "builder";
  text?: string;
  answers?: unknown;
}

function validateBuilderAnswers(raw: unknown): HeadlineBuilderAnswers | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const currentRole = typeof obj.currentRole === "string" ? obj.currentRole.trim() : "";
  const specialty = typeof obj.specialty === "string" ? obj.specialty.trim() : "";
  const targetIndustry = typeof obj.targetIndustry === "string" ? obj.targetIndustry.trim() : "";
  const notableAchievement =
    typeof obj.notableAchievement === "string" ? obj.notableAchievement.trim() : "";
  const seniorityLevel = typeof obj.seniorityLevel === "string" ? obj.seniorityLevel.trim() : "";
  const yearsOfExperience = Number(obj.yearsOfExperience);
  const keySkills = Array.isArray(obj.keySkills)
    ? obj.keySkills.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];

  if (
    !currentRole ||
    !specialty ||
    !targetIndustry ||
    !notableAchievement ||
    !seniorityLevel ||
    !Number.isFinite(yearsOfExperience) ||
    yearsOfExperience < 0 ||
    keySkills.length === 0
  ) {
    return null;
  }

  return {
    currentRole,
    specialty,
    targetIndustry,
    notableAchievement,
    seniorityLevel,
    yearsOfExperience,
    keySkills,
  };
}

/**
 * Headline Optimizer logado. Dois modos (ver lib/prompts.ts): "text" (cola
 * a headline atual) e "builder" (perguntas guiadas, sem headline pronta).
 * Autenticação + limite mensal + persistência em `analyses` — diferente das
 * versões anônimas em /api/analyze e /api/analyze-headline.
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

  let result;
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
      inputSummary = truncated;
      inputData = { mode: "text", text: truncated };
    } else if (body.mode === "builder") {
      const answers = validateBuilderAnswers(body.answers);
      if (!answers) {
        return NextResponse.json(
          { error: "Preencha todas as perguntas do formulário." },
          { status: 400 },
        );
      }
      result = await generateHeadlineFromAnswers(answers);
      inputSummary = `${answers.currentRole} — ${answers.specialty}`;
      inputData = { mode: "builder", answers };
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

  const admin = getSupabaseAdmin();
  const { error: insertError } = await admin.from("analyses").insert({
    user_id: user.id,
    tool_type: "headline",
    input_summary: inputSummary,
    input_data: inputData,
    output_data: result,
    score: result.headlineScore,
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
