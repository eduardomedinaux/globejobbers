import { NextRequest, NextResponse } from "next/server";
import { generateAnalysis } from "@/lib/anthropic";
import { extractTextFromPdf } from "@/lib/pdf";

const MAX_PROFILE_LENGTH = 20_000;
const MIN_PROFILE_LENGTH = 50;
// PDFs escaneados (imagem) extraem string vazia ou só espaços/quebras de
// linha. Exigimos um mínimo de caracteres não-whitespace antes de chamar a IA.
const MIN_PDF_TEXT_LENGTH = 100;

/**
 * Recebe o perfil (texto colado ou PDF) via FormData, extrai o texto no
 * servidor se necessário e chama a IA para gerar o Score Internacional e a
 * headline reescrita. A API key da Anthropic nunca sai do servidor.
 */
export async function POST(request: NextRequest) {
  let profileText: string;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const pastedText = formData.get("profileText");

    if (file instanceof File && file.size > 0) {
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
              "Não consegui ler o texto desse PDF. Ele pode ser uma imagem escaneada. Cola o texto do seu perfil aqui que funciona perfeitamente.",
          },
          { status: 400 },
        );
      }
    } else if (typeof pastedText === "string") {
      profileText = pastedText;
    } else {
      return NextResponse.json(
        { error: "Cole o texto do seu perfil ou envie um PDF." },
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

  if (profileText.length < MIN_PROFILE_LENGTH) {
    return NextResponse.json(
      {
        error:
          "O perfil parece vazio ou muito curto. Cole mais conteúdo ou envie outro arquivo.",
      },
      { status: 400 },
    );
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
