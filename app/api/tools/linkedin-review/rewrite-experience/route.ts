import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { rewriteExperience } from "@/lib/anthropic";
import { getActiveMarketProfile } from "@/lib/market-profile";
import type { ExperienceRewrite, LinkedinReviewResult } from "@/lib/types";

// Teto por análise (decisão 17/set): reescritas NÃO consomem uso do plano —
// elas pertencem à análise que o usuário já gastou. O teto protege o custo.
const MAX_REWRITES_PER_ANALYSIS = 5;

const MIN_EXPERIENCE_CHARS = 60;
const MAX_EXPERIENCE_CHARS = 4000;

/**
 * Reescrita de experiência sob demanda (categoria Experiências do Review).
 * O usuário cola UMA experiência; devolvemos a versão reescrita (regra dos
 * números, placeholders [[...]]) e ANEXAMOS à análise existente — assim as
 * reescritas aparecem no Histórico junto do Review (lição do aulão: é lá
 * que os usuários vivem). Não toca na rota de análise validada.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  let analysisId = "";
  let experienceText = "";
  try {
    const body = await request.json();
    analysisId = typeof body.analysisId === "string" ? body.analysisId.trim() : "";
    experienceText =
      typeof body.experienceText === "string"
        ? body.experienceText.trim().slice(0, MAX_EXPERIENCE_CHARS)
        : "";
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!analysisId) {
    return NextResponse.json({ error: "Análise não identificada." }, { status: 400 });
  }
  if (experienceText.length < MIN_EXPERIENCE_CHARS) {
    return NextResponse.json(
      {
        error:
          "Cole a experiência completa (cargo, empresa e a descrição) — um trecho muito curto não dá material pra reescrita.",
      },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data: row, error: fetchError } = await admin
    .from("analyses")
    .select("id, user_id, tool_type, output_data")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .eq("tool_type", "linkedin_review")
    .single();

  if (fetchError || !row) {
    return NextResponse.json(
      { error: "Análise não encontrada — rode o Review de novo." },
      { status: 404 },
    );
  }

  const output = row.output_data as LinkedinReviewResult;
  const existing: ExperienceRewrite[] = Array.isArray(output.experienceRewrites)
    ? output.experienceRewrites
    : [];

  if (existing.length >= MAX_REWRITES_PER_ANALYSIS) {
    return NextResponse.json(
      {
        error: `Você já reescreveu ${MAX_REWRITES_PER_ANALYSIS} experiências nesta análise — é o teto por análise.`,
        code: "REWRITE_LIMIT",
      },
      { status: 403 },
    );
  }

  // Perfil de Mercado como ALVO (nunca fonte de fatos) — falha não bloqueia.
  const marketProfile = await getActiveMarketProfile(user.id);

  let rewrite;
  try {
    rewrite = await rewriteExperience(experienceText, marketProfile);
  } catch (error) {
    console.error("[/api/tools/linkedin-review/rewrite-experience]", error);
    return NextResponse.json(
      { error: "Não foi possível reescrever agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }

  const entry: ExperienceRewrite = { source: experienceText, ...rewrite };
  const updated: LinkedinReviewResult = {
    ...output,
    experienceRewrites: [...existing, entry],
  };

  const { error: updateError } = await admin
    .from("analyses")
    .update({ output_data: updated })
    .eq("id", row.id);

  if (updateError) {
    // A reescrita já existe — devolvemos mesmo sem persistir (não pune o
    // usuário), e logamos pra investigar (provável GRANT update faltando).
    console.error("REWRITE_PERSIST_FAILED", { analysisId: row.id, updateError });
  }

  return NextResponse.json({
    rewrite: entry,
    remaining: MAX_REWRITES_PER_ANALYSIS - existing.length - 1,
    persisted: !updateError,
  });
}
