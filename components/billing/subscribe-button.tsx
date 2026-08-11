"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Botão de assinar: chama /api/billing/checkout e redireciona pro Stripe
 * Checkout. O acesso só é concedido pelo webhook após o pagamento.
 */
export function SubscribeButton({
  plan,
  variant = "primary",
}: {
  plan: "monthly" | "annual";
  variant?: "primary" | "secondary";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    track("checkout_started", { plan });
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string") {
        throw new Error(
          typeof data.error === "string" ? data.error : "Não foi possível abrir o pagamento.",
        );
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
      track("checkout_failed", { plan });
    }
  }

  return (
    <div className="mt-5 flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          variant === "primary"
            ? "flex items-center justify-center gap-2 rounded-lg bg-[#0F4D4A] px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#0C403D] disabled:opacity-60"
            : "flex items-center justify-center gap-2 rounded-lg border border-[#0F4D4A] px-4 py-2.5 text-[13.5px] font-semibold text-[#0F4D4A] transition-colors hover:bg-[#EAF1EF] disabled:opacity-60"
        }
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {loading ? "Abrindo pagamento…" : "Assinar"}
      </button>
      {error && <p className="text-[12.5px] text-destructive">{error}</p>}
    </div>
  );
}
