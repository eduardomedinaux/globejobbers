import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { extractTextFromPdf } from "@/lib/pdf";
import { validateProfileText } from "@/lib/profile-validation";
import {
  getActiveDocument,
  saveUserDocument,
  toDocumentSummary,
  type UserDocumentKind,
} from "@/lib/user-documents";

const MAX_TEXT_LENGTH = 20_000;
const MIN_PDF_TEXT_LENGTH = 100;

/**
 * Perfil Profissional do usuário (dashboard vivo).
 * POST: sobe o PDF (LinkedIn por padrão; kind=cv pro currículo), extrai o
 * texto e salva como ativo. GET: resumos dos ativos (sem conteúdo).
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  let text: string;
  let filename: string;
  let kind: UserDocumentKind;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    kind = formData.get("kind") === "cv" ? "cv" : "linkedin_pdf";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Envie o PDF (LinkedIn → Mais → Salvar como PDF)." },
        { status: 400 },
      );
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
    }

    filename = file.name || "documento.pdf";
    const buffer = await file.arrayBuffer();
    text = await extractTextFromPdf(buffer);
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o arquivo enviado." }, { status: 400 });
  }

  text = text.trim().slice(0, MAX_TEXT_LENGTH);
  const meaningfulLength = text.replace(/\s+/g, "").length;
  if (meaningfulLength < MIN_PDF_TEXT_LENGTH) {
    return NextResponse.json(
      {
        error:
          "Não consegui ler o texto desse PDF. Ele pode ser uma imagem escaneada. Tente gerar de novo pelo LinkedIn (Mais → Salvar como PDF).",
      },
      { status: 400 },
    );
  }
  const validationError = validateProfileText(text);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  await saveUserDocument(user.id, kind, text, filename);
  const saved = await getActiveDocument(user.id, kind);
  if (!saved) {
    return NextResponse.json(
      { error: "Não foi possível salvar seu documento. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ document: toDocumentSummary(saved) });
}

/** Resumos dos ativos do usuário (sem o conteúdo). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const [linkedinPdf, cv] = await Promise.all([
    getActiveDocument(user.id, "linkedin_pdf"),
    getActiveDocument(user.id, "cv"),
  ]);

  return NextResponse.json({
    linkedinPdf: linkedinPdf ? toDocumentSummary(linkedinPdf) : null,
    cv: cv ? toDocumentSummary(cv) : null,
  });
}
