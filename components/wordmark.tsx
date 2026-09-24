import { Source_Serif_4 } from "next/font/google";

// Serifa no espírito do Claude Console (Copernicus): Source Serif 4 é a
// aproximação aberta mais fiel — editorial, quente, premium.
const serif = Source_Serif_4({ subsets: ["latin"], weight: "600", display: "swap" });

/** Exposta pra outros usos da marca (ex.: nome do usuário na sidebar). */
export const wordmarkSerif = serif;

/**
 * Wordmark tipográfica (19/set): "GlobeJobbers" em serifa, sem o logo do
 * globo (aposentado junto com o SVG e a Kaushan Script). Um componente,
 * todos os usos (app header, landing, login, previews) herdam.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-start gap-1 ${className}`}>
      <span
        className={`${serif.className} text-[22px] font-semibold leading-none tracking-[-0.01em] text-[#161618]`}
      >
        GlobeJobbers
      </span>
      {/* Tag de fase (24/set): some quando o produto sair do beta. */}
      <span className="mt-[1px] rounded-[4px] bg-[#EAF1EF] px-[4px] py-[1px] text-[8.5px] font-bold uppercase tracking-[0.08em] text-[#0F4D4A]">
        Beta
      </span>
    </span>
  );
}
