import {
  fetchPage,
  normalize,
  normalizeTitle,
  sleep,
  FETCH_CONCURRENCY,
  FETCH_WAVE_DELAY_MS,
  type JSearchDatePosted,
  type JSearchJob,
} from "@/lib/job-source";
import { getSupabaseAdmin } from "@/lib/supabase";
import { buildStoreJobs, toStoreJob, type StoreJob } from "@/lib/jobs-store";

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

// Filtros de qualidade (gig, republicador, países, escopo) agora vivem em
// lib/jobs-store.ts — fonte única da régua, compartilhada entre o estoque
// e esta vitrine (decisão 05/nov).

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

/** StoreJob → DailyJob (o story não carrega descrição/cargo da coleta). */
function toDailyJob(s: StoreJob): DailyJob {
  return {
    jobId: s.jobId,
    title: s.title,
    company: s.company,
    salaryMin: s.salaryMin,
    salaryMax: s.salaryMax,
    salaryCurrency: s.salaryCurrency,
    salaryPeriod: s.salaryPeriod,
    remoteScope: s.remoteScope,
    applyUrl: s.applyUrl,
    source: s.source,
    postedAt: s.postedAt,
  };
}

/**
 * Seleção pura (sem rede/banco) — testável com os JSONs do spike-output.
 * A validação/normalização de cada vaga delega pra régua única do estoque
 * (toStoreJob); aqui fica só o que é da vitrine: dedupe, ranking (salário
 * declarado primeiro, depois mais recente) e variedade por empresa.
 */
export function selectDailyJobs(raw: JSearchJob[], count = DAILY_JOB_COUNT): DailyJob[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const candidates: DailyJob[] = [];

  for (const j of raw) {
    const store = toStoreJob(j, "", "us");
    if (!store) continue;
    const key = `${normalize(store.company)}|${normalizeTitle(store.title)}`;
    if (seenIds.has(store.jobId) || seenKeys.has(key)) continue;
    seenIds.add(store.jobId);
    seenKeys.add(key);
    candidates.push(toDailyJob(store));
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
export async function fetchDailyJobs(): Promise<{
  jobs: DailyJob[];
  /** TODAS as vagas limpas da coleta, tagueadas por cargo — vão pro estoque. */
  storeJobs: StoreJob[];
  summary: DailyFetchSummary;
}> {
  const apiKey = process.env.JSEARCH_KEY;
  if (!apiKey) throw new Error("JSEARCH_KEY não configurada no ambiente.");

  const startedAt = Date.now();
  let requestsUsed = 0;
  let failedRequests = 0;
  let rateLimited = false;
  const windows: JSearchDatePosted[] = [];
  const raw: JSearchJob[] = [];
  // Mesmo lote, tagueado por cargo da busca — alimenta o estoque (a
  // role_query é o eixo da aba "Vagas pro seu alvo" e do MI).
  const tagged: { query: string; jobs: JSearchJob[] }[] = [];

  const runWindow = async (queries: string[], datePosted: JSearchDatePosted) => {
    windows.push(datePosted);
    for (let i = 0; i < queries.length; i += FETCH_CONCURRENCY) {
      const wave = queries.slice(i, i + FETCH_CONCURRENCY);
      const settled = await Promise.all(
        wave.map(async (q) => {
          requestsUsed++;
          try {
            return { query: q, jobs: await fetchPage(apiKey, q, "us", 1, true, datePosted) };
          } catch (error) {
            if (String(error).includes("429")) rateLimited = true;
            failedRequests++;
            console.error("JOBS_DAILY_FETCH_PAGE_FAILED", { query: q, datePosted, error: String(error) });
            return { query: q, jobs: [] as JSearchJob[] };
          }
        }),
      );
      for (const batch of settled) {
        raw.push(...batch.jobs);
        tagged.push(batch);
      }
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

  const storeJobs = buildStoreJobs(tagged);
  const summary: DailyFetchSummary = {
    requestsUsed,
    failedRequests,
    rateLimited,
    rawJobs: raw.length,
    windows,
    elapsedMs: Date.now() - startedAt,
  };
  console.log("JOBS_DAILY_SUMMARY", { ...summary, selected: jobs.length, store: storeJobs.length });
  return { jobs, storeJobs, summary };
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
