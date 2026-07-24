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

/** Converte a linha do banco (snake_case) pro shape do front (lib/types.ts). */
export function rowToMarketProfile(row: Record<string, unknown>): MarketProfile {
  return {
    id: row.id as string,
    currentRole: (row.current_role as string) ?? "",
    targetRole: row.target_role as string,
    targetMarket: row.target_market as TargetMarket,
    seniority: row.seniority as string,
    language: (row.language as HeadlineLanguage) ?? "en",
    keywords: row.keywords as MarketProfileKeywords,
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
