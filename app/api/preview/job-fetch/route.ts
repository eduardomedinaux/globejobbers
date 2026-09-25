import { NextRequest, NextResponse } from "next/server";
import { fetchJobDescription } from "@/lib/job-fetch";

/**
 * Importa a descrição de uma vaga a partir da URL — versão PÚBLICA, usada
 * pelo funil /preview/cv-tailor (a pessoa cola o link que compartilhou do
 * app da vaga). Mesma lógica da rota logada (lib/job-fetch.ts): guarda
 * anti-SSRF, timeout de 8s, resposta limitada ao texto extraído.
 */
export async function POST(request: NextRequest) {
  let rawUrl: unknown;
  try {
    const body = await request.json();
    rawUrl = body.url;
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  const result = await fetchJobDescription(rawUrl);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ text: result.text, chars: result.chars });
}
