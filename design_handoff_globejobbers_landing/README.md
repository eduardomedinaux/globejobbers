# Handoff: GlobeJobbers — Landing Page (MVP)

## Overview
GlobeJobbers is a SaaS that helps Brazilian professionals land remote international jobs and earn in USD. This is the **MVP landing / entry page**: a visitor uploads the **PDF of their LinkedIn profile** and receives a free **International Score (0–100)** with 5 subscores, plus an AI-rewritten headline tailored to international recruiters.

This single page is the entire MVP front door. The hero collects input; the CTA triggers analysis; an example results band below shows the user what they'll get.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype showing the intended look and behavior. They are **not production code to copy directly**.

- `GlobeJobbers Landing.dc.html` is authored as a "Design Component" (a custom streaming HTML format). It depends on `support.js` (an internal runtime) **only to render the prototype** — do **not** ship `support.js` or the `.dc.html` wrapper in production.
- The task is to **recreate this design in the target codebase's environment** (React, Vue, Next.js, SwiftUI, etc.) using its established patterns, component library, and conventions. If no codebase exists yet, **Next.js + React + Tailwind** is a natural fit for this kind of marketing/app entry page.
- Treat the markup inside `<x-dc>…</x-dc>` and the `renderVals()` logic as the source of truth for structure, copy, styling, and behavior. Ignore the `<sc-if>` / `<sc-for>` / `{{ }}` template syntax — those are prototype-only constructs; translate them to ordinary conditionals/loops/bindings in your framework.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, shadows, and copy are intentional and should be reproduced precisely. The only placeholder is the scoring/headline result data (hardcoded example values) — that becomes real backend output. The PDF upload and "Calcular meu Score" button are wired to no-op stubs in the prototype; you implement the real behavior.

> **Input is PDF-only.** An earlier version had a paste-text textarea as an alternative; that has been **removed**. The single input is a LinkedIn profile PDF upload, accompanied by a 3-step explainer on how to obtain that PDF.

## Language
All UI copy is **Brazilian Portuguese** and must be used **exactly as written** (see copy strings below). Do not translate or paraphrase.

---

## Screens / Views

### Single view: Landing page
One vertically-stacked, centered page on an off-white background (`#FAFAF8`). Max content widths constrain each band; everything is horizontally centered. A soft radial glow in the brand teal sits behind the top of the page (decorative only).

Vertical structure, top to bottom:
1. **Logo** (centered)
2. **Hero** (H1 + subtitle)
3. **Input card** (PDF upload dropzone + "how to download your PDF" steps + trust microcopy + CTA + reassurance line)
4. **Example results band** (optional, toggleable) — Score card + Headline rewrite card, side by side

#### 1. Logo
- Centered, padding `34px 40px 6px`.
- Wordmark "GlobeJobbers" in **Kaushan Script** (Google Fonts), `font-size: 34px`, color `#0F4D4A` (brand teal), `line-height: 1`, `padding-bottom: 4px`.
- (A sans-serif logo variant was explored and rejected. Final = script only.)

#### 2. Hero
- Container `max-width: 720px`, centered, `text-align: center`, padding `48px 40px 24px`.
- **H1**: `font-size: 52px`, `font-weight: 600`, `line-height: 1.08`, `letter-spacing: -0.03em`, color `#161618`, `text-wrap: balance`, margin `0 0 22px`.
  - Text: `Seu LinkedIn está pronto para ganhar em dólar?`
- **Subtitle**: `font-size: 19px`, `font-weight: 400`, `line-height: 1.55`, color `#5C5C60`, `max-width: 600px` centered, `text-wrap: pretty`.
  - Text: `Receba seu Score Internacional grátis — uma análise completa do seu perfil — e veja sua headline reescrita para recrutadores de fora.`

#### 3. Input card
- Outer container `max-width: 680px`, centered, padding `20px 40px 0`.
- **Card**: background `#FFFFFF`, border `1px solid #EAEAE4`, `border-radius: 16px`, padding `30px`, shadow `0 1px 2px rgba(20,20,20,0.03), 0 12px 32px rgba(20,20,20,0.04)`.

Inside the card, top to bottom:

- **Label** (`margin-bottom:14px`): `<label>` `font-size:14px; font-weight:500; color:#2A2A2D` — text: `Suba o PDF do seu perfil do LinkedIn`

