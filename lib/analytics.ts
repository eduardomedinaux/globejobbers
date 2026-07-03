"use client";

import posthog from "posthog-js";

// Stub de instrumentação para a métrica que importa nesta fase (ver
// CLAUDE.md "Métrica que importa nesta fase"): aha rate = % de visitantes
// que veem o score E revelam a headline reescrita.
//
// Atualizado: console.log trocado por posthog-js, mantendo os mesmos nomes
// de evento já usados no restante do código (score_viewed, headline_generated).

export type AnalyticsEvent =
  | "score_viewed"
  | "headline_generated"
  | "analysis_clicked"
  | "analysis_failed"
  | "email_submitted";

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  posthog.capture(event, props);
}