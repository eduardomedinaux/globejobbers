import Image from "next/image";

// CTA aponta pra mailto por enquanto — vira formulário real (POST em
// /api/waitlist, tabela `waitlist`) na Etapa 5, quando essa infra existe.
export function MentoriaSection() {
  return (
    <section className="mx-auto max-w-[900px] px-6 py-20 sm:px-10 sm:py-24">
      <div className="grid items-center gap-8 rounded-[26px] border-2 border-tinta bg-gj-teal px-6 py-10 text-papel sm:grid-cols-[1.4fr_1fr] sm:px-12 sm:py-14">
        <div className="text-center sm:text-left">
          <span className="inline-block rounded-full border-2 border-tinta bg-amarelo px-3 py-1 font-spacemono text-[12px] font-bold text-tinta">
            Acompanhamento humano
          </span>
          <h2 className="mt-5 text-balance font-display text-[clamp(26px,3.6vw,40px)] font-extrabold leading-[1.1] tracking-[-0.02em]">
            Quer acompanhamento humano?
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[15.5px] leading-[1.6] text-papel/85 sm:mx-0">
            A mentoria <strong className="font-semibold text-papel">Carreira em Dólar</strong> ajuda
            você a transformar as recomendações do GlobeJobbers em estratégia
            real de carreira internacional.
          </p>
          <a
            href="mailto:contato@globejobbers.com?subject=Lista%20de%20espera%20-%20Mentoria%20Carreira%20em%20D%C3%B3lar"
            className="mt-7 inline-flex items-center gap-2 rounded-full border-2 border-tinta bg-papel px-6 py-3.5 text-[14.5px] font-bold text-tinta transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-dura-amarelo active:translate-x-0 active:translate-y-0 active:shadow-dura-sm"
          >
            Entrar na lista de espera da mentoria
          </a>
        </div>
        <div className="hidden justify-center sm:flex">
          <Image
            src="/illustrations/gj-hero-duo.png"
            alt="Dupla de profissionais brasileiros em estilo 3D"
            width={320}
            height={320}
            className="h-auto w-full max-w-[280px]"
          />
        </div>
      </div>
    </section>
  );
}
