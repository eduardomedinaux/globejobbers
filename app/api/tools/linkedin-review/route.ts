import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLinkedinReview } from "@/lib/anthropic";
import { getActiveMarketProfile } from "@/lib/market-profile";
import { getActiveDocument, saveUserDocument } from "@/lib/user-documents";
import { getUsageStatus } from "@/lib/usage";
import { extractTextFromPdf } from "@/lib/pdf";
import { validateProfileText } from "@/lib/profile-validation";

const MAX_PROFILE_LENGTH = 20_000;
const MIN_PDF_TEXT_LENGTH = 100;

/**
 * LinkedIn Review. Input PDF-only (reaproveitando lib/pdf.ts, mesma
 * extração do Ato 2) — mesma decisão do MVP público: colar o perfil
 * inteiro é impraticável e gera input de qualidade imprevisível.
 * Autenticação + limite mensal + persistência em `analyses`, mesmo padrão
 * das outras ferramentas logadas.
 *
 * Se o usuário tiver um Perfil de Mercado ativo (criado na aba Headline a
 * partir das vagas dele), a análise é feita CONTRA esse alvo — mesma fonte
 * de verdade nas duas abas. Sem perfil, segue no modo genérico.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const usage = await getUsageStatus(user.id, "linkedin_review");
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

  let profileText: string;
  let uploadedFilename: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const useSaved = formData.get("useSaved") === "1";

    if (useSaved) {
      // Dashboard vivo: análise em 1 clique usando o perfil salvo.
      const doc = await getActiveDocument(user.id, "linkedin_pdf");
      if (!doc) {
        return NextResponse.json(
          { error: "Você ainda não tem um perfil salvo — envie o PDF do LinkedIn." },
          { status: 400 },
        );
      }
      profileText = doc.content;
    } else {
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json(
          { error: "Envie o PDF do seu perfil (LinkedIn → Mais → Salvar como PDF)." },
          { status: 400 },
        );
      }
      if (file.type !== "application/pdf") {
        return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
      }

      uploadedFilename = file.name || "linkedin.pdf";
      const buffer = await file.arrayBuffer();
      profileText = await extractTextFromPdf(buffer);

      const meaningfulLength = profileText.replace(/\s+/g, "").length;
      if (meaningfulLength < MIN_PDF_TEXT_LENGTH) {
        return NextResponse.json(
          {
            error:
              "Não consegui ler o texto desse PDF. Ele pode ser uma imagem escaneada. Tente gerar o PDF de novo pelo LinkedIn (Mais → Salvar como PDF) e suba aqui.",
          },
          { status: 400 },
        );
      }
    }
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o conteúdo enviado." }, { status: 400 });
  }

  profileText = profileText.trim().slice(0, MAX_PROFILE_LENGTH);

  const validationError = validateProfileText(profileText);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Captura passiva (dashboard vivo): o PDF subido aqui VIRA o perfil salvo
  // do usuário — ele nunca precisa subir duas vezes. Falha não bloqueia.
  if (uploadedFilename) {
    await saveUserDocument(user.id, "linkedin_pdf", profileText, uploadedFilename);
  }

  // Falha na leitura do perfil de mercado NÃO bloqueia o review (helper
  // devolve null e a análise segue genérica).
  const marketProfile = await getActiveMarketProfile(user.id);

  let result;
  try {
    result = await generateLinkedinReview(profileText, marketProfile);
  } catch (error) {
    console.error("[/api/tools/linkedin-review]", error);
    return NextResponse.json(
      { error: "Não foi possível analisar seu perfil agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error: insertError } = await admin.from("analyses").insert({
    user_id: user.id,
    tool_type: "linkedin_review",
    input_summary: profileText.slice(0, 200),
    // marketProfileId registra CONTRA qual alvo esta análise foi feita —
    // importante pra interpretar o resultado no histórico.
    input_data: { profileText, marketProfileId: marketProfile?.id ?? null },
    output_data: result,
    score: result.overallScore,
  });

  if (insertError) {
    console.error("ANALYSIS_INSERT_FAILED", {
      userId: user.id,
      toolType: "linkedin_review",
      insertError,
    });
  }

  return NextResponse.json({
    analysis: result,
    marketProfile: marketProfile
      ? { targetRole: marketProfile.targetRole, targetMarket: marketProfile.targetMarket }
      : null,
    usage: {
      used: usage.used + 1,
      limit: usage.limit,
      remaining: Math.max(0, usage.limit - (usage.used + 1)),
    },
  });
}
