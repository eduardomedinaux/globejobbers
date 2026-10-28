import type { Metadata } from "next";
import Image from "next/image";
import { Fraunces, Space_Grotesk, Space_Mono } from "next/font/google";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { CheckoutButton } from "@/components/workshop/checkout-button";

// Landing do workshop ao vivo (produto Hotmart 8521774). Destino dos
// anúncios e dos links orgânicos. O botão leva pro checkout da OFERTA ativa
// (lib abaixo) — o link sem ?off= mostra o preço base, não o lote.
//
// Ao virar o lote: trocar WORKSHOP.offer/price/nextPrice/seats aqui.

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "WONK", "opsz"] });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

const WORKSHOP = {
  checkoutBase: "https://pay.hotmart.com/D107613704J",
  offer: "warh50mt",
  lot: "Lote 1",
  price: "R$ 25",
  seats: 20,
  nextPrice: "R$ 45",
  dateLong: "Sábado, 7 de novembro",
  time: "9h às 12h (horário de Brasília)",
};

export const metadata: Metadata = {
  title: "Workshop ao vivo · Seu caminho até a vaga em dólar · GlobeJobbers",
  description:
    "3 horas ao vivo, mão na massa: cargo-alvo, mercado de fora e perfil pronto pra vaga em dólar. Sábado, 7/11, das 9h às 12h.",
};

const DELIVERABLES = [
  ["O raio-X do seu perfil", "Onde você está hoje, com nota, comparado com o que as vagas de fora pedem."],
  ["As vagas que você quer, escolhidas", "Nada de mirar no escuro: você sai com as vagas reais que quer conquistar."],
  ["O que o mercado de fora pede", "Como o mercado chama o seu cargo e as skills mais pedidas, contadas em vagas reais."],
  ["Seu cargo-alvo numa frase", "A decisão que organiza todo o resto: perfil, currículo, busca e entrevista."],
  ["Headline nova, publicada na aula", "A primeira mudança pública, feita ali, na hora, com revisão ao vivo."],
] as const;

const FAQ = [
  [
    "Preciso falar inglês fluente?",
    "Não. O workshop é em português, e muita gente começa com inglês intermediário. O que mais pesa no primeiro filtro é o seu perfil estar claro em inglês, e isso a gente resolve junto.",
  ],
  [
    "Serve pra minha área?",
    "Serve pra Design, Marketing, Vendas, Customer Success, Tecnologia, Produto e outras áreas. O método é o mesmo: entender o que o mercado de fora pede pro seu cargo e posicionar o seu perfil pra isso.",
  ],
  ["Vai ficar gravado?", "Vai. Quem se inscrever recebe a gravação, então dá pra rever depois ou assistir se tiver algum imprevisto no dia."],
  [
    "Preciso levar alguma coisa?",
    "O computador e o PDF do seu LinkedIn (no LinkedIn: seu perfil → Recursos → Salvar como PDF).",
  ],
  ["E se eu não gostar?", "Você tem 7 dias de garantia pela Hotmart. Pediu o reembolso dentro do prazo, recebe o valor de volta."],
] as const;

