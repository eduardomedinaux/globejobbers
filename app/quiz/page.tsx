import type { Metadata } from "next";
import { Fraunces, Space_Grotesk, Space_Mono } from "next/font/google";
import { QuizFlow } from "@/components/quiz/quiz-flow";

// Mesmas fontes da landing v2, escopadas a este wrapper (ver app/page.tsx).
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "WONK", "opsz"] });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

export const metadata: Metadata = {
  title: "Você está pronto pra vaga em dólar? · GlobeJobbers",
  description: "6 perguntas rápidas pra descobrir como o mercado de fora chama o seu cargo e o que falta no seu perfil.",
};

export default function QuizPage() {
  return (
    <main
      className={`gj-landing min-h-[100dvh] bg-papel font-grotesk text-tinta antialiased ${fraunces.variable} ${grotesk.variable} ${spaceMono.variable}`}
    >
      <QuizFlow />
    </main>
  );
}
