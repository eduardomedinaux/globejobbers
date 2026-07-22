"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import type { ToolType } from "@/lib/types";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  toolType: ToolType;
}

/**
 * Modal sem dependência de Dialog (nenhuma instalada ainda) — overlay
 * simples, fecha no backdrop/Escape. Usuário já está logado aqui, então o
 * e-mail vem da sessão em /api/waitlist — não pedimos de novo.
 */
export function UpgradeModal({ open, onClose, toolType }: UpgradeModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setError(null);
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleJoinWaitlist() {
    setIsSubmitting(true);
    setError(null);
    track("upgrade_waitlist_clicked", { tool_type: toolType });

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: toolType }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError("Não foi possível entrar na lista agora. Tente de novo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[420px] rounded-2xl border border-[#EAEAE4] bg-white p-7 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[16px] font-semibold text-[#1B1B1E]">
          Você atingiu o limite gratuito deste mês.
        </p>
        <p className="mt-2 text-[14px] leading-[1.55] text-[#6E6E72]">
          O plano Pro estará disponível em breve. Entre na lista de espera
          para receber acesso antecipado.
        </p>

        {submitted ? (
          <p className="mt-5 text-[14px] font-medium text-[#0F4D4A]">
            Pronto! Você entrou na lista de espera.
          </p>
        ) : (
          <>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <button
              type="button"
              onClick={handleJoinWaitlist}
              disabled={isSubmitting}
              className="mt-5 w-full rounded-xl bg-[#0F4D4A] px-5 py-3 text-[14.5px] font-semibold text-[#FBFEFD] transition-colors hover:bg-[#0B3F3C] disabled:opacity-60"
            >
              {isSubmitting ? "Entrando…" : "Entrar na lista de espera"}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-[13px] text-[#8A8A85] underline-offset-2 transition-colors hover:text-[#3F3F43] hover:underline"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
