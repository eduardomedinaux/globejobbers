"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { META_PIXEL_ID, metaTrack } from "@/lib/meta-pixel";

// Parâmetros de URL que sinalizam conversão vinda do servidor (callback do
// login e volta do Stripe). Disparam o evento uma vez e são removidos da
// barra de endereço, pra um refresh não contar de novo.
const CONVERSION_PARAMS = {
  signup: "CompleteRegistration",
  subscribed: "Subscribe",
} as const;

function PixelEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef(pathname);

  // PageView em navegação client-side, só quando a ROTA muda. O primeiro
  // PageView sai do script base abaixo. Mudança só de query (inclusive a
  // limpeza do ?signup=1 abaixo) não conta como nova página.
  useEffect(() => {
    if (pathname !== lastPath.current) {
      lastPath.current = pathname;
      metaTrack("PageView");
    }
  }, [pathname]);

  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    for (const [param, event] of Object.entries(CONVERSION_PARAMS)) {
      if (url.searchParams.get(param) === "1") {
        metaTrack(event);
        url.searchParams.delete(param);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [searchParams]);

  return null;
}

export function MetaPixel() {
  if (!META_PIXEL_ID) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(META_PIXEL_ID)});
fbq('track', 'PageView');`}
      </Script>
      <PixelEvents />
    </>
  );
}
