import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-[-220px] h-[560px] w-[900px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(15,77,74,0.07), rgba(15,77,74,0) 70%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-[820px] flex-col items-center px-6 pb-10 pt-8 text-center sm:px-10 sm:pb-16 sm:pt-12">
        <span className="rounded-full bg-[#EAF1EF] px-3 py-1 text-[13px] font-semibold text-[#0F4D4A]">
          Para profissionais brasileiros de 2 a 10 anos de experiência
        </span>

        <h1 className="mt-6 text-balance text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#161618] sm:text-[48px] md:text-[56px]">
          Seu copiloto de IA para conquistar vagas internacionais
        </h1>

        <p className="text-pretty mt-6 max-w-[600px] text-base leading-[1.6] text-[#5C5C60] sm:text-[19px]">
          Otimize seu LinkedIn, adapte seu currículo e se prepare para vagas em
          dólar com ferramentas criadas para recrutadores internacionais.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="w-full rounded-xl bg-[#0F4D4A] px-6 py-3.5 text-center text-[15px] font-semibold text-[#FBFEFD] transition-colors hover:bg-[#0B3F3C] sm:w-auto"
          >
            Começar grátis
          </Link>
          <Link
            href="#como-funciona"
            className="w-full rounded-xl border border-[#E2E2DC] bg-white px-6 py-3.5 text-center text-[15px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8] sm:w-auto"
          >
            Ver como funciona
          </Link>
        </div>

        <Link
          href="/preview/full-scan"
          className="mt-5 text-[13.5px] text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
        >
          Ou teste grátis, sem cadastro →
        </Link>
      </div>
    </section>
  );
}
