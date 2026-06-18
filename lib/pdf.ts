import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extrai TEXTO de um PDF (currículo ou "Salvar como PDF" do LinkedIn) no
 * servidor. O texto extraído é tratado como qualquer perfil colado — nunca
 * enviamos o PDF (imagem/binário) para a IA. Ver CLAUDE.md "Stack".
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}
