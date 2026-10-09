import { NextRequest, NextResponse } from "next/server";
import { fetchDailyJobs, saveDailyJobs, todayInSaoPaulo } from "@/lib/jobs-daily";

// "Vagas do dia" — chamada 1x/dia pelo cron da Vercel (vercel.json). A
// Vercel manda `Authorization: Bearer ${CRON_SECRET}` sozinha quando a env
// existe; qualquer outra chamada precisa do mesmo header.
//
// Teste manual:
//   curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/jobs-daily?dry=1
// (dry=1 busca e ranqueia sem gravar no banco.)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get("dry") === "1";
  const runDate = todayInSaoPaulo();

  try {
    const { jobs, summary } = await fetchDailyJobs();
    if (!dry) await saveDailyJobs(runDate, jobs);
    return NextResponse.json({
      runDate,
      saved: !dry,
      count: jobs.length,
      jobs,
      summary,
    });
  } catch (error) {
    console.error("JOBS_DAILY_FAILED", { runDate, error: String(error) });
    return NextResponse.json({ error: "Falha ao montar as vagas do dia." }, { status: 500 });
  }
}
