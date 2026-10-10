import {
  fetchPage,
  normalize,
  normalizeTitle,
  sanitizeText,
  sleep,
  FETCH_CONCURRENCY,
  FETCH_WAVE_DELAY_MS,
  REPUBLISHER_NAMES,
  type JSearchDatePosted,
  type JSearchJob,
} from "@/lib/job-source";
import { getSupabaseAdmin } from "@/lib/supabase";

// "Vagas do dia": 5 vagas remotas recentes, escolhidas uma vez por dia
// (cron da Vercel → /api/jobs-daily) pra virar story no Instagram
// (/api/jobs-daily/story). Reusa a camada do JSearch do Market Intelligence
// (lib/job-source.ts) sem mexer no comportamento do MI.
//
// REGRA DO PROJETO: o JSearch é um índice do Google for Jobs. A gente
// mostra só cargo, empresa, faixa salarial e o link ORIGINAL da vaga —
// nunca armazena nem exibe a descrição.

/** Cargos do público (ver CLAUDE.md). Uma requisição por cargo. */
export const DAILY_ROLE_QUERIES = [
  "Product Designer",
  "UX Designer",
  "Marketing Manager",
  "Sales Development Representative",
  "Customer Success Manager",
  "Product Manager",
  "Frontend Developer",
];

/** Teto por execução — o plano PRO tem 10k/mês; isso dá ~300/mês. */
export const DAILY_MAX_REQUESTS = 10;
export const DAILY_JOB_COUNT = 5;

/** Países que não fazem sentido pro público (fuso/visto). Vaga sem país = ok. */
const EXCLUDED_COUNTRIES = new Set([
  "in", "pk", "bd", "lk", "ph", "id", "my", "sg", "th", "vn", "cn", "hk", "tw",
  "jp", "kr", "au", "nz", "za", "ng", "ke", "eg", "ae", "sa", "il", "tr", "ru",
]);

// Plataformas de gig/freela (decisão 10/out, 1º dry-run): o story vende
// emprego internacional estruturado — bico por hora em marketplace não
// sustenta a promessa da marca. Checamos nome do empregador E domínio do
// link de aplicação.
const GIG_NAMES = new Set([
  "upwork",
  "fiverr",
  "freelancer",
  "peopleperhour",
  "guru",
  "contra",
  "workana",
  "truelancer",
  "toptal",
]);
const GIG_DOMAINS = [
  "upwork.com",
  "fiverr.com",
  "freelancer.com",
  "peopleperhour.com",
  "guru.com",
  "contra.com",
  "workana.com",
  "truelancer.com",
  "toptal.com",
];

