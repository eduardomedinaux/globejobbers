import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { displayTitle, formatSalary, formatScope, getDailyJobs, type DailyJobsRow } from "@/lib/jobs-daily";

// Story 1080x1920 com as 5 vagas do dia. Pública (só mostra cargo, empresa,
// faixa salarial e escopo — nada de descrição). ?date=YYYY-MM-DD regera
// um dia anterior; sem date, o último dia gravado.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEAL = "#0F4D4A";
const INK = "#161618";
const MUTED = "#6B6B6B";
const PAPER = "#F4F1EA";
const CARD = "#FFFFFF";
const LINE = "#E6E1D6";

function formatDateLabel(runDate: string): string {
  const [y, m, d] = runDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .format(dt)
    .replace(/^\w/, (c) => c.toUpperCase());
}

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(new URL("../../../fonts/GeistVF.woff", import.meta.url));
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function Card({ job, index }: { job: DailyJobsRow; index: number }) {
  const salary = formatSalary(job);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 28,
        background: CARD,
        border: `2px solid ${LINE}`,
        borderRadius: 28,
        padding: "34px 40px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 64,
          height: 64,
          borderRadius: 32,
          background: TEAL,
          color: "#FFFFFF",
          fontSize: 32,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ fontSize: 42, fontWeight: 700, color: INK, lineHeight: 1.15 }}>{displayTitle(job.title)}</div>
        <div style={{ fontSize: 30, color: MUTED }}>{job.company}</div>
        <div style={{ display: "flex", flexDirection: "row", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
          {salary ? (
            <div
              style={{
                display: "flex",
                background: "#EAF1EF",
                color: TEAL,
                fontSize: 26,
                fontWeight: 700,
                padding: "8px 18px",
                borderRadius: 999,
              }}
            >
              {salary}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              background: PAPER,
              color: INK,
              fontSize: 26,
              padding: "8px 18px",
              borderRadius: 999,
            }}
          >
            {formatScope(job.remoteScope)}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response("date inválida (YYYY-MM-DD)", { status: 400 });
  }

  let jobs: DailyJobsRow[] = [];
  try {
    jobs = await getDailyJobs(date);
  } catch (error) {
    console.error("JOBS_DAILY_STORY_FAILED", { date, error: String(error) });
    return new Response("Falha ao ler as vagas do dia.", { status: 500 });
  }
  if (jobs.length === 0) {
    return new Response("Sem vagas gravadas pra essa data.", { status: 404 });
  }

  const runDate = jobs[0].runDate;
  const font = await loadFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1920,
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          padding: "140px 64px 120px",
          fontFamily: font ? "Geist" : "sans-serif",
          color: INK,
        }}
      >
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>GlobeJobbers</div>
          <div style={{ fontSize: 24, color: MUTED, letterSpacing: 3 }}>CARREIRA EM DÓLAR</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 72, gap: 18 }}>
          <div style={{ fontSize: 26, color: TEAL, fontWeight: 700, letterSpacing: 4 }}>VAGAS REMOTAS · HOJE</div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5 }}>
            {jobs.length} vagas em dólar pra você aplicar hoje
          </div>
          <div style={{ fontSize: 28, color: MUTED }}>{formatDateLabel(runDate)}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 56, flex: 1 }}>
          {jobs.map((job, i) => (
            <Card key={job.jobId} job={job} index={i} />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 40,
            paddingTop: 36,
            borderTop: `2px solid ${LINE}`,
          }}
        >
          <div style={{ fontSize: 28, color: INK, fontWeight: 700 }}>Links na bio</div>
          <div style={{ fontSize: 28, color: TEAL, fontWeight: 700 }}>Comenta QUERO no último post</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: font ? [{ name: "Geist", data: font, style: "normal", weight: 400 }] : undefined,
    },
  );
}
