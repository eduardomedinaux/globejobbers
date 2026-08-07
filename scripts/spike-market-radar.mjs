/**
 * SPIKE do Radar de Mercado (Market Intelligence) — NÃO é código de produção.
 *
 * Valida, com dados reais:
 *   1. Qualidade do JSearch pro nosso nicho (JD completa? remoto? BR/LATAM?)
 *   2. Taxa de salário declarado nas vagas
 *   3. Taxa de duplicatas (mesmo empregador+título)
 *   4. Volume de tokens por JD (pra projetar custo do Haiku)
 *   5. Remotive e Jobicy (grátis, sem chave) como fontes de corpus
 *
 * COMO RODAR (no seu terminal, na raiz do repo):
 *   1. Crie conta grátis em https://rapidapi.com e assine o plano FREE do
 *      JSearch (200 requisições/mês): https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 *   2. Copie sua X-RapidAPI-Key e rode:
 *        JSEARCH_KEY=SUA_CHAVE node scripts/spike-market-radar.mjs
 *      (a chave fica só no comando/env — nunca em arquivo commitado)
 *
 * Custo: ~12 requisições do free tier (200/mês). Nada é cobrado.
 * Saída: pasta spike-output/ (auto-ignorada pelo git) com os JSONs brutos
 * e um summary.md legível. Me avise quando terminar que eu analiso.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";

const OUT_DIR = "spike-output";

// Chave: env JSEARCH_KEY ou linha JSEARCH_KEY=... no .env.local (gitignorado).
async function resolveKey() {
  if (process.env.JSEARCH_KEY) return process.env.JSEARCH_KEY.trim();
  try {
    const env = await readFile(".env.local", "utf8");
    const m = env.match(/^\s*JSEARCH_KEY\s*=\s*["']?([^"'\r\n]+)["']?\s*$/m);
    if (m) return m[1].trim();
  } catch {}
  return null;
}
const KEY = await resolveKey();

// Matriz de queries: 2 personas × nomenclaturas + recortes BR/LATAM.
// 2 páginas por query nas principais (cada página ~10 vagas).
const JSEARCH_QUERIES = [
  { id: "pd_us_remote", query: "product designer", country: "us", remote: true, pages: 2 },
  { id: "ux_us_remote", query: "ux designer", country: "us", remote: true, pages: 2 },
  { id: "uxui_us_remote", query: "ux/ui designer", country: "us", remote: true, pages: 1 },
  { id: "pd_latam", query: "product designer latam", country: "us", remote: true, pages: 1 },
  { id: "pd_br", query: "product designer", country: "br", remote: true, pages: 1 },
  { id: "csm_us_remote", query: "customer success manager", country: "us", remote: true, pages: 2 },
  { id: "sdr_us_remote", query: "sales development representative", country: "us", remote: true, pages: 1 },
];

function tokenEstimate(text) {
  // Aproximação grosseira: ~4 chars/token (inglês). Serve pra ordem de grandeza.
  return Math.round((text ?? "").length / 4);
}

async function fetchJSearch({ id, query, country, remote, pages }) {
  const jobs = [];
  let requests = 0;
  for (let page = 1; page <= pages; page++) {
    const params = new URLSearchParams({
      query,
      page: String(page),
      num_pages: "1", // 1 página por requisição = billing previsível
      country,
      date_posted: "month",
    });
    if (remote) params.set("work_from_home", "true");
    const url = `https://jsearch.p.rapidapi.com/search-v2?${params}`;
    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    });
    requests++;
    if (!res.ok) {
      console.error(`  [${id}] page ${page}: HTTP ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
      break;
    }
    const data = await res.json();
    // search-v2: data é objeto { jobs: [...] }; no /search antigo era array direto.
    const list = Array.isArray(data.data) ? data.data : (data.data?.jobs ?? []);
    jobs.push(...list);
    await new Promise((r) => setTimeout(r, 600)); // educado com o rate limit
  }
  return { jobs, requests };
}

function analyzeJSearch(id, jobs) {
  const n = jobs.length;
  if (n === 0) return { id, jobs: 0, note: "sem resultados" };

  const descLens = jobs.map((j) => (j.job_description ?? "").length);
  const fullDesc = descLens.filter((l) => l >= 1200).length;
  const withSalary = jobs.filter((j) => j.job_min_salary || j.job_max_salary).length;
  const remoteFlag = jobs.filter((j) => j.job_is_remote === true).length;
  const publishers = {};
  for (const j of jobs) publishers[j.job_publisher ?? "?"] = (publishers[j.job_publisher ?? "?"] ?? 0) + 1;
  const seen = new Set();
  let dups = 0;
  for (const j of jobs) {
    const k = `${(j.employer_name ?? "").toLowerCase()}|${(j.job_title ?? "").toLowerCase()}`;
    if (seen.has(k)) dups++;
    else seen.add(k);
  }
  const titles = {};
  for (const j of jobs) {
    const t = (j.job_title ?? "").toLowerCase().replace(/\s*[-–(].*$/, "").trim();
    titles[t] = (titles[t] ?? 0) + 1;
  }
  const avgTokens = Math.round(descLens.reduce((s, l) => s + l, 0) / n / 4);

  return {
    id,
    jobs: n,
    full_description_pct: Math.round((100 * fullDesc) / n),
    desc_len_median: descLens.sort((a, b) => a - b)[Math.floor(n / 2)],
    salary_declared_pct: Math.round((100 * withSalary) / n),
    remote_flag_pct: Math.round((100 * remoteFlag) / n),
    dup_rate_pct: Math.round((100 * dups) / n),
    avg_tokens_per_jd: avgTokens,
    publishers,
    top_titles: Object.entries(titles).sort((a, b) => b[1] - a[1]).slice(0, 8),
    countries: [...new Set(jobs.map((j) => j.job_country))],
  };
}

async function fetchFreeBoards() {
  const out = {};
  // Remotive (oficial, grátis; robots bloqueia crawlers, API é aberta a servidores)
  try {
    const res = await fetch("https://remotive.com/api/remote-jobs?search=designer&limit=100");
    const data = await res.json();
    const jobs = data.jobs ?? [];
    out.remotive = {
      jobs: jobs.length,
      total_field: data["job-count"] ?? data.total_job_count ?? null,
      salary_filled_pct: Math.round((100 * jobs.filter((j) => (j.salary ?? "").trim()).length) / (jobs.length || 1)),
      locations: [...new Set(jobs.map((j) => j.candidate_required_location))].slice(0, 25),
      desc_len_median: jobs.map((j) => (j.description ?? "").length).sort((a, b) => a - b)[Math.floor(jobs.length / 2)] ?? 0,
    };
    await writeFile(`${OUT_DIR}/remotive_designer.json`, JSON.stringify(data, null, 2));
  } catch (e) {
    out.remotive = { error: String(e) };
  }
  // Jobicy (oficial, grátis)
  try {
    const res = await fetch("https://jobicy.com/api/v2/remote-jobs?count=50&tag=designer");
    const data = await res.json();
    const jobs = data.jobs ?? [];
    out.jobicy = {
      jobs: jobs.length,
      salary_filled_pct: Math.round(
        (100 * jobs.filter((j) => j.annualSalaryMin || j.annualSalaryMax).length) / (jobs.length || 1),
      ),
      geos: [...new Set(jobs.map((j) => j.jobGeo))],
      desc_len_median: jobs.map((j) => (j.jobDescription ?? "").length).sort((a, b) => a - b)[Math.floor(jobs.length / 2)] ?? 0,
    };
    await writeFile(`${OUT_DIR}/jobicy_designer.json`, JSON.stringify(data, null, 2));
  } catch (e) {
    out.jobicy = { error: String(e) };
  }
  return out;
}

async function main() {
  if (!KEY) {
    console.error("Faltou a chave: adicione JSEARCH_KEY=sua_chave no .env.local (ou passe via env).");
    process.exit(1);
  }
  console.log(`Usando chave: ${KEY.slice(0, 4)}…${KEY.slice(-4)} (${KEY.length} caracteres)`);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(`${OUT_DIR}/.gitignore`, "*\n"); // nunca commitar dados do spike

  const summaries = [];
  let totalRequests = 0;
  const allSalaried = [];

  for (const q of JSEARCH_QUERIES) {
    console.log(`Consultando JSearch: ${q.id} …`);
    const { jobs, requests } = await fetchJSearch(q);
    totalRequests += requests;
    await writeFile(`${OUT_DIR}/jsearch_${q.id}.json`, JSON.stringify(jobs, null, 2));
    const s = analyzeJSearch(q.id, jobs);
    summaries.push(s);
    console.log(`  → ${s.jobs} vagas | JD completa ${s.full_description_pct ?? 0}% | salário ${s.salary_declared_pct ?? 0}%`);
    for (const j of jobs) {
      if (j.job_min_salary || j.job_max_salary) {
        allSalaried.push({
          q: q.id, title: j.job_title, employer: j.employer_name,
          min: j.job_min_salary, max: j.job_max_salary,
          currency: j.job_salary_currency, period: j.job_salary_period,
        });
      }
    }
  }

  console.log("Consultando boards gratuitos (Remotive, Jobicy)…");
  const freeBoards = await fetchFreeBoards();

  const summary = {
    generated_at: new Date().toISOString(),
    jsearch_requests_used: totalRequests,
    jsearch: summaries,
    salaried_examples: allSalaried.slice(0, 20),
    free_boards: freeBoards,
  };
  await writeFile(`${OUT_DIR}/summary.json`, JSON.stringify(summary, null, 2));

  const md = [
    "# Spike Radar de Mercado — resultados brutos",
    `Gerado: ${summary.generated_at} · Requisições JSearch: ${totalRequests}`,
    "",
    "| query | vagas | JD completa | salário | remoto | dup | ~tokens/JD |",
    "|---|---|---|---|---|---|---|",
    ...summaries.map((s) =>
      `| ${s.id} | ${s.jobs} | ${s.full_description_pct ?? "-"}% | ${s.salary_declared_pct ?? "-"}% | ${s.remote_flag_pct ?? "-"}% | ${s.dup_rate_pct ?? "-"}% | ${s.avg_tokens_per_jd ?? "-"} |`,
    ),
    "",
    "## Boards gratuitos",
    "```json",
    JSON.stringify(freeBoards, null, 2),
    "```",
  ].join("\n");
  await writeFile(`${OUT_DIR}/summary.md`, md);

  console.log(`\nPronto! Resultados em ${OUT_DIR}/ (summary.md tem a visão geral).`);
  console.log("Me avise no chat que eu leio os arquivos e monto a análise.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
