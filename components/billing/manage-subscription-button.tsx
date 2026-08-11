"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";

/** Abre o Customer Portal do Stripe (trocar cartão, cancelar, faturas). */
export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    track("portal_opened");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string") {
        throw new Error(
          typeof data.error === "string" ? data.error : "Não foi possível abrir o portal.",
        );
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-[#E2E2DC] px-3.5 py-2 text-[13px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8] disabled:opacity-60"
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
        {loading ? "Abrindo…" : "Gerenciar assinatura"}
      </button>
      {error && <p className="text-[12.5px] text-destructive">{error}</p>}
    </div>
  );
}
