import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { AccountMenu } from "@/components/dashboard/account-menu";

interface AppHeaderProps {
  name: string;
  plan: "free" | "pro";
}

/**
 * Header full-width no topo da área logada (padrão Didomi/Stripe/Linear):
 * logo à esquerda; "Precisa de ajuda?" + "Minha conta" à direita.
 * A sidebar (DashboardNav) começa ABAIXO deste header — ver app/(app)/layout.tsx.
 */
export function AppHeader({ name, plan }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#EAEAE4] bg-white pl-5 pr-4 sm:pl-6 sm:pr-6">
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
