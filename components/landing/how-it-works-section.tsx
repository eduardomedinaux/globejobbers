const STEPS = [
  "Crie sua conta.",
  "Escolha uma ferramenta.",
  "Envie seu material.",
  "Receba recomendações práticas.",
  "Acompanhe sua evolução no dashboard.",
];

export function HowItWorksSection() {
  return (
    <section
      id="como-funciona"
      className="mx-auto max-w-[760px] scroll-mt-10 px-6 py-20 sm:px-10 sm:py-24"
    >
      <h2 className="text-balance text-center font-display text-[clamp(30px,4.4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.02em]">
        Como funciona
      </h2>

      <ol className="mx-auto mt-12 flex max-w-[480px] flex-col gap-4">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className="flex items-center gap-4 rounded-[18px] border-2 border-tinta bg-papel-card px-5 py-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-tinta bg-amarelo font-display text-[15px] font-extrabold text-tinta">
              {i + 1}
            </span>
            <span className="text-[15.5px] leading-[1.5] text-tinta/85">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
