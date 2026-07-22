// CTA aponta pra mailto por enquanto — vira formulário real (POST em
// /api/waitlist, tabela `waitlist`) na Etapa 5, quando essa infra existe.
export function MentoriaSection() {
  return (
    <section className="mx-auto max-w-[760px] px-6 py-14 sm:px-10 sm:py-20">
      <div className="rounded-2xl border border-[#EAEAE4] bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(20,20,20,0.03)] sm:px-14 sm:py-14">
        <span className="rounded-full bg-[#F4F0E8] px-3 py-1 text-[12.5px] font-semibold text-[#8A6D1F]">
          Acompanhamento humano
        </span>
        <h2 className="mt-5 text-balance text-[24px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#161618] sm:text-[30px]">
          Quer acompanhamento humano?
        </h2>
        <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-[1.6] text-[#6E6E72]">
          A mentoria <strong className="text-[#3F3F43]">Carreira em Dólar</strong> ajuda
          você a transformar as recomendações do GlobeJobbers em estratégia
          real de carreira internacional.
        </p>
        <a
          href="mailto:contato@globejobbers.com?subject=Lista%20de%20espera%20-%20Mentoria%20Carreira%20em%20D%C3%B3lar"
          className="mt-6 inline-block rounded-xl border border-[#E2E2DC] bg-[#FAFAF8] px-6 py-3 text-[14.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#F4F4F0]"
        >
          Entrar na lista de espera da mentoria
        </a>
      </div>
    </section>
  );
}
