"use client";

import { track } from "@/lib/analytics";
import { metaTrack } from "@/lib/meta-pixel";

/**
 * Botão de compra do workshop. Monta o link do checkout da Hotmart com a
 * oferta ativa (?off=) e repassa a origem da visita no parâmetro `src` da
 * Hotmart (ex.: "meta-workshop-a"), que aparece no relatório de vendas dela
 * — o PostHog perde a pessoa no instante em que ela sai pro checkout.
 *
 * Dispara workshop_checkout_clicked (PostHog) e InitiateCheckout (Meta).
 * A navegação é um <a> comum: não espera os eventos (o pixel e o PostHog
 * enviam com beacon/keepalive).
 */
export function CheckoutButton({
  base,
  offer,
  placement,
  children,
}: {
  base: string;
  offer: string;
  placement: string;
  children: React.ReactNode;
}) {
  const href = `${base}?off=${offer}`;

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const params = new URLSearchParams(window.location.search);
    const src = [params.get("utm_source"), params.get("utm_campaign"), params.get("utm_content")]
      .filter(Boolean)
      .join("-")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 60);
    const url = new URL(href);
    if (src) url.searchParams.set("src", src);
    e.currentTarget.href = url.toString();

    track("workshop_checkout_clicked", { placement, src: src || null });
    metaTrack("InitiateCheckout", { content_name: "workshop", currency: "BRL" });
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-tinta bg-tinta px-7 py-4 text-base font-bold text-papel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-dura-laranja active:translate-x-0 active:translate-y-0 active:shadow-dura-sm sm:w-auto"
    >
      {children}
    </a>
  );
}
