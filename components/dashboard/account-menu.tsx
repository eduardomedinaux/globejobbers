"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Earth, LogOut, Settings } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { wordmarkSerif } from "@/components/wordmark";
import { cn } from "@/lib/utils";

interface AccountMenuProps {
  name: string;
  plan: "free" | "pro";
  /**
   * "pill" = botão "Minha conta" do header (mobile). "sidebar" = bloco do
   * topo da sidebar (design do Eduardo no Figma, 22/set): logo Earth +
   * primeiro nome em serifa (truncado) + selinho do plano + chevron.
   */
  variant?: "pill" | "sidebar";
}

/**
 * Dropdown "Minha conta" do header: nome + plano, link para /account e Sair.
 * Substitui o antigo DashboardTopBar (nome/plano/sair) e o item "Account" da
 * sidebar. Sem dependência de Radix — dropdown simples com click-outside/Esc.
 */
export function AccountMenu({ name, plan, variant = "pill" }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar/tocar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleLogout() {
    setIsLoggingOut(true);
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    // Full reload garante que o middleware/layout vejam a sessão já limpa.
    window.location.href = "/login";
  }

  const firstName = name.trim().split(/\s+/)[0] || name;

  return (
    <div ref={rootRef} className="relative">
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          title={name}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-[#FAFAF8]",
            open && "bg-[#FAFAF8]",
          )}
        >
          {/* Tag Beta em cima do globinho (24/set) — some pós-beta. */}
          <span className="relative shrink-0">
            <Earth className="h-6 w-6 text-[#0F4D4A]" strokeWidth={1.75} />
            <span className="absolute -right-2 -top-1.5 rounded-[3px] bg-[#0F4D4A] px-[3px] py-px text-[6.5px] font-bold uppercase tracking-[0.06em] text-white">
              Beta
            </span>
          </span>
          <span
            className={`${wordmarkSerif.className} max-w-[104px] truncate text-[19px] font-semibold leading-none text-[#161618]`}
          >
            {firstName}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              plan === "pro" ? "bg-[#EAF1EF] text-[#0F4D4A]" : "bg-[#F4F4F0] text-[#6E6E72]",
            )}
          >
            {plan === "pro" ? "Pro" : "Free"}
          </span>
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 shrink-0 text-[#8A8A85] transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={cn(
            "flex items-center gap-1.5 rounded-full border border-[#E2E2DC] bg-white px-4 py-2 text-[13.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8]",
            open && "bg-[#FAFAF8]",
          )}
        >
          Minha conta
          <ChevronDown
            className={cn("h-4 w-4 text-[#8A8A85] transition-transform", open && "rotate-180")}
          />
        </button>
      )}

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-[calc(100%+8px)] w-64 overflow-hidden rounded-2xl border border-[#EAEAE4] bg-white shadow-[0_8px_30px_rgba(20,20,20,0.08)]",
            variant === "sidebar" ? "left-0 z-40" : "right-0",
          )}
        >
          <div className="border-b border-[#F0F0EA] px-4 py-3">
            <p className="truncate text-[14px] font-semibold text-[#1B1B1E]">{name}</p>
            <span className="mt-1 inline-block rounded-full bg-[#EAF1EF] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#0F4D4A]">
              Plano {plan === "pro" ? "Pro" : "Free"}
            </span>
          </div>
          <div className="p-1.5">
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8]"
            >
              <Settings className="h-4 w-4 text-[#8A8A85]" />
              Configurações da conta
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium text-[#3F3F43] transition-colors hover:bg-[#FAFAF8] disabled:opacity-50"
            >
              <LogOut className="h-4 w-4 text-[#8A8A85]" />
              {isLoggingOut ? "Saindo…" : "Sair"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
