import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { TOOL_TYPE_LABELS, type ToolType } from "@/lib/types";

/**
 * Última análise do usuário pra uma ferramenta — alimenta o aviso "você já
 * analisou, veja o resultado sem gastar outro uso". Nasceu do aulão da
 * Turma Alpha: dois alunos passaram ~1h refazendo análises sem saber que o
 * Histórico existia.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const tool = request.nextUrl.searchParams.get("tool") ?? "";
  if (!Object.prototype.hasOwnProperty.call(TOOL_TYPE_LABELS, tool)) {
    return NextResponse.json({ error: "Ferramenta inválida." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("analyses")
    .select("id, score, created_at")
    .eq("user_id", user.id)
    .eq("tool_type", tool as ToolType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("HISTORY_LATEST_FAILED", { userId: user.id, tool, error });
    return NextResponse.json({ analysis: null });
  }

  return NextResponse.json({
    analysis: data ? { id: data.id, score: data.score, createdAt: data.created_at } : null,
  });
}
