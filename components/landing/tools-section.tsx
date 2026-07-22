import { Sparkles, FileText, ScanSearch } from "lucide-react";

const TOOLS = [
  {
    icon: Sparkles,
    name: "Headline Optimizer",
    description: "Melhore sua headline para ser encontrado por recrutadores internacionais.",
  },
  {
    icon: FileText,
    name: "CV Tailor",
    description: "Adapte seu currículo para cada vaga usando palavras-chave da job description.",
  },
  {
    icon: ScanSearch,
    name: "LinkedIn Review",
    description: "Receba uma análise completa do seu perfil para o mercado internacional.",
  },
];

export function ToolsSection() {
  return (
    <section className="mx-auto max-w-[1120px] px-6 py-14 sm:px-10 sm:py-20">
      <div className="text-center">
        <h2 className="text-balance text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#161618] sm:text-[36px]">
          Ferramentas de IA, criadas pra este objetivo
        </h2>
        <p className="mx-auto mt-3 max-w-[520px] text-[15px] leading-[1.55] text-[#6E6E72]">
          Cada uma resolve um ponto específico do que recrutadores
          internacionais avaliam antes de chamar você pra conversar.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {TOOLS.map(({ icon: Icon, name, description }) => (
          <div
            key={name}
            className="flex flex-col gap-4 rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF1EF]">
              <Icon className="h-5 w-5 text-[#0F4D4A]" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[#1B1B1E]">{name}</h3>
              <p className="mt-1.5 text-[14px] leading-[1.55] text-[#6E6E72]">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
