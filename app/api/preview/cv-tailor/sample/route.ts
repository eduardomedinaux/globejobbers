import { NextRequest, NextResponse } from "next/server";
import { generateCvPreviewSample } from "@/lib/anthropic";
import { computeMatch } from "@/lib/match";
import type { CvJobProfile, CvPreviewSample, CvRequirement } from "@/lib/types";

const MAX_TEXT_LENGTH = 20_000;
const MAX_REQUIREMENTS = 15;

/**
 * Funil público /preview/cv-tailor — ETAPA 2 (amostra, SEM auth).
 *
 * Recebe de volta o diagnóstico da etapa 1 (cvText + job + requirements,
 * mantidos no client) e gera a amostra da reescrita (sonnet — a etapa
 * cara). A UI só chama esta rota DEPOIS do e-mail no gate, então o custo
 * de sonnet fica atrás da conversão. Check anti-invenção igual ao CV
 * Tailor completo: retry 1x com reforço → se persistir, erro controlado
 * (nunca entregamos texto potencialmente inventado).
 */

function findInventedTerms(
  generatedText: string,
  originalCv: string,
  missingTerms: string[],
): string[] {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ");
  const generated = normalize(generatedText);
  const original = normalize(originalCv);
  return missingTerms.filter((term) => {
    const t = normalize(term);
    return generated.includes(t) && !original.includes(t);
  });
}

/** Revalida o shape vindo do client — a rota é pública, nada é confiável. */
function parseBody(raw: unknown): {
  cvText: string;
  job: CvJobProfile;
  requirements: CvRequirement[];
} | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const cvText =
    typeof obj.cvText === "string" ? obj.cvText.trim().slice(0, MAX_TEXT_LENGTH) : "";
  if (cvText.length === 0) return null;

  const jobRaw = obj.job;
  if (typeof jobRaw !== "object" || jobRaw === null) return null;
  const j = jobRaw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const job: CvJobProfile = {
    role: str(j.role, 120),
    seniority: str(j.seniority, 60),
    area: str(j.area, 120),
    context: str(j.context, 400),
  };
  if (job.role.length === 0) return null;

  const requirements: CvRequirement[] = (Array.isArray(obj.requirements) ? obj.requirements : [])
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item): CvRequirement => {
      const g = item.group;
      const group: CvRequirement["group"] =
        g === "tool" || g === "softSkill" || g === "responsibility" ? g : "hardSkill";
      const s = item.status;
      const status: CvRequirement["status"] = s === "strong" || s === "weak" ? s : "missing";
      return {
        term: str(item.term, 80),
        group,
        weight: item.weight === "must" ? "must" : "nice",
        status,
        evidence: str(item.evidence, 300),
      };
    })
    .filter((r) => r.term.length > 0)
    // Mesma regra de evidência da etapa 1: strong/weak sem citação = missing.
    .map((r) =>
      r.status !== "missing" && r.evidence.length === 0
        ? { ...r, status: "missing" as const, evidence: "" }
        : r,
    )
    .slice(0, MAX_REQUIREMENTS);
  if (requirements.length === 0) return null;

  return { cvText, job, requirements };
}

export async function POST(request: NextRequest) {
  let parsed: ReturnType<typeof parseBody>;
  try {
    parsed = parseBody(await request.json());
  } catch {
    parsed = null;
  }
  if (!parsed) {
    return NextResponse.json({ error: "Dados da análise ausentes ou inválidos." }, { status: 400 });
  }
  const { cvText, job, requirements } = parsed;

  const missingTerms = requirements
    .filter((r) => r.status === "missing")
    .map((r) => r.term);

  try {
    let sample = await generateCvPreviewSample(cvText, job, requirements);

    const sampleText = (s: typeof sample) =>
      [s.summary, ...s.bullets.map((b) => b.rewritten)].join("\n");

    let invented = findInventedTerms(sampleText(sample), cvText, missingTerms);
    if (invented.length > 0) {
      console.error("CV_PREVIEW_INVENTION_DETECTED", { invented, attempt: 1 });
      sample = await generateCvPreviewSample(cvText, job, requirements, invented);
      invented = findInventedTerms(sampleText(sample), cvText, missingTerms);
      if (invented.length > 0) {
        // Mesma decisão de produto do CV Tailor completo: NUNCA entregar
        // texto potencialmente inventado.
        console.error("CV_PREVIEW_INVENTION_DETECTED", { invented, attempt: 2 });
        return NextResponse.json(
          {
            error:
              "Não conseguimos gerar uma amostra 100% fiel ao seu CV para esta vaga. Nada foi entregue — tente novamente.",
            code: "REWRITE_UNSAFE",
          },
          { status: 502 },
        );
      }
    }

    // Projeção pós-amostra: MESMA fórmula, promovendo só os weak que a
    // amostra evidenciou — missing nunca sobe.
    const promoted = new Set(sample.evidencedTerms.map((t) => t.toLowerCase()));
    const matchAfter = computeMatch(requirements, promoted);

    const result: CvPreviewSample = {
      summary: sample.summary,
      bullets: sample.bullets,
      evidencedTerms: sample.evidencedTerms,
      matchAfter,
    };
    return NextResponse.json({ sample: result });
  } catch (error) {
    console.error("[/api/preview/cv-tailor/sample]", error);
    return NextResponse.json(
      { error: "Não foi possível gerar a amostra agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }
}
