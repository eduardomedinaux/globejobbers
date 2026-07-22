import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-5 px-6 py-5 sm:px-8">
        <Wordmark />
        <nav className="flex items-center gap-6">
          <Link
            href="#como-funciona"
            className="hidden text-[15px] font-medium text-tinta/75 transition-opacity hover:opacity-100 sm:block"
          >
            Como funciona
          </Link>
          <Link
            href="/login"
            className="hidden text-[15px] font-medium text-tinta/75 transition-opacity hover:opacity-100 sm:block"
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border-2 border-tinta bg-tinta px-5 py-2.5 text-[14px] font-bold text-papel transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-dura-laranja active:translate-x-0 active:translate-y-0 active:shadow-dura-sm"
          >
            Começar grátis
          </Link>
        </nav>
      </div>
    </header>
  );
}
