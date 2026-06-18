// Stub de instrumentação para a métrica que importa nesta fase (ver
// CLAUDE.md "Métrica que importa nesta fase"): aha rate = % de visitantes
// que veem o score E revelam a headline reescrita.
//
// FUTURE: trocar o console.log por posthog-js (client) / posthog-node
// (servidor), mantendo os mesmos nomes de evento.

export type AnalyticsEvent = "score_viewed" | "headline_generated";

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  console.log(`[analytics] ${event}`, props ?? {});
}
