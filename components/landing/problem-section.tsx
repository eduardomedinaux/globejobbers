const PROBLEMS = [
  "Bons profissionais brasileiros não são encontrados por recrutadores internacionais.",
  "LinkedIn sem as palavras-chave que esses recrutadores buscam.",
  "Currículo genérico, igual pra qualquer vaga.",
  "Candidatura sem adaptação à job description.",
  "Pouca clareza sobre o que recrutadores internacionais realmente procuram.",
];

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-[820px] px-6 py-20 sm:px-10 sm:py-24">
      <h2 className="text-balance text-center font-display text-[clamp(30px,4.4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.02em]">
        O talento existe. A visibilidade, não.
      </h2>
      <ul className="mx-auto mt-12 flex max-w-[600px] flex-col gap-4">
        {PROBLEMS.map((problem) => (
          <li
            key={problem}
            className="flex items-start gap-3.5 rounded-[18px] border-2 border-tinta bg-papel-card px-5 py-4 text-[15px] leading-[1.5] text-tinta/85"
          >
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-terracota" aria-hidden />
            {problem}
          </li>
        ))}
      </ul>
    </section>
  );
}
