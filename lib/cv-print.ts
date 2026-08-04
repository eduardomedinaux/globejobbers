// Transforma o texto puro do CV adaptado em HTML tipografado pra impressão
// A4 (o "Baixar PDF" do CV Tailor). Parser heurístico leve — o CV vem da
// nossa própria geração, com estrutura previsível: header (nome/título/
// contato), seções em CAIXA ALTA, empresas seguidas de cargo e linha de
// datas, bullets com "•". Tudo escapado: nada do texto é interpretado.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const DIVIDER = /^[-–—_=]{3,}$/;
const BULLET = /^[•·*-]\s+/;
// "SUMMARY", "SKILLS & TOOLS", "EARLIER EXPERIENCE"…
const SECTION = /^[A-Z0-9][A-Z0-9 &+\/,·'-]{2,44}$/;
// "November 2024 – Present · New York" / "2006–2010" / "Mar 2019 - Present"
const DATE_LINE = /\d{4}/;
const DATE_HINT = /(–|—|\bto\b|\bpresent\b|\batual\b|\d{4}\s*[-–—]\s*\d{4})/i;

type Block =
  | { type: "h2" | "p" | "li" | "org" | "role" | "meta"; text: string }
  | { type: "gap" };

export function buildCvPrintHtml(cvText: string): string {
  const lines = cvText.replace(/\r/g, "").split("\n");

  // Header: primeiro bloco até a linha em branco (nome / título / contato).
  let i = 0;
  while (i < lines.length && lines[i].trim().length === 0) i++;
  const header: string[] = [];
  while (i < lines.length && lines[i].trim().length > 0 && !DIVIDER.test(lines[i].trim())) {
    header.push(lines[i].trim());
    i++;
  }

  // Corpo → blocos tipados.
  const blocks: Block[] = [];
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0 || DIVIDER.test(line)) {
      if (blocks.length > 0 && blocks[blocks.length - 1].type !== "gap") {
        blocks.push({ type: "gap" });
      }
      continue;
    }
    if (BULLET.test(line)) {
      blocks.push({ type: "li", text: line.replace(BULLET, "") });
    } else if (SECTION.test(line)) {
      blocks.push({ type: "h2", text: line });
    } else {
      blocks.push({ type: "p", text: line });
    }
  }

  // Segunda passada: linha de datas → "meta"; a(s) linha(s) imediatamente
  // acima viram cargo (role) e empresa (org). Cobre tanto o padrão
  // Empresa/Cargo/Datas quanto Empresa/Datas.
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    if (block.type !== "p" || !DATE_LINE.test(block.text) || !DATE_HINT.test(block.text)) continue;
    block.type = "meta";
    const prev = blocks[b - 1];
    if (prev && prev.type === "p") {
      prev.type = "role";
      const prevPrev = blocks[b - 2];
      if (prevPrev && prevPrev.type === "p") prevPrev.type = "org";
    }
  }

  // Render.
  const [name, subtitle, ...contact] = header;
  let bodyHtml = "";
  if (name) bodyHtml += `<h1>${escapeHtml(name)}</h1>`;
  if (subtitle) bodyHtml += `<p class="subtitle">${escapeHtml(subtitle)}</p>`;
  for (const c of contact) bodyHtml += `<p class="contact">${escapeHtml(c)}</p>`;

  let inList = false;
  for (const block of blocks) {
    if (block.type === "li") {
      if (!inList) {
        bodyHtml += "<ul>";
        inList = true;
      }
      bodyHtml += `<li>${escapeHtml(block.text)}</li>`;
      continue;
    }
    if (inList) {
      bodyHtml += "</ul>";
      inList = false;
    }
    if (block.type === "gap") continue;
    if (block.type === "h2") bodyHtml += `<h2>${escapeHtml(block.text)}</h2>`;
    else bodyHtml += `<p class="${block.type}">${escapeHtml(block.text)}</p>`;
  }
  if (inList) bodyHtml += "</ul>";

  return `<!doctype html><html><head><meta charset="utf-8"><title>CV</title><style>
@page { size: A4; margin: 13mm 15mm; }
* { box-sizing: border-box; }
body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1b1b1e;
  font-size: 9.8pt; line-height: 1.42; margin: 0; padding: 28px 32px;
  -webkit-print-color-adjust: exact; }
/* Na impressão o respiro vem das margens da @page, não do padding. */
@media print { body { padding: 0; } }
h1 { font-size: 19pt; letter-spacing: -0.02em; margin: 0 0 1pt; }
.subtitle { font-size: 11pt; font-weight: 600; color: #0F4D4A; margin: 0 0 3pt; }
.contact { font-size: 8.5pt; color: #55555a; margin: 0 0 1pt; }
h2 { font-size: 9pt; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
  color: #0F4D4A; border-bottom: 1pt solid #d8d8d2; padding-bottom: 2pt; margin: 12pt 0 5pt; }
p { margin: 0 0 3pt; }
.org { font-weight: 700; margin: 7pt 0 0; }
.role { font-weight: 600; margin: 0; }
.meta { font-size: 8.5pt; color: #6a6a6e; margin: 0 0 2pt; }
ul { margin: 2pt 0 4pt; padding-left: 12pt; }
li { margin: 0 0 2pt; }
</style></head><body>${bodyHtml}</body></html>`;
}