- **PDF dropzone** (the single input): a clickable `<label>` styled as a tall dashed zone — `display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; height:120px; border:1px dashed #D6D6CE; border-radius:12px; background:#FCFCFB; text-align:center; padding:0 20px`. Hover: `border-color:#0F4D4A; background:#F7FAF9`.
  - Primary line: teal dot (`7px`) + `Escolher arquivo PDF` (`font-size:14.5px; font-weight:600; color:#0F4D4A`).
  - Secondary line: `ou arraste o arquivo aqui · apenas .pdf` (`font-size:12.5px; color:#9A9A95`).
  - Hidden `<input type="file" accept="application/pdf,.pdf">`.
  - On file select, show a confirmation chip (`margin-top:11px; padding:10px 13px; background:#F6F8F7; border:1px solid #E2EAE8; border-radius:10px`): teal dot + `{filename}` (`font-size:13px; color:#0F4D4A; font-weight:500`).

- **"How to download your PDF" explainer box** (`margin-top:18px; padding:16px 16px 17px; background:#FBFBF9; border:1px solid #ECECE6; border-radius:12px`):
  - Eyebrow: `Como baixar seu PDF do LinkedIn` (`font-size:12px; font-weight:600; letter-spacing:0.04em; uppercase; color:#8A8A85; margin-bottom:13px`).
  - 3 numbered steps (`gap:11px`), each a `21px` teal-tint circle badge (`background:#EAF1EF; color:#0F4D4A; font-size:12px; font-weight:600`, tabular) + text (`font-size:13.5px; line-height:1.5; color:#3F3F43`, key terms bolded `#26262A`):
    1. `Abra o seu perfil no LinkedIn (toque na sua foto e em **Ver perfil**).`
    2. `Clique no botão **Mais**, logo abaixo do seu nome.`
    3. `Selecione **Salvar como PDF** e suba o arquivo aqui.`
  - These steps describe LinkedIn's real **More → Save to PDF** flow. If LinkedIn's UI labels change, keep them accurate.

- **Trust microcopy box** (`margin-top:14px`): `display:flex; align-items:flex-start; gap:9px; padding:11px 13px; background:#F6F8F7; border:1px solid #E7EEEC; border-radius:10px`. A `7px` teal dot + text (`font-size:13px; line-height:1.5; color:#566461`):
  - `Não pedimos seu login nem o link — só o PDF do perfil, para manter sua conta segura.`

- **CTA button** (`margin-top:20px`): full width, `height:52px`, no border, `border-radius:12px`, background `#0F4D4A`, text color `#FBFEFD`, `font-size:16px; font-weight:600; letter-spacing:-0.01em`, shadow `0 1px 2px rgba(15,77,74,0.25)`, `transition: background .15s ease`. Hover background `#0B3F3C`.
  - Text: `Calcular meu Score`

- **Reassurance line** below the card (`margin-top:14px`, centered): `font-size:12.5px; color:#A6A6A1` — text: `Análise instantânea · sem cadastro · 100% grátis`

#### 4. Example results band (optional)
Toggleable via a `showExample` boolean (default `true`). In production this can either remain as a static "what you'll get" preview, **or** be replaced by the live results view rendered after analysis. The example values below are hardcoded placeholders.

- Container `max-width: 880px`, centered, padding `64px 40px 90px`.
- **Eyebrow** (centered, `margin-bottom:18px`): `font-size:12px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:#A0A09B` — text: `Exemplo do que você recebe`
- **Two-column grid**: `grid-template-columns: 1fr 1fr; gap:18px; align-items:stretch`. Each card: background `#FFFFFF`, border `1px solid #EAEAE4`, `border-radius:16px`, padding `26px 28px`, shadow `0 1px 2px rgba(20,20,20,0.03)`.

**Card A — Score**
- Big number `82` in `font-size:64px; font-weight:600; letter-spacing:-0.04em; line-height:0.9; color:#0F4D4A`, tabular numerals, followed by `/100` (`font-size:20px; color:#B4B4AF; font-weight:500`).
- Caption `Score Internacional` (`font-size:13.5px; color:#6E6E72; margin-bottom:22px`).
- **5 subscores** (`display:flex; flex-direction:column; gap:15px`). Each: a row with the name (`font-size:13px; color:#3F3F43`) left and value (`font-size:13px; font-weight:600; color:#161618`, tabular) right, above a `6px`-tall progress bar (track `#EFEFE9`, fill `#0F4D4A`, `border-radius:99px`, width = value%).
  - The 5 dimensions (name → value):
    1. `Clareza da headline` → 74
    2. `Inglês profissional` → 88
    3. `Experiência remota` → 65
    4. `Palavras-chave p/ recrutadores` → 80
    5. `Prova de impacto` → 79

