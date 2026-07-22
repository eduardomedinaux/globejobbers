import { ViewTracker } from "@/components/analytics/view-tracker";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { ToolsSection } from "@/components/landing/tools-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { MentoriaSection } from "@/components/landing/mentoria-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { SiteFooter } from "@/components/landing/site-footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <ViewTracker event="landing_viewed" />
      <SiteHeader />
      <Hero />
      <ProblemSection />
      <ToolsSection />
      <HowItWorksSection />
      <MentoriaSection />
      <PricingSection />
      <SiteFooter />
    </main>
  );
}
