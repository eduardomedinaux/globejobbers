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

// Rótulos alinhados ao handoff de design. "recruiterReadiness" não tem
// equivalente exato no design (que chama essa posição de "Experiência
// remota", critério que o backend não calcula) — mantemos o rótulo real do
// que é avaliado em vez de nomear algo que não medimos.
/** Metadados para renderizar os subscores na UI, na ordem desejada. */
export const SUBSCORE_META: { key: keyof Subscores; label: string }[] = [
  { key: "headline", label: "Clareza da headline" },
  { key: "english", label: "Inglês profissional" },
  { key: "recruiterReadiness", label: "Prontidão para recrutador internacional" },
  { key: "keywords", label: "Palavras-chave p/ recrutadores" },
  { key: "impactClarity", label: "Prova de impacto" },
];

export interface HeadlineAnalysisResult {
  headlineScore: number;
  headline: {
    original: string;
    rewritten: string;
  };
}

export interface LeadPayload {
  email: string;
  rawProfile: string;
  score: number;
  source?: "ato1" | "ato2";
}