**Card B — Headline rewrite** (`display:flex; flex-direction:column`)
- Eyebrow `Headline reescrita` (`font-size:12px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#A0A09B; margin-bottom:20px`).
- **Antes** label (`font-size:11.5px; font-weight:600; letter-spacing:0.06em; uppercase; color:#B6B6B1`) over a muted box (`font-size:15px; line-height:1.45; color:#9A9A95; padding:12px 14px; background:#FAFAF8; border:1px solid #EEEEE8; border-radius:10px`):
  - `Desenvolvedor Java na Acme`
- **Depois** label (same style, color `#0F4D4A`) with a pill badge `+34 alcance` (`font-size:11px; font-weight:600; color:#0F4D4A; background:#EAF1EF; border-radius:99px; padding:2px 8px`), over an emphasized box (`font-size:16px; line-height:1.5; font-weight:500; color:#1B1B1E; padding:14px 16px; background:#F6F8F7; border:1px solid #E2EAE8; border-radius:10px`):
  - `Senior Backend Engineer · Java & Kotlin · Remote-first, USD-ready`
- Footnote (`margin-top:18px; font-size:12.5px; line-height:1.5; color:#8A8A85`):
  - `Reescrita no vocabulário que recrutadores internacionais buscam — cargo, stack e disponibilidade remota em primeiro plano.`

---

## Interactions & Behavior
- **PDF upload (only input)**: clicking the dashed dropzone opens the file picker (`accept=application/pdf,.pdf`). On selection, display the chosen filename in the confirmation chip. In production, upload/parse the PDF server-side to extract profile text. Recommended: also support **drag-and-drop** onto the zone (the copy already promises it) and reject non-PDF files with an inline error.
- **CTA "Calcular meu Score"**: prototype is a no-op. In production it should:
  1. Validate that a PDF has been selected.
  2. Submit to the scoring backend.
  3. Show a loading state (not designed yet — see Open Questions).
  4. Render the real results (Score + 5 subscores + rewritten headline) — reuse the Card A / Card B layouts from the example band.
- **Hover states**: PDF dropzone and CTA button have hover treatments specified above. Add a subtle focus ring to the textarea/inputs per your design system (the prototype removes the default outline — replace it with an accessible focus style, e.g. a `1px` teal border + soft ring).
- **Decorative radial glow**: `position:absolute; top:-220px; left:50%; translateX(-50%); width:900px; height:560px; background: radial-gradient(ellipse at center, rgba(15,77,74,0.06), rgba(15,77,74,0) 70%)`. Purely decorative, `pointer-events:none`.

## State Management
- `pdfFile: File | null` and `pdfName: string` — selected PDF (the sole input).
- `status: 'idle' | 'loading' | 'success' | 'error'` — analysis lifecycle (only `idle` exists in the prototype; add the rest).
- `result: { score: number, subscores: {name, value}[], headlineBefore: string, headlineAfter: string, delta: number } | null` — backend output that populates Card A / Card B.
- `showExample: boolean` (default `true`) — controls the example/preview band.

## Data Requirements / Backend
The scoring + headline rewrite is the core backend work the prototype only stubs:
- **Input**: profile text (from textarea or parsed PDF).
- **Output**: an overall 0–100 International Score, 5 subscores (the dimensions listed above are the intended set), and a rewritten headline with an "alcance" (reach) delta.
- This is well-suited to an LLM call. Define a stable JSON contract matching the `result` shape above so the UI can render it directly.

## Design Tokens