export default function WorkshopPage() {
  const s = WORKSHOP;
  return (
    <main
      className={`gj-landing min-h-screen bg-papel font-grotesk text-tinta antialiased ${fraunces.variable} ${grotesk.variable} ${spaceMono.variable}`}
    >
      <ViewTracker event="workshop_viewed" />

      {/* Topo */}
      <section
        className="relative overflow-hidden px-5 pb-12 pt-8 sm:px-10 sm:pt-14"
        style={{
          background:
            "radial-gradient(900px 420px at 78% -8%, rgba(242,178,58,.32), transparent 62%), radial-gradient(760px 400px at 12% 8%, rgba(123,164,216,.25), transparent 60%), #FAF4E8",
        }}
      >
        <div className="mx-auto grid max-w-[1080px] items-center gap-8 md:grid-cols-[1.1fr_0.9fr] md:gap-12">
          <div>
            <span className="inline-flex rounded-full border-2 border-tinta bg-laranja px-4 py-1.5 font-spacemono text-[12.5px] font-bold uppercase tracking-wide text-papel">
              Workshop ao vivo
            </span>
            <h1 className="mt-5 font-display text-[clamp(40px,6.4vw,76px)] font-black leading-[1.02] tracking-[-0.03em]">
              Seu caminho até a <span className="text-laranja">vaga em dólar</span>, em 3 horas.
            </h1>
            <p className="mt-5 max-w-[46ch] text-[clamp(16px,1.9vw,19px)] leading-[1.6] text-tinta/80">
              Ao vivo, mão na massa, no seu próprio perfil. Você sai com o cargo-alvo definido, sabendo o que o mercado de
              fora pede e com o perfil pronto pra começar a aplicar.
            </p>
            <div className="mt-6 flex flex-col gap-1.5 font-spacemono text-[14px] text-tinta/75">
              <span>📅 {s.dateLong}</span>
              <span>🕘 {s.time} · online</span>
            </div>
            <div className="mt-7">
              <CheckoutButton base={s.checkoutBase} offer={s.offer} placement="hero">
                Garantir minha vaga · {s.price}
              </CheckoutButton>
              <p className="mt-3 text-[13.5px] text-tinta/60">
                {s.lot}: {s.price} só pras {s.seats} primeiras vagas. Depois sobe pra {s.nextPrice}.
              </p>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[420px]">
            <div className="overflow-hidden rounded-[26px] border-2 border-tinta shadow-dura">
              <Image
                src="/workshop/eduardo-home-office.jpg"
                alt="Eduardo Medina no home office"
                width={825}
                height={1024}
                priority
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Entregáveis */}
      <section className="mx-auto max-w-[880px] px-5 py-14 sm:px-10">
        <h2 className="font-display text-[clamp(30px,4.4vw,46px)] font-black leading-[1.05] tracking-[-0.02em]">
          Em 3 horas, você sai com:
        </h2>
        <ol className="mt-8 flex flex-col gap-4">
          {DELIVERABLES.map(([title, body], i) => (
            <li key={title} className="flex gap-4 rounded-[22px] border-2 border-tinta bg-papel-card p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-tinta bg-amarelo font-spacemono font-bold">
                {i + 1}
              </span>
              <div>
                <h3 className="text-[18px] font-bold">{title}</h3>
                <p className="mt-1 text-[15.5px] leading-[1.55] text-tinta/75">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Mão na massa + bônus */}
      <section className="bg-tinta px-5 py-14 text-papel sm:px-10">
        <div className="mx-auto grid max-w-[1080px] items-center gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-[26px] border-2 border-papel">
            <Image src="/workshop/eduardo-aula.jpg" alt="Eduardo dando aula" width={825} height={1024} className="h-auto w-full" />
          </div>
          <div>
            <h2 className="font-display text-[clamp(30px,4.4vw,46px)] font-black leading-[1.05] tracking-[-0.02em]">
              Não é palestra. <span className="text-amarelo">É mão na massa.</span>
            </h2>
            <p className="mt-4 text-[17px] leading-[1.6] text-papel/80">
              Você faz junto comigo, na hora, no seu próprio perfil. Cada bloco termina com você entregando alguma coisa.
              Ninguém sai só com anotação.
            </p>
            <div className="mt-8 rounded-[22px] border-2 border-papel bg-papel p-6 text-tinta">
              <span className="font-spacemono text-[12px] font-bold uppercase tracking-wide text-gj-teal">Bônus</span>
              <h3 className="mt-2 font-display text-[26px] font-black leading-[1.1]">7 dias de GlobeJobbers Pro</h3>
              <p className="mt-2 text-[15.5px] leading-[1.55] text-tinta/75">
                Todas as ferramentas liberadas: LinkedIn Review, CV Tailor, Market Intelligence e treino de entrevista.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quem dá a aula */}
      <section className="mx-auto grid max-w-[880px] items-center gap-8 px-5 py-14 sm:grid-cols-[220px_1fr] sm:px-10">
        <div className="relative mx-auto aspect-square w-[200px] overflow-hidden rounded-full border-2 border-tinta shadow-dura sm:w-[220px]">
          <Image src="/workshop/eduardo-retrato.jpg" alt="Eduardo Medina" fill sizes="220px" className="object-cover object-center" />
        </div>
        <div>
          <span className="font-spacemono text-[12.5px] uppercase tracking-wide text-tinta/60">Quem dá a aula</span>
          <h2 className="mt-1 font-display text-[34px] font-black tracking-[-0.02em]">Eduardo Medina</h2>
          <p className="mt-3 text-[16.5px] leading-[1.6] text-tinta/80">
            15 anos de design de produto. Trabalho pra uma empresa americana morando no Rio. Levei muito não até chegar
            aqui, e criei o GlobeJobbers pra encurtar esse caminho pra quem vem depois.
          </p>
        </div>
      </section>

      {/* Preço */}
      <section className="px-5 pb-14 sm:px-10">
        <div className="mx-auto max-w-[560px] rounded-[26px] border-2 border-tinta bg-papel-card p-8 text-center shadow-dura">
          <span className="font-spacemono text-[12.5px] font-bold uppercase tracking-wide text-laranja">
            {s.lot} · {s.seats} vagas
          </span>
          <p className="mt-2 font-display text-[64px] font-black leading-none tracking-[-0.03em]">{s.price}</p>
          <p className="mt-3 text-[15px] text-tinta/70">
            Depois das {s.seats} primeiras vagas, o valor sobe pra {s.nextPrice}.
          </p>
          <ul className="mx-auto mt-6 flex max-w-[360px] flex-col gap-2 text-left text-[15.5px]">
            <li>✓ 3 horas ao vivo, {s.dateLong.toLowerCase()}</li>
            <li>✓ Gravação pra rever depois</li>
            <li>✓ 7 dias de GlobeJobbers Pro</li>
            <li>✓ 7 dias de garantia</li>
          </ul>
          <div className="mt-7">
            <CheckoutButton base={s.checkoutBase} offer={s.offer} placement="pricing">
              Garantir minha vaga
            </CheckoutButton>
          </div>
          <p className="mt-3 text-[12.5px] text-tinta/55">Pagamento seguro pela Hotmart</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[760px] px-5 pb-20 sm:px-10">
        <h2 className="font-display text-[32px] font-black tracking-[-0.02em]">Dúvidas</h2>
        <div className="mt-6 flex flex-col gap-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-[18px] border-2 border-tinta bg-papel-card px-5 py-4">
              <summary className="cursor-pointer list-none text-[16.5px] font-bold">
                <span className="mr-2 inline-block transition-transform group-open:rotate-45">+</span>
                {q}
              </summary>
              <p className="mt-3 text-[15.5px] leading-[1.6] text-tinta/75">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
