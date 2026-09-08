import { getSupabaseAdmin } from "@/lib/supabase";

// Onboarding Assistant (ver claude/PROPOSTA-ONBOARDING-ASSISTANT.md no
// projeto): helpers de servidor compartilhados entre o dashboard e as
// rotas /api/onboarding/*. O assistente ORQUESTRA fluxos existentes —
// nada aqui reescreve motor de ferramenta.

/** Vaga do corpus oferecida no passo 3 (resumo seguro pro client). */
export interface OnboardingJobOption {
  /** Posição no array raw_jobs.jobs do relatório — usada na seleção. */
  index: number;
  title: string;
  employer: string;
  snippet: string;
}

interface CorpusJob {
  title?: string;
  employer?: string;
  description?: string;
}

interface ReportRow {
  id: string;
  raw_jobs: { jobs?: CorpusJob[] } | null;
}

const MAX_JOB_OPTIONS = 15;
const SNIPPET_LENGTH = 180;

/**
 * Relatório de Market Intelligence mais recente que o usuário viu — o
 * gerado por ele (created_by) ou, se o dele veio do cache, o relatório
 * cacheado (id em analyses.input_data). null = usuário ainda não rodou MI
 * ou o corpus não está disponível (relatórios antigos descartavam raw_jobs).
 */
export async function findOnboardingReport(userId: string): Promise<ReportRow | null> {
  const admin = getSupabaseAdmin();

  const { data: own } = await admin
    .from("market_reports")
    .select("id, raw_jobs")
    .eq("created_by", userId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (own && corpusJobs(own as ReportRow).length > 0) return own as ReportRow;

  // Relatório servido do cache: o id fica em analyses.input_data
  // (cachedReportId no start, reportId no finalize).
  const { data: analysis } = await admin
    .from("analyses")
    .select("input_data")
    .eq("user_id", userId)
    .eq("tool_type", "market_intel")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const inputData = (analysis?.input_data ?? {}) as { cachedReportId?: string; reportId?: string };
  const reportId = inputData.cachedReportId ?? inputData.reportId;
  if (!reportId) return null;

  const { data: cached } = await admin
    .from("market_reports")
    .select("id, raw_jobs")
    .eq("id", reportId)
    .eq("status", "ready")
    .maybeSingle();
  if (cached && corpusJobs(cached as ReportRow).length > 0) return cached as ReportRow;
  return null;
}

export function corpusJobs(row: ReportRow): CorpusJob[] {
  const jobs = row.raw_jobs?.jobs;
  return Array.isArray(jobs) ? jobs : [];
}

/** Opções do passo 3 — título + empresa + trecho, nunca a JD inteira. */
export function toJobOptions(row: ReportRow): OnboardingJobOption[] {
  return corpusJobs(row)
    .map((j, index) => ({
      index,
      title: (j.title ?? "").trim(),
      employer: (j.employer ?? "").trim(),
      snippet: (j.description ?? "").replace(/\s+/g, " ").trim().slice(0, SNIPPET_LENGTH),
    }))
    .filter((j) => j.title.length > 0)
    .slice(0, MAX_JOB_OPTIONS);
}

/** Texto completo de uma vaga do corpus, no formato que as vagas coladas têm. */
export function jobTextAt(row: ReportRow, index: number): string | null {
  const job = corpusJobs(row)[index];
  if (!job) return null;
  const parts = [job.title ?? "", job.employer ? `Empresa: ${job.employer}` : "", "", job.description ?? ""];
  const text = parts.join("\n").trim();
  return text.length > 0 ? text : null;
}
