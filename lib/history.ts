import { getSupabaseAdmin } from "@/lib/supabase";
import type { ToolType } from "@/lib/types";

export interface AnalysisRecord {
  id: string;
  tool_type: ToolType;
  input_summary: string | null;
  output_data: unknown;
  score: number | null;
  created_at: string;
}

const HISTORY_COLUMNS = "id, tool_type, input_summary, output_data, score, created_at";

/** Últimas análises do usuário, mais recentes primeiro. Usado no dashboard e em /history. */
export async function getRecentAnalyses(userId: string, limit = 5): Promise<AnalysisRecord[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("analyses")
    .select(HISTORY_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("HISTORY_FETCH_FAILED", { userId, error });
    return [];
  }
  return (data ?? []) as unknown as AnalysisRecord[];
}

/** Uma análise específica — retorna null se não existir ou não pertencer ao usuário (mesmo efeito). */
export async function getAnalysisById(userId: string, id: string): Promise<AnalysisRecord | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("analyses")
    .select(HISTORY_COLUMNS)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as AnalysisRecord;
}