function isGigListing(company: string, applyUrl: string): boolean {
  if (GIG_NAMES.has(normalize(company))) return true;
  let host = "";
  try {
    host = new URL(applyUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  return GIG_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

export interface DailyJob {
  jobId: string;
  title: string;
  company: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  /** "worldwide" | "latam" | código do país em maiúsculas (ex.: "US"). */
  remoteScope: string;
  applyUrl: string;
  source: string;
  postedAt: string | null;
}

export interface DailyJobsRow extends DailyJob {
  runDate: string;
  position: number;
}

function deriveScope(j: JSearchJob): string {
  const loc = normalize((j.job_location ?? "").toString());
  const title = normalize((j.job_title ?? "").toString());
  if (/latam|latin america|américa latina/.test(`${loc} ${title}`)) return "latam";
  if (!j.job_country || loc === "anywhere" || /worldwide|global/.test(loc)) return "worldwide";
  return j.job_country.toString().toUpperCase().slice(0, 2);
}

/**
 * Seleção pura (sem rede/banco) — testável com os JSONs do spike-output.
 * Filtra, dedupa e ranqueia: salário declarado primeiro, depois mais recente.
 */
export function selectDailyJobs(raw: JSearchJob[], count = DAILY_JOB_COUNT): DailyJob[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const candidates: DailyJob[] = [];

  for (const j of raw) {
    const title = sanitizeText((j.job_title ?? "").toString()).trim().slice(0, 120);
    const company = sanitizeText((j.employer_name ?? "").toString()).trim().slice(0, 80);
    const applyUrl = (j.job_apply_link ?? "").toString().trim();
    if (!title || !company || !/^https?:\/\//.test(applyUrl)) continue;
    if (j.job_is_remote !== true) continue;
    // Board republicador como "empresa" não serve pra um story — queremos
    // o nome real do empregador. O padrão "... jobs" pega os boards que
    // ainda não estão na lista (ex.: "remote quest jobs").
    if (REPUBLISHER_NAMES.has(normalize(company))) continue;
    if (/\bjobs\b/.test(normalize(company))) continue;
    // Gig/freela em marketplace fica fora da vitrine do dia.
    if (isGigListing(company, applyUrl)) continue;
    const country = (j.job_country ?? "").toString().toLowerCase();
    if (country && EXCLUDED_COUNTRIES.has(country)) continue;

    const jobId = (j.job_id ?? "").toString().trim() || `${normalize(company)}|${normalizeTitle(title)}`;
    const key = `${normalize(company)}|${normalizeTitle(title)}`;
    if (seenIds.has(jobId) || seenKeys.has(key)) continue;
    seenIds.add(jobId);
    seenKeys.add(key);

    candidates.push({
      jobId: jobId.slice(0, 200),
      title,
      company,
      salaryMin: typeof j.job_min_salary === "number" ? j.job_min_salary : null,
      salaryMax: typeof j.job_max_salary === "number" ? j.job_max_salary : null,
      salaryCurrency: j.job_salary_currency ? j.job_salary_currency.toString().toUpperCase().slice(0, 3) : null,
      salaryPeriod: j.job_salary_period ? j.job_salary_period.toString().toUpperCase().slice(0, 10) : null,
      remoteScope: deriveScope(j),
      applyUrl: applyUrl.slice(0, 500),
      source: sanitizeText((j.job_publisher ?? "").toString()).slice(0, 80),
      postedAt: j.job_posted_at_datetime_utc ? j.job_posted_at_datetime_utc.toString() : null,
    });
  }

  candidates.sort((a, b) => {
    const sa = a.salaryMin !== null || a.salaryMax !== null ? 1 : 0;
    const sb = b.salaryMin !== null || b.salaryMax !== null ? 1 : 0;
    if (sa !== sb) return sb - sa;
    return (b.postedAt ?? "").localeCompare(a.postedAt ?? "");
  });

  // Variedade: no máximo 2 vagas da mesma empresa no top 5.
  const perCompany = new Map<string, number>();
  const picked: DailyJob[] = [];
  for (const c of candidates) {
    const k = normalize(c.company);
    const n = perCompany.get(k) ?? 0;
    if (n >= 2) continue;
    perCompany.set(k, n + 1);
    picked.push(c);
    if (picked.length >= count) break;
  }
  return picked;
}

export interface DailyFetchSummary {
  requestsUsed: number;
  failedRequests: number;
  rateLimited: boolean;
  rawJobs: number;
  windows: JSearchDatePosted[];
  elapsedMs: number;
}

/**
 * Coleta: 1 página por cargo com date_posted=today. Se não juntar 5 vagas
 * válidas, segunda passada com "3days" nos primeiros cargos, respeitando o
 * teto de requisições. Mesmo padrão de ondas/pausa do MI.
 */
export async function fetchDailyJobs(): Promise<{ jobs: DailyJob[]; summary: DailyFetchSummary }> {
  const apiKey = process.env.JSEARCH_KEY;
  if (!apiKey) throw new Error("JSEARCH_KEY não configurada no ambiente.");

  const startedAt = Date.now();
  let requestsUsed = 0;
  let failedRequests = 0;
  let rateLimited = false;
  const windows: JSearchDatePosted[] = [];
  const raw: JSearchJob[] = [];

  const runWindow = async (queries: string[], datePosted: JSearchDatePosted) => {
    windows.push(datePosted);
    for (let i = 0; i < queries.length; i += FETCH_CONCURRENCY) {
      const wave = queries.slice(i, i + FETCH_CONCURRENCY);
      const settled = await Promise.all(
        wave.map(async (q) => {
          requestsUsed++;
          try {
            return await fetchPage(apiKey, q, "us", 1, true, datePosted);
          } catch (error) {
            if (String(error).includes("429")) rateLimited = true;
            failedRequests++;
            console.error("JOBS_DAILY_FETCH_PAGE_FAILED", { query: q, datePosted, error: String(error) });
            return [] as JSearchJob[];
          }
        }),
      );
      raw.push(...settled.flat());
      if (i + FETCH_CONCURRENCY < queries.length) await sleep(FETCH_WAVE_DELAY_MS);
    }
  };

  await runWindow(DAILY_ROLE_QUERIES.slice(0, DAILY_MAX_REQUESTS), "today");
  let jobs = selectDailyJobs(raw);

  const remaining = DAILY_MAX_REQUESTS - requestsUsed;
  if (jobs.length < DAILY_JOB_COUNT && remaining > 0) {
    await sleep(FETCH_WAVE_DELAY_MS);
    await runWindow(DAILY_ROLE_QUERIES.slice(0, remaining), "3days");
    jobs = selectDailyJobs(raw);
  }

  const summary: DailyFetchSummary = {
    requestsUsed,
    failedRequests,
    rateLimited,
    rawJobs: raw.length,
    windows,
    elapsedMs: Date.now() - startedAt,
  };
  console.log("JOBS_DAILY_SUMMARY", { ...summary, selected: jobs.length });
  return { jobs, summary };
}

/** Data de hoje em São Paulo (YYYY-MM-DD) — o cron roda em UTC. */
export function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Grava o dia (idempotente: apaga e regrava as linhas da mesma run_date). */
export async function saveDailyJobs(runDate: string, jobs: DailyJob[]): Promise<void> {
  const supabase = getSupabaseAdmin();
  const del = await supabase.from("jobs_daily").delete().eq("run_date", runDate);
  if (del.error) throw new Error(`jobs_daily delete: ${del.error.message}`);
  if (jobs.length === 0) return;
  const rows = jobs.map((j, i) => ({
    run_date: runDate,
    position: i + 1,
    job_id: j.jobId,
    title: j.title,
    company: j.company,
    salary_min: j.salaryMin,
    salary_max: j.salaryMax,
    salary_currency: j.salaryCurrency,
    salary_period: j.salaryPeriod,
    remote_scope: j.remoteScope,
    apply_url: j.applyUrl,
    source: j.source,
    posted_at: j.postedAt,
  }));
  const ins = await supabase.from("jobs_daily").insert(rows);
  if (ins.error) throw new Error(`jobs_daily insert: ${ins.error.message}`);
}

/** Lê as vagas de um dia; sem data, o dia mais recente com registros. */
export async function getDailyJobs(runDate?: string): Promise<DailyJobsRow[]> {
  const supabase = getSupabaseAdmin();
  let date = runDate;
  if (!date) {
    const latest = await supabase
      .from("jobs_daily")
      .select("run_date")
      .order("run_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) throw new Error(`jobs_daily latest: ${latest.error.message}`);
    if (!latest.data) return [];
    date = latest.data.run_date as string;
  }
  const res = await supabase
    .from("jobs_daily")
    .select("*")
    .eq("run_date", date)
    .order("position", { ascending: true });
  if (res.error) throw new Error(`jobs_daily read: ${res.error.message}`);
  return (res.data ?? []).map((r) => ({
    runDate: r.run_date,
    position: r.position,
    jobId: r.job_id,
    title: r.title,
    company: r.company,
    salaryMin: r.salary_min,
    salaryMax: r.salary_max,
    salaryCurrency: r.salary_currency,
    salaryPeriod: r.salary_period,
    remoteScope: r.remote_scope,
    applyUrl: r.apply_url,
    source: r.source,
    postedAt: r.posted_at,
  }));
}

/** "US$ 80–110 mil/ano" · "US$ 5 mil/mês" · null quando não declarado. */
export function formatSalary(j: DailyJob): string | null {
  const min = j.salaryMin;
  const max = j.salaryMax;
  if (min === null && max === null) return null;
  const cur = j.salaryCurrency === "USD" || !j.salaryCurrency ? "US$" : j.salaryCurrency;
  const period = j.salaryPeriod === "YEAR" ? "/ano" : j.salaryPeriod === "MONTH" ? "/mês" : j.salaryPeriod === "HOUR" ? "/h" : "";
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)} mil` : `${Math.round(n)}`);
  if (min !== null && max !== null && Math.round(min) !== Math.round(max)) {
    // "58–76 mil/ano" em vez de "58 mil–76 mil/ano".
    if (min >= 1000 && max >= 1000) return `${cur} ${Math.round(min / 1000)}–${Math.round(max / 1000)} mil${period}`;
    return `${cur} ${fmt(min)}–${fmt(max)}${period}`;
  }
  return `${cur} ${fmt((min ?? max) as number)}${period}`;
}

/** Título enxuto pro story: corta parênteses/sufixos e limita o tamanho. */
export function displayTitle(title: string, max = 60): string {
  const t = title.replace(/\s*\(.*?\)\s*/g, " ").replace(/\s*[–|].*$/, "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export function formatScope(scope: string): string {
  if (scope === "worldwide") return "Remoto · Worldwide";
  if (scope === "latam") return "Remoto · LATAM";
  return `Remoto · ${scope}`;
}
