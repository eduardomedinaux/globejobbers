import { Fraunces, Space_Grotesk, Space_Mono } from "next/font/google";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { StatsBar } from "@/components/landing/stats-bar";
import { ProblemSection } from "@/components/landing/problem-section";
import { ToolsSection } from "@/components/landing/tools-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { MentoriaSection } from "@/components/landing/mentoria-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { SiteFooter } from "@/components/landing/site-footer";

// Fontes do design system v2 — ESCOPADAS à landing.
// As variáveis são aplicadas só no wrapper .gj-landing abaixo; o app logado
// (app/(app)/**) continua em Geist, definido no layout raiz. Não tocar no
// app/layout.tsx.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

export default function LandingPage() {
  return (
    <main
      className={`gj-landing min-h-screen bg-papel font-grotesk text-tinta antialiased selection:bg-amarelo selection:text-tinta ${fraunces.variable} ${grotesk.variable} ${spaceMono.variable}`}
    >
      <ViewTracker event="landing_viewed" />
      <SiteHeader />
      <Hero />
      <StatsBar />
      <ProblemSection />
      <ToolsSection />
      <HowItWorksSection />
      <MentoriaSection />
      <PricingSection />
      <SiteFooter />
    </main>
  );
}
