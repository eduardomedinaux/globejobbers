import { NextRequest, NextResponse } from "next/server";
import { analyzeHeadlineFromImage } from "@/lib/anthropic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Recebe um print (imagem) da headline do LinkedIn via FormData, chama a IA
 * com visão para extrair e reescrever a headline. A API key da Anthropic nunca
 * sai do servidor.
 */
export async function POST(request: NextRequest) {
  let imageBase64: string;
  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Envie um print da sua headline." },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Envie uma imagem JPEG, PNG ou WebP." },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Imagem muito grande. Máximo 5 MB." },
        { status: 400 },
      );
    }

    mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const buffer = await file.arrayBuffer();
    imageBase64 = Buffer.from(buffer).toString("base64");
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler o arquivo enviado." },
      { status: 400 },
    );
  }

  try {
    const analysis = await analyzeHeadlineFromImage(imageBase64, mediaType);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("[/api/analyze-headline]", error);
    return NextResponse.json(
      { error: "Não foi possível analisar a imagem agora. Tente novamente em alguns segundos." },
      { status: 502 },
    );
  }
}
