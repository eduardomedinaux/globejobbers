import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { AccountMenu } from "@/components/dashboard/account-menu";

interface AppHeaderProps {
  name: string;
  plan: "free" | "pro";
}

/**
 * Header do topo — SÓ MOBILE desde 22/set (design do Figma): no desktop a
 * sidebar é full-height e o bloco do usuário mora no topo dela. No mobile a
 * bottom nav não tem lugar pro menu de conta, então este header permanece.
 */
export function AppHeader({ name, plan }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#EAEAE4] bg-white pl-5 pr-4 sm:pl-6 sm:pr-6 md:hidden">
      <Link href="/dashboard" aria-label="Ir para o dashboard" className="shrink-0">
        <Wordmark />
      </Link>

      <div className="flex items-center gap-2.5">
        {/*
          Placeholder consciente: o canal de suporte ainda não foi definido
          (decisão de 2026-07-22). Quando existir, trocar por <a href=...>.
        */}
        <button
          type="button"
          title="Em breve"
          aria-disabled="true"
          className="hidden cursor-default rounded-full border border-[#E2E2DC] bg-white px-4 py-2 text-[13.5px] font-medium text-[#3F3F43] sm:inline-flex"
        >
          Precisa de ajuda?
        </button>
        <AccountMenu name={name} plan={plan} />
      </div>
    </header>
  );
}
