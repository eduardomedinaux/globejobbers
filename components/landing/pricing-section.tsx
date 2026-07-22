import Link from "next/link";
import { Check } from "lucide-react";

const FREE_ITEMS = [
  "3 headlines/mês",
  "2 CV Tailors/mês",
  "1 LinkedIn Review/mês",
  "Histórico básico",
];

const PRO_ITEMS = [
  "Análises ilimitadas",
  "Exportações",
  "Acompanhamento de evolução",
  "Templates premium",
];

export function PricingSection() {
  return (
    <section className="mx-auto max-w-[880px] px-6 py-14 sm:px-10 sm:py-20">
      <h2 className="text-balance text-center text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#161618] sm:text-[36px]">
        Comece grátis
      </h2>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#EAEAE4] bg-white p-7 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
          <h3 className="text-[18px] font-semibold text-[#1B1B1E]">Free</h3>
          <p className="mt-1 text-[14px] text-[#6E6E72]">Pra começar sem risco.</p>
          <ul className="mt-6 flex flex-col gap-3">
            {FREE_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[14.5px] text-[#3F3F43]">
                <Check className="h-4 w-4 shrink-0 text-[#0F4D4A]" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            className="mt-7 block rounded-xl bg-[#0F4D4A] px-5 py-3 text-center text-[14.5px] font-semibold text-[#FBFEFD] transition-colors hover:bg-[#0B3F3C]"
          >
            Começar grátis
          </Link>
        </div>

        <div className="relative rounded-2xl border border-[#EAEAE4] bg-[#FBFBF9] p-7">
          <span className="absolute right-6 top-6 rounded-full bg-[#EAEAE4] px-2.5 py-1 text-[12px] font-semibold text-[#6E6E72]">
            Em breve
          </span>
          <h3 className="text-[18px] font-semibold text-[#1B1B1E]">Pro</h3>
          <p className="mt-1 text-[14px] text-[#6E6E72]">Pra quem quer ir sem limites.</p>
          <ul className="mt-6 flex flex-col gap-3">
            {PRO_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[14.5px] text-[#8A8A85]">
                <Check className="h-4 w-4 shrink-0 text-[#B4B4AF]" />
                {item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled
            className="mt-7 w-full cursor-not-allowed rounded-xl border border-[#E2E2DC] bg-white px-5 py-3 text-[14.5px] font-medium text-[#A0A09B]"
          >
            Em breve
          </button>
        </div>
      </div>
    </section>
  );
}
