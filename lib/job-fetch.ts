// Importação da descrição de uma vaga a partir da URL (best-effort).
// Extraído de app/api/job-fetch/route.ts (24/set) para ser compartilhado
// entre a rota logada (Interview Prep, MI) e a rota pública do funil
// (/api/preview/job-fetch). Muitos job boards bloqueiam bots (LinkedIn,
// Indeed) — nesses casos devolvemos erro amigável e a UI pede pro usuário
// colar o texto. Greenhouse, Lever, Workable e sites próprios funcionam.
//
// Sem headless browser, sem login, sem retry agressivo: 1 fetch simples.
// (Princípio do projeto: zero scraping logado/automatização de conta.)

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 1_500_000;
const MIN_EXTRACTED_CHARS = 300;
const MAX_EXTRACTED_CHARS = 15000;

export const JOB_FETCH_PASTE_FALLBACK =
  "Não conseguimos ler essa página (o site bloqueia leitura automática). Cole o texto da vaga.";

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

export type JobFetchResult =
  | { ok: true; text: string; chars: number }
  | { ok: false; status: 400 | 422; error: string };

/** Valida a URL e busca o texto da vaga. Nunca lança — retorna erro tipado. */
export async function fetchJobDescription(rawUrl: unknown): Promise<JobFetchResult> {
  let url: URL;
  try {
    url = new URL(typeof rawUrl === "string" ? rawUrl.trim() : "");
  } catch {
    return { ok: false, status: 400, error: "URL inválida." };
  }

  if (!["http:", "https:"].includes(url.protocol) || isBlockedHost(url.hostname)) {
    return { ok: false, status: 400, error: "URL inválida." };
  }

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
      return { ok: false, status: 422, error: JOB_FETCH_PASTE_FALLBACK };
    }

    const html = (await res.text()).slice(0, MAX_HTML_BYTES);
    const text = htmlToText(html).slice(0, MAX_EXTRACTED_CHARS);

    if (text.length < MIN_EXTRACTED_CHARS) {
      // Página carregada mas sem conteúdo útil (SPA renderizada via JS, ou
      // paywall) — mesmo tratamento: pedir pra colar.
      return { ok: false, status: 422, error: JOB_FETCH_PASTE_FALLBACK };
    }

    return { ok: true, text, chars: text.length };
  } catch {
    return { ok: false, status: 422, error: JOB_FETCH_PASTE_FALLBACK };
  }
}
