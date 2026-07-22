const STEPS = [
  "Crie sua conta.",
  "Escolha uma ferramenta.",
  "Envie seu material.",
  "Receba recomendações práticas.",
  "Acompanhe sua evolução no dashboard.",
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="mx-auto max-w-[720px] scroll-mt-10 px-6 py-14 sm:px-10 sm:py-20">
      <h2 className="text-balance text-center text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#161618] sm:text-[36px]">
        Como funciona
      </h2>

      <ol className="mx-auto mt-10 flex max-w-[440px] flex-col gap-5">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0F4D4A] text-[13px] font-semibold text-[#FBFEFD]">
              {i + 1}
            </span>
            <span className="text-[15px] leading-[1.5] text-[#3F3F43]">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
