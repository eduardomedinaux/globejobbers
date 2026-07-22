const PROBLEMS = [
  "Bons profissionais brasileiros não são encontrados por recrutadores internacionais.",
  "LinkedIn sem as palavras-chave que esses recrutadores buscam.",
  "Currículo genérico, igual pra qualquer vaga.",
  "Candidatura sem adaptação à job description.",
  "Pouca clareza sobre o que recrutadores internacionais realmente procuram.",
];

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-[820px] px-6 py-14 sm:px-10 sm:py-20">
      <h2 className="text-balance text-center text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#161618] sm:text-[36px]">
        O talento existe. A visibilidade, não.
      </h2>
      <ul className="mx-auto mt-10 flex max-w-[560px] flex-col gap-4">
        {PROBLEMS.map((problem) => (
          <li
            key={problem}
            className="flex items-start gap-3 rounded-xl border border-[#EAEAE4] bg-white px-5 py-4 text-[14.5px] leading-[1.5] text-[#3F3F43] shadow-[0_1px_2px_rgba(20,20,20,0.03)]"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F4D4A]" aria-hidden />
            {problem}
          </li>
        ))}
      </ul>
    </section>
  );
}
