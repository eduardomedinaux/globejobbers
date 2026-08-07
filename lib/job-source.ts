import type { MarketIntelRegion } from "@/lib/types";

// Fonte de vagas do Market Intelligence, atrás de uma interface — o spike
// de 06/ago provou o porquê: o JSearch mudou /search → /search-v2 sem aviso.
// Se o fornecedor mudar/morrer, troca-se o adapter, não a feature.
//
// Adapter atual: JSearch (OpenWeb Ninja via RapidAPI) — indexa o Google for
// Jobs. Validado no spike: JD completa em 90-100%, country=br funciona,
// ~35% dos "publishers" são boards republicadores (filtrados abaixo).
// Server-only: JSEARCH_KEY vive em .env.local / Vercel env.

export interface SourcedJob {
  /** Chave de dedup: employer normalizado + título normalizado. */
  dedupeKey: string;
  title: string;
  employer: string;
  publisher: string;
  description: string;
  isRemote: boolean;
  country: string;
}

const JSEARCH_HOST = "jsearch.p.rapidapi.com";
// search-v2: resposta em data.jobs (o /search antigo devolvia array direto).
const JSEARCH_ENDPOINT = `https://${JSEARCH_HOST}/search-v2`;

/**
 * "Empregadores" que na verdade são boards republicadores (medido no spike:
 * ~35% das vagas). Não dá pra confiar neles como empresa; a vaga em si
 * continua útil (a JD é real), então filtramos só a IDENTIDADE, não a vaga —
 * e usamos a lista pra dedup mais agressivo (mesmo título em N boards).
 */
const REPUBLISHER_NAMES = new Set(
  [
    "flexboard",
    "remote click jobs",
    "remote zest jobs",
    "vacancy global pro",
    "hire feed",
    "confidential",
    "bebee",
    "lensa",
    "jobright",
    "dailyremote",
    "remote rocketship",
    "talent.com",
    "jobgether",
  ].map((s) => s.toLowerCase()),
);

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Título sem sufixos de localização/observações: corta em " - ", " | ", "(". */
function normalizeTitle(title: string): string {
  return normalize(title.replace(/\s*[-–|(].*$/, ""));
}

function regionParams(region: MarketIntelRegion, query: string): { query: string; country: string } {
  switch (region) {
    case "us":
      return { query, country: "us" };
    case "europe":
      // JSearch não tem "região Europa" — usamos os dois maiores hubs de
      // vagas remotas em inglês da região como proxy no MVP.
      return { query: `${query} remote europe`, country: "gb" };
    case "latam":
      // Vagas LATAM-friendly são majoritariamente postadas nos EUA com
      // "latam" no texto — padrão observado no spike (pd_latam).
      return { query: `${query} latam`, country: "us" };
    case "br":
      return { query, country: "br" };
  }
}

interface JSearchJob {
  job_title?: string;
  employer_name?: string;
  job_publisher?: string;
  job_description?: string;
  job_is_remote?: boolean;
  job_country?: string;
}

async function fetchPage(
  apiKey: string,
  query: string,
  country: string,
  page: number,
  remoteOnly: boolean,
): Promise<JSearchJob[]> {
  const params = new URLSearchParams({
    query,
    page: String(page),
    num_pages: "1",
    country,
    date_posted: "month",
  });
  if (remoteOnly) params.set("work_from_home", "true");

  const res = await fetch(`${JSEARCH_ENDPOINT}?${params}`, {
    headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": JSEARCH_HOST },
    // Cache do Next desligado: cada relatório fresco coleta dados frescos.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`JSearch HTTP ${res.status}`);
  }
  const data = await res.json();
  const list = Array.isArray(data.data) ? data.data : (data.data?.jobs ?? []);
  return Array.isArray(list) ? list : [];
}

/**
 * Busca vagas pra um conjunto de nomenclaturas do cargo, em paralelo, com
 * teto de requisições. Dedup por (employer + título normalizado) — e vagas
 * de republishers dedupam só por título (o "employer" deles é ruído).
 */
export async function searchJobs(
  roleQueries: string[],
  region: MarketIntelRegion,
  maxRequests: number,
): Promise<{ jobs: SourcedJob[]; requestsUsed: number; collected: number }> {
  const apiKey = process.env.JSEARCH_KEY;
  if (!apiKey) {
    throw new Error("JSEARCH_KEY não configurada no ambiente.");
  }

  const remoteOnly = region !== "br"; // no BR aceitamos híbrido/presencial também
  const pagesPerQuery = Math.max(1, Math.floor(maxRequests / Math.max(1, roleQueries.length)));

  const tasks: Promise<JSearchJob[]>[] = [];
  let requestsUsed = 0;
  for (const roleQuery of roleQueries) {
    const { query, country } = regionParams(region, roleQuery);
    for (let page = 1; page <= pagesPerQuery && requestsUsed < maxRequests; page++) {
      requestsUsed++;
      tasks.push(
        fetchPage(apiKey, query, country, page, remoteOnly).catch((error) => {
          // Uma página que falha não derruba o relatório — coleta parcial vale.
          console.error("MARKET_INTEL_FETCH_PAGE_FAILED", { roleQuery, page, error: String(error) });
          return [] as JSearchJob[];
        }),
      );
    }
  }

  const pages = await Promise.all(tasks);
  const raw = pages.flat();

  const seen = new Set<string>();
  const jobs: SourcedJob[] = [];
  for (const j of raw) {
    const title = (j.job_title ?? "").toString().slice(0, 200);
    const description = (j.job_description ?? "").toString();
    if (!title || description.length < 400) continue; // JD curta demais não sustenta extração

    const employer = (j.employer_name ?? "").toString().slice(0, 120);
    const isRepublisher = REPUBLISHER_NAMES.has(normalize(employer));
    const dedupeKey = isRepublisher
      ? `~board~|${normalizeTitle(title)}`
      : `${normalize(employer)}|${normalizeTitle(title)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    jobs.push({
      dedupeKey,
      title,
      employer,
      publisher: (j.job_publisher ?? "").toString().slice(0, 80),
      description: description.slice(0, 12_000),
      isRemote: j.job_is_remote === true,
      country: (j.job_country ?? "").toString(),
    });
  }

  return { jobs, requestsUsed, collected: raw.length };
}
