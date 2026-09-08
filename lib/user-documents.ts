import { getSupabaseAdmin } from "@/lib/supabase";

// Perfil Profissional do usuário: texto extraído do PDF do LinkedIn
// ('linkedin_pdf') e/ou do CV ('cv'). O ativo de cada tipo é o mais
// recente. Preenchido pelo dashboard OU passivamente pelo uso das
// ferramentas (ver rotas de linkedin-review e cv-tailor).

export type UserDocumentKind = "linkedin_pdf" | "cv";

export interface UserDocument {
  id: string;
  kind: UserDocumentKind;
  filename: string;
  content: string;
  chars: number;
  /** Cargo atual extraído do PDF (Haiku) — alimenta o onboarding. */
  extractedRole: string | null;
  createdAt: string;
}

/** Resumo seguro pro client (sem o conteúdo — pode ter dezenas de KB). */
export interface UserDocumentSummary {
  kind: UserDocumentKind;
  filename: string;
  chars: number;
  extractedRole: string | null;
  createdAt: string;
}

export function toDocumentSummary(doc: UserDocument): UserDocumentSummary {
  return {
    kind: doc.kind,
    filename: doc.filename,
    chars: doc.chars,
    extractedRole: doc.extractedRole,
    createdAt: doc.createdAt,
  };
}

function rowToDocument(row: Record<string, unknown>): UserDocument {
  return {
    id: row.id as string,
    kind: row.kind as UserDocumentKind,
    filename: (row.filename as string) ?? "documento.pdf",
    content: row.content as string,
    chars: (row.chars as number) ?? 0,
    extractedRole: (row.extracted_role as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

/** Documento ativo de um tipo (mais recente). null se não houver/erro (fail-open). */
export async function getActiveDocument(
  userId: string,
  kind: UserDocumentKind,
): Promise<UserDocument | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("user_documents")
    .select()
    .eq("user_id", userId)
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("USER_DOCUMENT_FETCH_FAILED", { userId, kind, error });
    return null;
  }
  return data ? rowToDocument(data) : null;
}

/**
 * Grava um documento novo (insert simples = histórico; o ativo é o mais
 * recente). Falha NUNCA bloqueia a ferramenta que chamou — captura passiva
 * é bônus, não requisito.
 */
export async function saveUserDocument(
  userId: string,
  kind: UserDocumentKind,
  content: string,
  filename: string,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("user_documents").insert({
    user_id: userId,
    kind,
    filename: filename.slice(0, 200),
    content,
    chars: content.length,
  });
  if (error) {
    console.error("USER_DOCUMENT_SAVE_FAILED", { userId, kind, error });
  }
}

/**
 * Grava o cargo extraído no documento. Fail-open: extração de cargo é
 * bônus do onboarding, nunca requisito do upload.
 */
export async function setDocumentExtractedRole(documentId: string, role: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("user_documents")
    .update({ extracted_role: role })
    .eq("id", documentId);
  if (error) {
    console.error("USER_DOCUMENT_ROLE_UPDATE_FAILED", { documentId, error });
  }
}
