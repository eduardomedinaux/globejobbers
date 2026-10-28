// Meta Pixel (anúncios do Instagram/Facebook). O ID vem de
// NEXT_PUBLIC_META_PIXEL_ID — não é segredo (aparece no HTML de qualquer
// site com pixel), por isso o prefixo NEXT_PUBLIC_. Sem a variável, nada
// carrega e metaTrack() vira no-op: o site funciona igual sem pixel.

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

// Eventos padrão da Meta que usamos. Mapeamento de onde cada um dispara:
// - PageView: toda navegação (components/analytics/meta-pixel.tsx)
// - Lead: e-mail deixado nos teasers públicos (lib/analytics.ts)
// - CompleteRegistration: primeira conta criada (?signup=1 do callback)
// - Subscribe: volta do Stripe Checkout com sucesso (?subscribed=1)
// - InitiateCheckout: clique no botão de compra do workshop (/workshop)
export type MetaStandardEvent = "PageView" | "Lead" | "CompleteRegistration" | "Subscribe" | "InitiateCheckout";

type Fbq = (command: "track" | "init", event: string, params?: Record<string, unknown>) => void;

export function metaTrack(event: MetaStandardEvent, params?: Record<string, unknown>) {
  if (!META_PIXEL_ID || typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (typeof fbq === "function") fbq("track", event, params);
}
