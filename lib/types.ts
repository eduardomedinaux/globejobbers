// Tipos compartilhados entre o front (page.tsx, componentes) e as Route
// Handlers (app/api/**). Mantém o contrato da API em um único lugar.

export interface Subscores {
  headline: number;
  impactClarity: number;
  keywords: number;
  recruiterReadiness: number;
  english: number;
}

export interface AnalysisResult {
  /** Score Internacional, 0-100. */
  score: number;
  subscores: Subscores;
  headline: {
    /** Headline atual, extraída do perfil colado/PDF. */
    original: string;
    /** Headline reescrita, otimizada para recrutadores internacionais. */
    rewritten: string;
  };
  /** Keywords específicas identificadas/adicionadas (para UX de especificidade). */
  keywordHighlights: string[];
}

/** Metadados para renderizar os subscores na UI, na ordem desejada. */
export const SUBSCORE_META: { key: keyof Subscores; label: string }[] = [
  { key: "headline", label: "Headline" },
  { key: "impactClarity", label: "Clareza de impacto" },
  { key: "keywords", label: "Keywords" },
  { key: "recruiterReadiness", label: "Prontidão para recrutador internacional" },
  { key: "english", label: "Inglês" },
];

export interface LeadPayload {
  email: string;
  rawProfile: string;
  score: number;
}
