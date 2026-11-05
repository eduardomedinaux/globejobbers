import {
  normalize,
  normalizeTitle,
  sanitizeText,
  REPUBLISHER_NAMES,
  type JSearchJob,
} from "@/lib/job-source";
import { getSupabaseAdmin } from "@/lib/supabase";

// Estoque central de vagas (decisão 05/nov — claude/DECISAO-2026-11-05-
// VAGAS-NA-PLATAFORMA.md): UMA coleta, DOIS consumidores. O cron diário
// grava aqui TODAS as vagas limpas que coletar; a aba "Vagas pro seu
// alvo" e o Market Intelligence leem daqui. O story do Instagram continua
// sendo a view das 5 melhores (lib/jobs-daily.ts), usando ESTES mesmos
// filtros — este arquivo é a fonte única de verdade da limpeza.
//
// REGRA DE DADOS: a descrição fica guardada só pra alimentar MI e match
// (mesma lógica do source_jobs do market_profiles — texto público), com
// expurgo de 30 dias. Sempre exibimos o link ORIGINAL da vaga.

/** Janela de vida do estoque — expurgo roda junto com o cron. */
export const STORE_RETENTION_DAYS = 30;
const MAX_DESCRIPTION_CHARS = 12_000;

// Plataformas de gig/freela (decisão 10/out, 1º dry-run das Vagas do
// dia): vendemos emprego internacional estruturado — bico por hora em
// marketplace não sustenta a promessa. Nome do empregador E domínio.
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

