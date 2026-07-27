import Image from "next/image";
import Link from "next/link";

const AVATAR_COLORS = ["bg-jeans", "bg-laranja", "bg-amarelo", "bg-folha", "bg-terracota"];

export function Hero() {
  return (
    <section
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(900px 420px at 78% -8%, rgba(242,178,58,.32), transparent 62%), radial-gradient(760px 400px at 12% 8%, rgba(123,164,216,.25), transparent 60%), #FAF4E8",
      }}
    >
      <div className="relative z-[5] flex flex-1 flex-col items-center justify-center px-6 pb-6 pt-32 text-center sm:pt-36">
        {/* pill de prova social */}
        <div className="mb-7 inline-flex items-center gap-3 rounded-full border-2 border-tinta bg-papel-card py-2 pl-2.5 pr-5 text-[13px] font-medium sm:text-sm">
          <span className="flex">
            {AVATAR_COLORS.map((c, i) => (
              <span
                key={c}
                className={`grid h-[28px] w-[28px] place-items-center rounded-full border-2 border-tinta text-xs ${c} ${i < 4 ? "-mr-2" : ""}`}
                aria-hidden
              >
                🕶
              </span>
            ))}
          </span>
          Feito para Design, Marketing, Vendas, CS, Tech e Produto
        </div>

        <h1 className="font-display text-[clamp(44px,7.6vw,104px)] font-black leading-[1] tracking-[-0.03em] [font-variation-settings:'SOFT'_60,'WONK'_1]">
          Carreira. <span className="text-laranja">Dólar.</span>{" "}
          <span className="text-gj-teal">Liberdade.</span>
        </h1>

        <p className="mt-5 max-w-[52ch] text-[clamp(16px,2vw,21px)] leading-[1.55] text-tinta/80">
          Conquiste sua vaga internacional{" "}
          <strong className="font-semibold text-tinta">sem sair de casa</strong>, usando a
          profissão que você já tem. Depois dela,{" "}
          <strong className="font-semibold text-tinta">more onde quiser</strong>.
        </p>

        {/* CTA único: cadastro é o caminho (decisão de 24/jul — sai o
            "testar sem cadastro"; /preview segue existindo pra links de
            campanha, só não é mais oferecido aqui) */}
        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3.5 sm:w-auto sm:flex-row">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-tinta bg-tinta px-7 py-4 text-base font-bold text-papel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-dura-laranja active:translate-x-0 active:translate-y-0 active:shadow-dura-sm sm:w-auto"
          >
            Começar grátis
          </Link>
        </div>

        <Link
          href="#como-funciona"
          className="mt-5 font-medium text-tinta/60 underline-offset-4 transition-colors hover:text-tinta hover:underline"
        >
          Ver como funciona
        </Link>

        <span className="mt-4 font-spacemono text-[12.5px] text-tinta/60">
          grátis · 2 minutos · sem pedir sua senha do LinkedIn
        </span>
      </div>

      {/* elenco 3D no rodapé do hero */}
      <div className="relative z-[2] mt-2 flex justify-center">
        <Image
          src="/illustrations/gj-cast.png"
          alt="Profissionais brasileiros em estilo 3D — o elenco GlobeJobbers"
          width={880}
          height={420}
          priority
          className="h-auto w-full max-w-[min(880px,92vw)]"
        />
      </div>
      <div className="relative z-[3] h-[3px] bg-tinta" />
    </section>
  );
}
