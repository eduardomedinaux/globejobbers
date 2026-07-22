import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";

// RFC 5321 básico, mesmo padrão de /api/leads.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Captura de interesse no plano Pro/mentoria. Se o usuário estiver logado,
 * usa o e-mail da sessão (UpgradeModal não pede e-mail de novo); caso
 * contrário, exige `email` no body (ex.: seção de mentoria da landing).
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const rawEmail = body.email ?? user?.email ?? "";
  const email = rawEmail.trim().toLowerCase();

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("waitlist").insert({
    user_id: user?.id ?? null,
    email,
    source: typeof body.source === "string" ? body.source : null,
  });

  if (error) {
    // Tolerante a falha, mesmo padrão de /api/leads — não bloqueia o
    // usuário por erro nosso ao salvar o interesse.
    console.error("WAITLIST_INSERT_FAILED", { email, error });
  }

  return NextResponse.json({ ok: true });
}