export function isGigListing(company: string, applyUrl: string): boolean {
  if (GIG_NAMES.has(normalize(company))) return true;
  let host = "";
  try {
    host = new URL(applyUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  return GIG_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Países que não fazem sentido pro público (fuso/visto). Vaga sem país = ok. */
const EXCLUDED_COUNTRIES = new Set([
  "in", "pk", "bd", "lk", "ph", "id", "my", "sg", "th", "vn", "cn", "hk", "tw",
  "jp", "kr", "au", "nz", "za", "ng", "ke", "eg", "ae", "sa", "il", "tr", "ru",
]);

export function deriveScope(j: JSearchJob): string {
  const loc = normalize((j.job_location ?? "").toString());
  const title = normalize((j.job_title ?? "").toString());
  if (/latam|latin america|américa latina/.test(`${loc} ${title}`)) return "latam";
  if (!j.job_country || loc === "anywhere" || /worldwide|global/.test(loc)) return "worldwide";
  return j.job_country.toString().toUpperCase().slice(0, 2);
}

/**
 * Semente do diretório de empresas (migração futura JSearch → ATS direto):
 * quando o apply_url já é de um ATS, guardamos "ats:slug". De graça, a
 * cada coleta, o diretório de "empresas que contratam remoto" cresce.
 */
export function extractAtsSlug(applyUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(applyUrl);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const first = url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (!/^[a-z0-9][a-z0-9-_]{1,60}$/.test(first)) return null;
  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") {
    return `greenhouse:${first}`;
  }
  if (host === "jobs.lever.co") return `lever:${first}`;
  if (host === "jobs.ashbyhq.com") return `ashby:${first}`;
  return null;
}

/** Uma vaga do estoque. Superset do DailyJob do story (+ descrição etc.). */
export interface StoreJob {
  jobId: string;
  roleQuery: string;
  region: string;
  title: string;
  company: string;
  description: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  /** "worldwide" | "latam" | código do país (ex.: "US"). */
  remoteScope: string;
  applyUrl: string;
  source: string;
  atsSlug: string | null;
  postedAt: string | null;
}

/**
 * Validação + normalização de UMA vaga crua — a MESMA régua do story
 * (selectDailyJobs delega pra cá). Retorna null quando a vaga não passa.
 */
export function toStoreJob(j: JSearchJob, roleQuery: string, region: string): StoreJob | null {
  const title = sanitizeText((j.job_title ?? "").toString()).trim().slice(0, 120);
  const company = sanitizeText((j.employer_name ?? "").toString()).trim().slice(0, 80);
  const applyUrl = (j.job_apply_link ?? "").toString().trim();
  if (!title || !company || !/^https?:\/\//.test(applyUrl)) return null;
  if (j.job_is_remote !== true) return null;
  // Board republicador como "empresa" não serve — queremos o empregador
  // real. O padrão "... jobs" pega boards fora da lista.
  if (REPUBLISHER_NAMES.has(normalize(company))) return null;
  if (/\bjobs\b/.test(normalize(company))) return null;
  if (isGigListing(company, applyUrl)) return null;
  const country = (j.job_country ?? "").toString().toLowerCase();
  if (country && EXCLUDED_COUNTRIES.has(country)) return null;

  const jobId =
    (j.job_id ?? "").toString().trim() || `${normalize(company)}|${normalizeTitle(title)}`;
  const description = sanitizeText((j.job_description ?? "").toString())
    .trim()
    .slice(0, MAX_DESCRIPTION_CHARS);

  return {
    jobId: jobId.slice(0, 200),
    roleQuery,
    region,
    title,
    company,
    description: description.length > 0 ? description : null,
    salaryMin: typeof j.job_min_salary === "number" ? j.job_min_salary : null,
    salaryMax: typeof j.job_max_salary === "number" ? j.job_max_salary : null,
    salaryCurrency: j.job_salary_currency
      ? j.job_salary_currency.toString().toUpperCase().slice(0, 3)
      : null,
    salaryPeriod: j.job_salary_period
      ? j.job_salary_period.toString().toUpperCase().slice(0, 10)
      : null,
    remoteScope: deriveScope(j),
    applyUrl: applyUrl.slice(0, 500),
    source: sanitizeText((j.job_publisher ?? "").toString()).slice(0, 80),
    atsSlug: extractAtsSlug(applyUrl),
    postedAt: j.job_posted_at_datetime_utc ? j.job_posted_at_datetime_utc.toString() : null,
  };
}

/** Lote cru (tagueado por cargo da busca) → vagas válidas, dedupadas. */
export function buildStoreJobs(
  tagged: { query: string; region?: string; jobs: JSearchJob[] }[],
): StoreJob[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const out: StoreJob[] = [];
  for (const batch of tagged) {
    for (const raw of batch.jobs) {
      const job = toStoreJob(raw, batch.query, batch.region ?? "us");
      if (!job) continue;
      const key = `${normalize(job.company)}|${normalizeTitle(job.title)}`;
      if (seenIds.has(job.jobId) || seenKeys.has(key)) continue;
      seenIds.add(job.jobId);
      seenKeys.add(key);
      out.push(job);
    }
  }
  return out;
}

/**
 * Grava no estoque (upsert por job_id: vaga recoletada ganha collected_at
 * novo e descrição atualizada). Falha NÃO derruba o chamador — o story do
 * dia vale mais que o estoque; loga pra recuperação.
 */
export async function upsertStoreJobs(jobs: StoreJob[]): Promise<number> {
  if (jobs.length === 0) return 0;
  const supabase = getSupabaseAdmin();
  const rows = jobs.map((j) => ({
    job_id: j.jobId,
    role_query: j.roleQuery,
    region: j.region,
    title: j.title,
    company: j.company,
    description: j.description,
    salary_min: j.salaryMin,
    salary_max: j.salaryMax,
    salary_currency: j.salaryCurrency,
    salary_period: j.salaryPeriod,
    remote_scope: j.remoteScope,
    apply_url: j.applyUrl,
    source: j.source,
    ats_slug: j.atsSlug,
    posted_at: j.postedAt,
    collected_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("jobs").upsert(rows, { onConflict: "job_id" });
  if (error) {
    console.error("JOBS_STORE_UPSERT_FAILED", { count: rows.length, error: error.message });
    return 0;
  }
  return rows.length;
}

/** Expurgo: vagas coletadas há mais de STORE_RETENTION_DAYS saem. */
export async function purgeOldStoreJobs(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - STORE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("jobs").delete().lt("collected_at", cutoff);
  if (error) console.error("JOBS_STORE_PURGE_FAILED", { error: error.message });
}
