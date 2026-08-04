import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  HeadlineLanguage,
  MarketProfile,
  MarketProfileKeywords,
  TargetMarket,
} from "@/lib/types";

// Helpers de servidor do Perfil de Mercado — compartilhados entre
// /api/market-profile, /api/tools/headline e /api/tools/linkedin-review
// (e as próximas ferramentas que consumirem o perfil).

/**
 * Título de exibição de uma vaga = primeira linha não-vazia do texto
 * (normalmente o cargo). O texto completo NUNCA sai do servidor por aqui.
 */
function jobTitleFromText(text: unknown): string {
  if (typeof text !== "string") return "Vaga";
  const firstLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return (firstLine ?? "Vaga").slice(0, 80);
}

/** Converte a linha do banco (snake_case) pro shape do front (lib/types.ts). */
export function rowToMarketProfile(row: Record<string, unknown>): MarketProfile {
  const rawJobs = Array.isArray(row.source_jobs) ? row.source_jobs : [];
  const sourceJobs = rawJobs
    .filter((j): j is Record<string, unknown> => typeof j === "object" && j !== null)
    .map((j, i) => ({
      index: typeof j.index === "number" ? j.index : i + 1,
      title: jobTitleFromText(j.text),
      chars: typeof j.chars === "number" ? j.chars : 0,
    }));

  return {
    id: row.id as string,
    currentRole: (row.current_role as string) ?? "",
    targetRole: row.target_role as string,
    targetMarket: row.target_market as TargetMarket,
    seniority: row.seniority as string,
    language: (row.language as HeadlineLanguage) ?? "en",
    keywords: row.keywords as MarketProfileKeywords,
    sourceJobs,
    createdAt: row.created_at as string,
  };
}

/**
 * Perfil ativo do usuário = o mais recente. Devolve null se não houver (ou
 * em erro de leitura — o consumidor decide se isso é bloqueante; para o
 * LinkedIn Review não é: a análise segue no modo genérico).
 */
export async function getActiveMarketProfile(userId: string): Promise<MarketProfile | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("market_profiles")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("MARKET_PROFILE_FETCH_FAILED", { userId, error });
    return null;
  }
  return data ? rowToMarketProfile(data) : null;
}
