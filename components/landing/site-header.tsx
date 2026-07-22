import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-6 py-6 sm:px-10">
      <Wordmark />
      <nav className="flex items-center gap-5">
        <Link
          href="/login"
          className="hidden text-[14px] font-medium text-[#3F3F43] transition-colors hover:text-[#161618] sm:block"
        >
          Entrar
        </Link>
        <Link
          href="/login"
          className="rounded-xl bg-[#0F4D4A] px-4 py-2.5 text-[14px] font-semibold text-[#FBFEFD] transition-colors hover:bg-[#0B3F3C]"
        >
          Começar grátis
        </Link>
      </nav>
    </header>
  );
}
