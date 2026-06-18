// Teste de estabilidade do Score Internacional: envia o mesmo perfil de
// exemplo (lib/sample-profile.ts) para /api/analyze N vezes e imprime os
// scores totais + subscores de cada execução lado a lado, com estatísticas
// de variância (min/max/range/mean/stddev).
//
// Uso: node scripts/test-score-stability.mjs
// (requer o dev server rodando em BASE_URL, default http://localhost:3000)

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sampleSrc = readFileSync(
  path.join(__dirname, "..", "lib", "sample-profile.ts"),
  "utf-8",
);
const match = sampleSrc.match(/SAMPLE_PROFILE_TEXT = `([\s\S]*?)`;/);
if (!match) {
  throw new Error("Não foi possível extrair SAMPLE_PROFILE_TEXT de lib/sample-profile.ts");
}
const profileText = match[1];

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const RUNS = 5;

const SUBSCORE_KEYS = ["headline", "impactClarity", "keywords", "recruiterReadiness", "english"];

const results = [];

for (let i = 1; i <= RUNS; i++) {
  const form = new FormData();
  form.append("profileText", profileText);

  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Run ${i} falhou (${res.status}): ${body}`);
  }

  const { analysis, error } = await res.json();
  if (error || !analysis) {
    throw new Error(`Run ${i} retornou erro: ${error ?? "sem analysis"}`);
  }

  results.push(analysis);
  console.log(`Run ${i}/${RUNS}: score=${analysis.score}`);
}

console.log("\n=== Scores por execução ===\n");
const header = ["Métrica", ...results.map((_, i) => `Run ${i + 1}`)];
console.log(header.join("\t"));
console.log(["score", ...results.map((r) => r.score)].join("\t"));
for (const key of SUBSCORE_KEYS) {
  console.log([key, ...results.map((r) => r.subscores[key])].join("\t"));
}

function stats(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return {
    min,
    max,
    range: max - min,
    mean: Math.round(mean * 100) / 100,
    stddev: Math.round(Math.sqrt(variance) * 100) / 100,
  };
}

console.log("\n=== Variância ===\n");
console.log(["Métrica", "min", "max", "range", "mean", "stddev"].join("\t"));
console.log(["score", ...Object.values(stats(results.map((r) => r.score)))].join("\t"));
for (const key of SUBSCORE_KEYS) {
  console.log([key, ...Object.values(stats(results.map((r) => r.subscores[key])))].join("\t"));
}
