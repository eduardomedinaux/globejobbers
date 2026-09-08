import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { findOnboardingReport, toJobOptions } from "@/lib/onboarding";

/**
 * Passo 3 do onboarding: as vagas reais do relatório de Market Intelligence
 * que o usuário acabou de ver, pra ele marcar as que dão vontade — SEM
 * coleta nova (reaproveita o corpus, custo zero). Sem corpus disponível,
 * o client oferece o caminho de colar vagas (fluxo existente).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const report = await findOnboardingReport(user.id);
  if (!report) {
    return NextResponse.json({ reportId: null, jobs: [] });
  }

  return NextResponse.json({ reportId: report.id, jobs: toJobOptions(report) });
}
