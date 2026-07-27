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
  | "email_submitted"
  | "analysis_started"
  // Fase 2 (SaaS): conta, dashboard, ferramentas logadas
  | "landing_viewed"
  | "signup_started"
  | "signup_completed"
  | "dashboard_viewed"
  | "tool_card_clicked"
  | "limit_reached"
  | "upgrade_waitlist_clicked"
  // Headline Optimizer logado
  | "headline_tool_viewed"
  | "headline_analysis_started"
  | "headline_score_viewed"
  // CV Tailor
  | "cv_tailor_viewed"
  | "cv_tailor_started"
  | "cv_tailor_completed"
  | "cv_tailor_failed"
  // LinkedIn Review
  | "linkedin_review_viewed"
  | "linkedin_review_started"
  | "linkedin_review_completed"
  | "linkedin_review_failed"
  | "linkedin_review_tab_changed"
  // Perfil de Mercado (ver PROPOSTA-PERFIL-DE-MERCADO.md)
  | "market_profile_started"
  | "market_profile_created"
  | "market_profile_failed"
  | "market_profile_edited"
  | "market_headline_generated"
  | "job_url_imported"
  | "job_url_import_failed"
  // Plano Pro (concessões beta/mentoria — ver lib/plan.ts e pro_grants)
  | "pro_grant_claimed";

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  posthog.capture(event, props);
}