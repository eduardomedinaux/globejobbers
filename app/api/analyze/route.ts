import { NextRequest, NextResponse } from "next/server";
import { generateAnalysis } from "@/lib/anthropic";
import { extractTextFromPdf } from "@/lib/pdf";
import { validateProfileText } from "@/lib/profile-validation";

const MAX_PROFILE_LENGTH = 20_000;
// PDFs escaneados (imagem) extraem string vazia ou só espaços/quebras de
// linha. Exigimos um mínimo de caracteres não-whitespace antes de chamar a IA.
const MIN_PDF_TEXT_LENGTH = 100;

/**
 * Recebe o PDF do perfil via FormData, extrai o texto no servidor e chama a
 * IA para gerar o Score Internacional e a headline reescrita. A API key da
 * Anthropic nunca sai do servidor.
 */
export async function POST(request: NextRequest) {
  let profileText: string;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Envie o PDF do seu perfil do LinkedIn." },
        { status: 400 },
      );
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
    }
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
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler o conteúdo enviado." },
      { status: 400 },
    );
  }

  profileText = profileText.trim().slice(0, MAX_PROFILE_LENGTH);

  // Validação defensiva no servidor — não confiar só no client. Cobre tanto
  // texto vazio/curto quanto o caso comum de colar a URL do LinkedIn em vez
  // do texto do perfil. Nenhum dos dois casos chega à IA (evita custo e dá
  // uma mensagem de orientação clara em vez de um resultado sem sentido).
  const validationError = validateProfileText(profileText);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const analysis = await generateAnalysis(profileText);
    // Devolvemos o profileText (já normalizado) para o client poder
    // reenviá-lo em /api/leads sem precisar reler o PDF.
    return NextResponse.json({ analysis, profileText });
  } catch (error) {
    console.error("[/api/analyze]", error);
    return NextResponse.json(
      { error: "Não foi possível analisar o perfil agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }
}
