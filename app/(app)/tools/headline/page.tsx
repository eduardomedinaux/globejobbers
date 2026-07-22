import { redirect } from "next/navigation";

/**
 * A ferramenta de headline virou aba do LinkedIn Review (headline é uma
 * seção do perfil, não uma ferramenta irmã — decisão de 2026-07-22).
 * Mantemos a rota como redirect pra não quebrar links antigos/bookmarks.
 */
export default function HeadlineToolRedirect() {
  redirect("/tools/linkedin-review?tab=headline");
}
