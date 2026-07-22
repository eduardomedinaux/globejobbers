"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, ScanSearch, History } from "lucide-react";
import { cn } from "@/lib/utils";

// `mobileLabel` mais curto que `label` — os itens na bottom nav não cabem com
// os labels completos da sidebar em telas estreitas (ex.: "LinkedIn Review").
// "Account" saiu da navegação: agora vive no dropdown "Minha conta" do header
// (components/dashboard/account-menu.tsx), acessível também no mobile.
// "Headline" também saiu: é uma aba dentro do LinkedIn Review (headline é
// seção do perfil, não ferramenta irmã).
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", mobileLabel: "Início", icon: LayoutDashboard },
  { href: "/tools/linkedin-review", label: "LinkedIn Review", mobileLabel: "LinkedIn", icon: ScanSearch },
  { href: "/tools/cv-tailor", label: "CV Tailor", mobileLabel: "CV", icon: FileText },
  { href: "/history", label: "Histórico", mobileLabel: "Histórico", icon: History },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: sidebar fixa à esquerda, ABAIXO do header (top-16 = h do AppHeader) */}
      <aside className="fixed bottom-0 left-0 top-16 hidden w-[240px] flex-col border-r border-[#EAEAE4] bg-white px-5 py-6 md:flex">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors",
                  active
                    ? "bg-[#EAF1EF] text-[#0F4D4A]"
                    : "text-[#5C5C60] hover:bg-[#FAFAF8] hover:text-[#1B1B1E]",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile: bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-[#EAEAE4] bg-white/95 px-0.5 py-1.5 backdrop-blur md:hidden">
        {NAV_ITEMS.map(({ href, mobileLabel, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[10px] font-medium leading-tight",
                active ? "text-[#0F4D4A]" : "text-[#8A8A85]",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
