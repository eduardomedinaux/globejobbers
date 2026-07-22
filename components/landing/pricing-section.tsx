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
    <section className="mx-auto max-w-[880px] px-6 py-20 sm:px-10 sm:py-24">
      <h2 className="text-balance text-center font-display text-[clamp(30px,4.4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.02em]">
        Comece grátis
      </h2>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        <div className="rounded-[24px] border-2 border-tinta bg-papel-card p-7 shadow-dura">
          <h3 className="font-display text-[22px] font-bold text-tinta">Free</h3>
          <p className="mt-1 text-[14.5px] text-tinta/70">Pra começar sem risco.</p>
          <ul className="mt-6 flex flex-col gap-3">
            {FREE_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[15px] text-tinta/85">
                <Check className="h-4 w-4 shrink-0 text-gj-teal" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            className="mt-7 flex items-center justify-center rounded-full border-2 border-tinta bg-tinta px-5 py-3.5 text-center text-[14.5px] font-bold text-papel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-dura-laranja active:translate-x-0 active:translate-y-0 active:shadow-dura-sm"
          >
            Começar grátis
          </Link>
        </div>

        <div className="relative rounded-[24px] border-2 border-dashed border-tinta bg-papel p-7">
          <span className="absolute right-6 top-6 rounded-full border-2 border-tinta bg-amarelo px-2.5 py-1 font-spacemono text-[11px] font-bold text-tinta">
            Em breve
          </span>
          <h3 className="font-display text-[22px] font-bold text-tinta/60">Pro</h3>
          <p className="mt-1 text-[14.5px] text-tinta/50">Pra quem quer ir sem limites.</p>
          <ul className="mt-6 flex flex-col gap-3">
            {PRO_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[15px] text-tinta/50">
                <Check className="h-4 w-4 shrink-0 text-tinta/30" />
                {item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled
            className="mt-7 w-full cursor-not-allowed rounded-full border-2 border-tinta/30 bg-transparent px-5 py-3.5 text-[14.5px] font-bold text-tinta/40"
          >
            Em breve
          </button>
        </div>
      </div>
    </section>
  );
}
