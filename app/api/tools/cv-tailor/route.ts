import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { analyzeCvAgainstJob, rewriteCvForJob } from "@/lib/anthropic";
import { computeMatch } from "@/lib/match";
import { getUsageStatus } from "@/lib/usage";
import { extractTextFromPdf } from "@/lib/pdf";
import { validateProfileText } from "@/lib/profile-validation";
import type { CvTailorResultV2 } from "@/lib/types";

const MAX_TEXT_LENGTH = 20_000;
const MIN_JOB_DESCRIPTION_LENGTH = 300;

/**
 * Detecção de invenção: termo classificado como `missing` que aparece no
 * CV adaptado mas NÃO existia no CV original. (Se já existia no original,
 * o problema seria de classificação, não de invenção — não bloqueia.)
 * Comparação em lowercase com espaços normalizados.
 */
function findInventedTerms(
  rewrittenCv: string,
  originalCv: string,
  missingTerms: string[],
): string[] {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ");
  const rewritten = normalize(rewrittenCv);
  const original = normalize(originalCv);
  return missingTerms.filter((term) => {
    const t = normalize(term);
    return rewritten.includes(t) && !original.includes(t);
  });
}

/**
 * CV Tailor v2. A job description é a fonte de verdade sobre o cargo-alvo
 * (não perguntamos mais). Fluxo:
 *   1. Etapa A (haiku, temp 0): entende a vaga + classifica requisitos
 *      contra o CV com evidência literal.
 *   2. Match ANTES calculado em código (lib/match.ts) — auditável.
 *   3. Etapa B (sonnet): reescrita com whitelist; missing são proibidos.
 *   4. Check anti-invenção em código: termo missing no CV adaptado que não
 *      existia no original → retry 1x com reforço → se persistir, ERRO
 *      CONTROLADO (nunca entregamos versão potencialmente inventada, e
 *      nunca removemos termos do texto na tesoura — decisão de 24/jul).
 *   5. Match DEPOIS: mesma fórmula, promovendo só os weak evidenciados.
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
  let language: "en" | "pt";

  try {
    const formData = await request.formData();
    const file = formData.get("cvFile");
    const rawCvText = formData.get("cvText");
    jobDescription = String(formData.get("jobDescription") ?? "").trim();
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
    return NextResponse.json(
      { error: "Cole a descrição completa da vaga (requisitos, responsabilidades)." },
      { status: 400 },
    );
  }

  // Etapa A + match antes
  let analysis;
  try {
    analysis = await analyzeCvAgainstJob(cvText, jobDescription);
  } catch (error) {
    console.error("[/api/tools/cv-tailor] analysis", error);
    return NextResponse.json(
      { error: "Não foi possível analisar a vaga agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }
  const matchBefore = computeMatch(analysis.requirements);
  const missingTerms = analysis.requirements
    .filter((r) => r.status === "missing")
    .map((r) => r.term);

  // Etapa B + check anti-invenção (retry 1x; depois erro controlado)
  let rewrite;
  try {
    rewrite = await rewriteCvForJob(cvText, analysis.job, analysis.requirements, language);

    let invented = findInventedTerms(rewrite.rewrittenCv, cvText, missingTerms);
    if (invented.length > 0) {
      console.error("CV_TAILOR_INVENTION_DETECTED", { userId: user.id, invented, attempt: 1 });
      rewrite = await rewriteCvForJob(cvText, analysis.job, analysis.requirements, language, invented);
      invented = findInventedTerms(rewrite.rewrittenCv, cvText, missingTerms);
      if (invented.length > 0) {
        // Decisão de produto: NUNCA entregar versão potencialmente
        // inventada, e NUNCA editar o texto na tesoura (removeria frases
        // legítimas). Erro controlado; a análise não conta uso.
        console.error("CV_TAILOR_INVENTION_DETECTED", { userId: user.id, invented, attempt: 2 });
        return NextResponse.json(
          {
            error:
              "Não conseguimos gerar uma adaptação 100% fiel ao seu CV para esta vaga. Nenhuma versão foi entregue — tente novamente.",
            code: "REWRITE_UNSAFE",
          },
          { status: 502 },
        );
      }
    }
  } catch (error) {
    console.error("[/api/tools/cv-tailor] rewrite", error);
    return NextResponse.json(
      { error: "Não foi possível adaptar seu currículo agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }

  // Match depois: MESMA fórmula, promovendo só os weak evidenciados —
  // missing nunca sobe por reescrita.
  const promoted = new Set(rewrite.evidencedTerms.map((t) => t.toLowerCase()));
  const matchAfter = computeMatch(analysis.requirements, promoted);

  const result: CvTailorResultV2 = {
    kind: "cv_tailor_v2",
    job: analysis.job,
    requirements: analysis.requirements,
    matchBefore,
    matchAfter,
    evidencedTerms: rewrite.evidencedTerms,
    changes: rewrite.changes,
    rewrittenCv: rewrite.rewrittenCv,
    recommendations: rewrite.recommendations,
  };

  const admin = getSupabaseAdmin();
  const { error: insertError } = await admin.from("analyses").insert({
    user_id: user.id,
    tool_type: "cv_tailor",
    input_summary: analysis.job.role,
    input_data: { cvText, jobDescription, language },
    output_data: result,
    score: matchBefore.percent,
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
