import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { LeadPayload } from "@/lib/types";

// RFC 5321 básico: suficiente para rejeitar lixo óbvio sem falsos positivos.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Gate de e-mail: salva {email, raw_profile, score} em `leads` e libera a
 * headline reescrita no client. Ver supabase/schema.sql.
 */
export async function POST(request: NextRequest) {
  let body: Partial<LeadPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { email, rawProfile, score } = body;

  // (a) Validação de e-mail no servidor — normaliza antes de testar para não
  // depender do front rejeitar espaços ou maiúsculas.
  if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();

  if (typeof rawProfile !== "string" || rawProfile.trim().length === 0) {
    return NextResponse.json({ error: "Perfil ausente." }, { status: 400 });
  }
  if (typeof score !== "number" || score < 0 || score > 100) {
    return NextResponse.json({ error: "Score inválido." }, { status: 400 });
  }

  // (b) Estratégia de duplicata: insert simples — cada análise vira uma linha
  // nova com o timestamp da sessão. O schema não tem UNIQUE em email (ver
  // supabase/schema.sql), então duplicatas nunca causam conflito. Preferimos
  // isso ao upsert porque: (1) preserva histórico de todas as sessões, (2) não
  // exige migração de schema, (3) elimina risco de sobrescrever dados.
  //
  // (c) Falha de DB não bloqueia o usuário: logamos o erro no servidor mas
  // retornamos ok: true de qualquer forma. O lead não é punido por erro nosso.
  try {
    const supabase = getSupabaseAdmin();
    const { error: dbError } = await supabase.from("leads").insert({
      email: normalizedEmail,
      raw_profile: rawProfile,
      score,
    });
    if (dbError) {
      // Prefixo único "LEAD_INSERT_FAILED" para filtrar nos logs da Vercel e
      // recuperar o lead manualmente. Inclui email + score (não o rawProfile
      // inteiro, pra não inflar o log) para permitir reinserção manual.
      // FUTURE: disparar alerta real (Sentry/e-mail) aqui quando houver volume
      // que justifique não depender de busca manual em log.
      console.error("LEAD_INSERT_FAILED", { email: normalizedEmail, score, dbError });
    }
  } catch (err) {
    // Supabase inacessível ou credenciais inválidas — loga, não propaga.
    // FUTURE: disparar alerta real (Sentry/e-mail) aqui quando houver volume
    // que justifique não depender de busca manual em log.
    console.error("LEAD_INSERT_FAILED", { email: normalizedEmail, score, err });
  }

  // FUTURE (créditos/conta): aqui é onde futuramente criamos/atualizamos o
  // registro do usuário e concedemos os créditos iniciais de geração.

  return NextResponse.json({ ok: true });
}
