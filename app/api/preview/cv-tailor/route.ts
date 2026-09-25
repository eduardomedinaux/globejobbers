import { NextRequest, NextResponse } from "next/server";
import { analyzeCvAgainstJob } from "@/lib/anthropic";
import { computeMatch } from "@/lib/match";
import { extractTextFromPdf } from "@/lib/pdf";
import { validateProfileText } from "@/lib/profile-validation";
import type { CvPreviewDiagnosis } from "@/lib/types";

// Mesmos limites do CV Tailor logado.
const MAX_TEXT_LENGTH = 20_000;
const MIN_JOB_DESCRIPTION_LENGTH = 300;

/**
 * Funil público /preview/cv-tailor — ETAPA 1 (diagnóstico, SEM auth).
 *
 * Roda só a parte barata do pipeline v2 (haiku classifica os requisitos +
 * match calculado em código) e devolve o diagnóstico completo — visível
 * pra todo mundo, é a isca do funil. A etapa cara (amostra da reescrita,
 * sonnet) fica em ./sample e só roda depois do gate de e-mail: curioso que
 * não converte não gasta token de sonnet.
 *
 * Nada é gravado no banco aqui — o lead entra via /api/leads no gate.
 */
export async function POST(request: NextRequest) {
  let cvText: string;
  let jobDescription: string;

  try {
    const formData = await request.formData();
    const file = formData.get("cvFile");
    const rawCvText = formData.get("cvText");
    jobDescription = String(formData.get("jobDescription") ?? "").trim();

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

  try {
    const analysis = await analyzeCvAgainstJob(cvText, jobDescription);
    const match = computeMatch(analysis.requirements);

    const diagnosis: CvPreviewDiagnosis = {
      job: analysis.job,
      requirements: analysis.requirements,
      match,
      // Devolvido pro client: alimenta a etapa 2 (amostra) sem re-upload do
      // PDF. É o material da própria pessoa — nada de terceiros.
      cvText,
    };
    return NextResponse.json({ diagnosis });
  } catch (error) {
    console.error("[/api/preview/cv-tailor] analysis", error);
    return NextResponse.json(
      { error: "Não foi possível analisar a vaga agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }
}
