import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { AREA_OPTIONS, isQuizAnswers, type QuizAnswers } from "@/lib/quiz";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Não reenvia o e-mail pro mesmo endereço em sequência (duplo clique, refresh).
const RESEND_COOLDOWN_MS = 10 * 60 * 1000;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/**
 * Lead do quiz público: grava {email, respostas, utm} em `quiz_leads` e
 * manda pelo Resend o link pra continuar no computador.
 *
 * Mesmo padrão de tolerância a falha de /api/leads: erro de banco ou de
 * e-mail é logado (QUIZ_LEAD_INSERT_FAILED / QUIZ_EMAIL_FAILED) e a pessoa
 * recebe ok mesmo assim — o lead não é punido por erro nosso. Sem
 * RESEND_API_KEY configurada, só grava (o e-mail fica pra envio manual).
 */
export async function POST(request: NextRequest) {
  let body: { email?: unknown; answers?: unknown; utm?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (typeof body.email !== "string" || !EMAIL_REGEX.test(body.email.trim().toLowerCase())) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (!isQuizAnswers(body.answers)) {
    return NextResponse.json({ error: "Respostas inválidas." }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  const answers: QuizAnswers = body.answers;

  const utm: Record<string, string> = {};
  if (body.utm && typeof body.utm === "object") {
    for (const k of UTM_KEYS) {
      const v = (body.utm as Record<string, unknown>)[k];
      if (typeof v === "string" && v.length > 0) utm[k] = v.slice(0, 120);
    }
  }

  const admin = getSupabaseAdmin();

  let recentlySent = false;
  try {
    const { data: recent } = await admin
      .from("quiz_leads")
      .select("created_at")
      .eq("email", email)
      .gt("created_at", new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString())
      .limit(1);
    recentlySent = (recent?.length ?? 0) > 0;

    const { error } = await admin.from("quiz_leads").insert({
      email,
      area: answers.area,
      answers,
      utm: Object.keys(utm).length > 0 ? utm : null,
    });
    if (error) console.error("QUIZ_LEAD_INSERT_FAILED", { email, area: answers.area, error });
  } catch (err) {
    console.error("QUIZ_LEAD_INSERT_FAILED", { email, area: answers.area, err });
  }

  if (!recentlySent) {
    await sendContinueEmail(email, answers, request.nextUrl.origin);
  }

  return NextResponse.json({ ok: true });
}

async function sendContinueEmail(email: string, answers: QuizAnswers, origin: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    console.warn("QUIZ_EMAIL_SKIPPED", { email, reason: "RESEND_API_KEY/RESEND_FROM ausentes" });
    return;
  }

  const link = `${origin}/login?next=${encodeURIComponent("/dashboard")}&utm_source=quiz&utm_medium=email&utm_campaign=quiz`;
  const areaLabel = AREA_OPTIONS.find((o) => o.value === answers.area)?.label ?? "";

  const text = [
    "Oi!",
    "",
    "Aqui está o link pra continuar o seu diagnóstico no GlobeJobbers, de preferência no computador:",
    link,
    "",
    "Lá você entra com o Google, escolhe as vagas que quer e sobe o PDF do seu LinkedIn. Em poucos minutos sai a nota do seu perfil comparada com essas vagas, com o texto pronto pra copiar.",
    "",
    "O primeiro LinkedIn Review do mês é grátis.",
    "",
    "Eduardo Medina",
    "Carreira em Dólar · GlobeJobbers",
  ].join("\n");

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#17130C;max-width:520px">
  <p>Oi!</p>
  <p>Aqui está o link pra continuar o seu diagnóstico no GlobeJobbers${areaLabel ? ` (${escapeHtml(areaLabel)})` : ""}, de preferência no computador:</p>
  <p style="margin:28px 0">
    <a href="${link}" style="background:#17130C;color:#FAF4E8;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block">Continuar meu diagnóstico</a>
  </p>
  <p>Lá você entra com o Google, escolhe as vagas que quer e sobe o PDF do seu LinkedIn. Em poucos minutos sai a nota do seu perfil comparada com essas vagas, com o texto pronto pra copiar.</p>
  <p>O primeiro LinkedIn Review do mês é grátis.</p>
  <p style="margin-top:28px">Eduardo Medina<br><span style="color:#6b6458">Carreira em Dólar · GlobeJobbers</span></p>
</div>`.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Seu diagnóstico do GlobeJobbers (abre no computador)",
        text,
        html,
      }),
    });
    if (!res.ok) {
      console.error("QUIZ_EMAIL_FAILED", { email, status: res.status, body: await res.text() });
    }
  } catch (err) {
    console.error("QUIZ_EMAIL_FAILED", { email, err });
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
