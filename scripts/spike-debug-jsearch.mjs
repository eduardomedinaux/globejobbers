/**
 * Diagnóstico do JSearch: faz UMA requisição e grava status + corpo em
 * spike-output/jsearch_debug.json pra descobrir por que veio vazio.
 * Rodar:  JSEARCH_KEY=SUA_CHAVE node scripts/spike-debug-jsearch.mjs
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";

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
if (!KEY) {
  console.error("Faltou a chave: adicione JSEARCH_KEY=sua_chave no .env.local (ou passe via env).");
  process.exit(1);
}
console.log(`Usando chave: ${KEY.slice(0, 4)}…${KEY.slice(-4)} (${KEY.length} caracteres)`);

const url =
  "https://jsearch.p.rapidapi.com/search-v2?" +
  new URLSearchParams({ query: "product designer", page: "1", num_pages: "1", country: "us", date_posted: "month" });

const res = await fetch(url, {
  headers: { "X-RapidAPI-Key": KEY, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" },
});
const bodyText = await res.text();

await mkdir("spike-output", { recursive: true });
await writeFile(
  "spike-output/jsearch_debug.json",
  JSON.stringify(
    {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body: bodyText.slice(0, 8000),
    },
    null,
    2,
  ),
);
console.log(`HTTP ${res.status} — resposta gravada em spike-output/jsearch_debug.json`);
console.log(bodyText.slice(0, 300));
