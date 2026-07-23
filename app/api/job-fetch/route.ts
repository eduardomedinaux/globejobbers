import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";

/**
 * Importa a descrição de uma vaga a partir da URL (best-effort). Muitos
 * job boards bloqueiam bots (LinkedIn, Indeed) — nesses casos devolvemos
 * erro amigável e a UI pede pro usuário colar o texto. Greenhouse, Lever,
 * Workable e sites próprios costumam funcionar.
 *
 * Sem headless browser, sem login, sem retry agressivo: 1 fetch simples.
 * (Princípio do projeto: zero scraping logado/automatização de conta.)
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 1_500_000;
const MIN_EXTRACTED_CHARS = 300;
const MAX_EXTRACTED_CHARS = 15000;

// Guarda básica anti-SSRF: só http(s) público.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv4 privados/loopback/link-local (checagem léxica simples)
  if (/^(127|10|0)\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (h === "::1" || h.startsWith("[")) return true;
  return false;
}

/** HTML → texto: remove script/style/nav, tags e entidades comuns. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  let url: URL;
  try {
    const body = await request.json();
    url = new URL(typeof body.url === "string" ? body.url.trim() : "");
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  if (!["http:", "https:"].includes(url.protocol) || isBlockedHost(url.hostname)) {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  const PASTE_FALLBACK =
    "Não conseguimos ler essa página (o site bloqueia leitura automática). Cole o texto da vaga.";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // UA de navegador comum: alguns boards devolvem 403 pra UA vazio.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8",
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ error: PASTE_FALLBACK }, { status: 422 });
    }

    const html = (await res.text()).slice(0, MAX_HTML_BYTES);
    const text = htmlToText(html).slice(0, MAX_EXTRACTED_CHARS);

    if (text.length < MIN_EXTRACTED_CHARS) {
      // Página carregada mas sem conteúdo útil (SPA renderizada via JS, ou
      // paywall) — mesmo tratamento: pedir pra colar.
      return NextResponse.json({ error: PASTE_FALLBACK }, { status: 422 });
    }

    return NextResponse.json({ text, chars: text.length });
  } catch {
    return NextResponse.json({ error: PASTE_FALLBACK }, { status: 422 });
  }
}