### Colors
| Token | Hex | Usage |
|---|---|---|
| Background | `#FAFAF8` | Page background |
| Card surface | `#FFFFFF` | Cards, panels |
| Input surface | `#FCFCFB` | PDF dropzone |
| Explainer surface | `#FBFBF9` | "How to download" box |
| Brand teal | `#0F4D4A` | Logo, CTA, score number, progress fill, accents |
| Brand teal (hover) | `#0B3F3C` | CTA hover |
| Teal tint surface | `#F6F8F7` | Trust box, "Depois" box |
| Teal tint border | `#E7EEEC` / `#E2EAE8` | Tinted box borders |
| Teal pill bg | `#EAF1EF` | "+34 alcance" badge |
| Text primary | `#161618` / `#18181A` / `#1B1B1E` | Headlines, strong text |
| Text body | `#5C5C60` | Subtitle |
| Text secondary | `#3F3F43` / `#566461` | Subscore names, trust text |
| Text muted | `#6E6E72` / `#8A8A85` / `#9A9A95` | Captions, hints |
| Text faint | `#A0A09B` / `#A6A6A1` / `#B4B4AF` / `#B6B6B1` | Eyebrows, "/100", "Antes" |
| Border default | `#EAEAE4` | Card borders |
| Border input | `#E4E4DE` | Textarea border |
| Border dashed | `#D6D6CE` | PDF dropzone |
| Divider | `#EDEDE7` / `#EEEEE8` | "ou" lines, "Antes" box |
| Track | `#EFEFE9` | Progress bar track |
| CTA text | `#FBFEFD` | Button label |

> Accent (teal) is used **sparingly** — only on the CTA, score, progress fills, and small deltas/accents. Keep the rest near-monochrome.

### Typography
- **UI / body font**: `Geist` (Google Fonts). Fallback: `-apple-system, BlinkMacSystemFont, sans-serif`. Weights used: 400, 500, 600.
- **Logo font**: `Kaushan Script` (Google Fonts), used only for the wordmark.
- **Tabular numerals** on all numeric displays (score, `/100`, subscore values, badge): `font-variant-numeric: tabular-nums; font-feature-settings:"tnum" 1`.
- Scale (px): H1 52 / subtitle 19 / score 64 / headline-after 16 / labels & inputs 14–14.5 / body-small 13–13.5 / captions & eyebrows 11–12.5.
- Notable letter-spacing: H1 `-0.03em`, score `-0.04em`, eyebrows `+0.06em` to `+0.12em` (uppercase).

### Spacing & Layout
- Max widths: hero `720px`, input card `680px`, example band `880px`. All centered.
- Card padding: `30px` (input), `26px 28px` (example cards).
- Consistent vertical rhythm within the card uses `10–20px` steps (see per-element `margin-top` values above).

### Border radius
- Cards: `16px` · Inputs/dropzone: `11px` · Tinted boxes: `10px` · CTA: `12px` · Pills/progress: `99px` (full).

### Shadows
- Input card: `0 1px 2px rgba(20,20,20,0.03), 0 12px 32px rgba(20,20,20,0.04)`
- Example cards: `0 1px 2px rgba(20,20,20,0.03)`
- CTA: `0 1px 2px rgba(15,77,74,0.25)`

Shadows are intentionally near-imperceptible — keep them subtle.

## Assets
- No raster images or custom icons. The only "icons" are small CSS circles (teal dots). Replace with your icon system if desired, but the minimal dot treatment is intentional.
- Fonts load from Google Fonts: `Geist` (300–700) and `Kaushan Script`. Self-host in production if your stack prefers.

## Design Intent / Guardrails
- References: Stripe, Linear, Notion, Perplexity, Arc. Serious-fintech meets premium-productivity-tool.
- Near-monochrome off-white/near-black base; one sober brand color (deep petroleum teal — deliberately **not** money-green). Accent used sparingly.
- Soft corners, whisper-thin low-contrast borders, generous whitespace, controlled density.
- **Avoid entirely**: "infoproduct" look — loud gradients, arrows, urgency badges, excessive emoji. Confident, adult, premium tone.

## Open Questions (not yet designed — confirm before building)
- **Loading state** for the analysis call (spinner, skeleton, progress?).
- **Error state** (bad/empty input, backend failure, PDF parse failure).
- **Results presentation**: does the example band morph into the real result in place, navigate to a new view, or scroll to a results section?
- **Responsive/mobile** layout (prototype is desktop-width; the 2-col example grid should stack on narrow screens — recommend single column below ~720px).

## Screenshots
Reference renders in `screenshots/` (slight text crowding in these captures is a font-fallback artifact — the live page uses Geist):
- `landing-full.png` — logo + hero
- `input-card.png` — PDF dropzone, "how to download" steps, trust copy, CTA
- `example-results.png` — score card + headline rewrite

## Files
- `GlobeJobbers Landing.dc.html` — the design prototype (source of truth for structure, copy, tokens). Read the markup inside `<x-dc>` and the `renderVals()` example data.
- `support.js` — prototype runtime only. **Do not ship.** Included so the `.dc.html` can be opened/rendered for reference.
- `screenshots/` — reference renders of the design.
