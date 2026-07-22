import { Sparkles, FileText, ScanSearch } from "lucide-react";

const TOOLS = [
  {
    icon: Sparkles,
    name: "Headline Optimizer",
    description: "Melhore sua headline para ser encontrado por recrutadores internacionais.",
    accent: "bg-gj-teal",
  },
  {
    icon: FileText,
    name: "CV Tailor",
    description: "Adapte seu currículo para cada vaga usando palavras-chave da job description.",
    accent: "bg-jeans-escuro",
  },
  {
    icon: ScanSearch,
    name: "LinkedIn Review",
    description: "Receba uma análise completa do seu perfil para o mercado internacional.",
    accent: "bg-folha",
  },
];

export function ToolsSection() {
  return (
    <section className="mx-auto max-w-[1120px] px-6 py-20 sm:px-10 sm:py-24">
      <div className="text-center">
        <h2 className="text-balance font-display text-[clamp(30px,4.4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.02em]">
          Ferramentas de IA, criadas pra este objetivo
        </h2>
        <p className="mx-auto mt-4 max-w-[540px] text-[16px] leading-[1.55] text-tinta/75">
          Cada uma resolve um ponto específico do que recrutadores
          internacionais avaliam antes de chamar você pra conversar.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-3">
        {TOOLS.map(({ icon: Icon, name, description, accent }) => (
          <div
            key={name}
            className="flex flex-col gap-5 rounded-[22px] border-2 border-tinta bg-papel-card p-6 transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-dura"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-tinta ${accent}`}
            >
              <Icon className="h-5 w-5 text-papel" />
            </div>
            <div>
              <h3 className="font-display text-[20px] font-bold text-tinta">{name}</h3>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-tinta/75">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
