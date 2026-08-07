"use client";

import { useEffect } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import type { ToolType } from "@/lib/types";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  toolType: ToolType;
}

/**
 * Modal de limite atingido. Com a cobrança ativa (05/ago), quem chega aqui
 * é usuário com plano cujo limite mensal esgotou (sem plano nem chega:
 * PLAN_REQUIRED redireciona pra /assinatura antes). Sem dependência de
 * Dialog — overlay simples, fecha no backdrop/Escape.
 */
export function UpgradeModal({ open, onClose, toolType }: UpgradeModalProps) {
  useEffect(() => {
    if (!open) return;
    track("limit_reached", { tool_type: toolType, surface: "modal" });
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose, toolType]);

  if (!open) return null;

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
          Você atingiu o limite do seu plano neste mês.
        </p>
        <p className="mt-2 text-[14px] leading-[1.55] text-[#6E6E72]">
          Seus usos renovam no início do próximo mês. Se precisar de mais
          agora, fale com a gente ou veja os planos disponíveis.
        </p>

        <Link
          href="/assinatura"
          className="mt-5 block w-full rounded-xl bg-[#0F4D4A] px-5 py-3 text-[14.5px] font-semibold text-[#FBFEFD] transition-colors hover:bg-[#0B3F3C]"
        >
          Ver planos
        </Link>

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
