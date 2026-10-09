import type { ReactNode } from "react";
import Link from "next/link";
import { Fraunces, Space_Grotesk, Space_Mono } from "next/font/google";
import { Wordmark } from "@/components/wordmark";

// Mesmas fontes da landing v2, escopadas a esta página (não tocar no layout raiz).
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

interface LegalShellProps {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

/**
 * Moldura das páginas legais (/privacidade e /termos), no design system v2 da
 * landing: papel + tinta, Fraunces no título, corpo em Space Grotesk. Sem
 * seções de venda — só header enxuto, conteúdo e rodapé.
 */
export function LegalShell({ title, updatedAt, children }: LegalShellProps) {
  return (
    <main
      className={`gj-landing min-h-screen bg-papel font-grotesk text-tinta antialiased selection:bg-amarelo selection:text-tinta ${fraunces.variable} ${grotesk.variable} ${spaceMono.variable}`}
    >
      <header className="border-b-2 border-tinta">
        <div className="mx-auto flex w-full max-w-[760px] items-center justify-between gap-5 px-6 py-5">
          <Link href="/" aria-label="Voltar para a página inicial">
            <Wordmark />
          </Link>
          <Link
            href="/"
            className="font-spacemono text-[13px] text-tinta/70 transition-opacity hover:opacity-100"
          >
            ← Voltar
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-[760px] px-6 py-12 sm:py-16">
        <h1 className="font-display text-[clamp(30px,5vw,44px)] font-extrabold leading-[1.05] tracking-[-0.02em]">
          {title}
        </h1>
        <p className="mt-3 font-spacemono text-[13px] text-tinta/60">
          Última atualização: {updatedAt}
        </p>
        {/* Corpo: h2/p/ul estilizados aqui pra não depender de plugin de tipografia. */}
        <div className="mt-10 flex flex-col gap-8 text-[15.5px] leading-[1.65] text-tinta/85 [&_a]:font-medium [&_a]:text-laranja [&_a]:underline [&_h2]:text-[19px] [&_h2]:font-bold [&_h2]:text-tinta [&_li]:mt-1.5 [&_p+p]:mt-3 [&_section]:flex [&_section]:flex-col [&_section]:gap-2.5 [&_strong]:font-semibold [&_strong]:text-tinta [&_ul]:list-disc [&_ul]:pl-5"
        >
          {children}
        </div>
      </article>

      <footer className="border-t-2 border-tinta">
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-2 px-6 py-8 font-spacemono text-[13px] text-tinta/70 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} GlobeJobbers</p>
          <p className="flex gap-4">
            <Link href="/privacidade" className="transition-opacity hover:opacity-100">
              Privacidade
            </Link>
            <Link href="/termos" className="transition-opacity hover:opacity-100">
              Termos
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
