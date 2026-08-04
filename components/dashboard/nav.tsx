"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ScanSearch,
  History,
  Users,
  PenSquare,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
}

interface NavSection {
  /** Rótulo do grupo na sidebar (null = sem rótulo, ex.: Dashboard). */
  label: string | null;
  items: NavItem[];
}

// Agrupamento por proximidade/semelhança (Gestalt): tudo que opera SOBRE o
// LinkedIn fica junto sob um rótulo; candidatura (CV) é outro grupo.
// "Account" vive no dropdown do header; "Headline" é aba do LinkedIn Review.
// A bottom nav mobile achata as seções na mesma ordem (sem rótulos — não
// há espaço, mas a ordem preserva a vizinhança dos grupos).
const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", mobileLabel: "Início", icon: LayoutDashboard }],
  },
  {
    label: "LinkedIn",
    items: [
      { href: "/tools/linkedin-review", label: "LinkedIn Review", mobileLabel: "LinkedIn", icon: ScanSearch },
      { href: "/tools/networking", label: "Networking", mobileLabel: "Network", icon: Users },
      { href: "/tools/posts", label: "Posts", mobileLabel: "Posts", icon: PenSquare },
    ],
  },
  {
    label: "Candidatura",
    items: [{ href: "/tools/cv-tailor", label: "CV Tailor", mobileLabel: "CV", icon: FileText }],
  },
  {
    label: null,
    items: [{ href: "/history", label: "Histórico", mobileLabel: "Histórico", icon: History }],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: sidebar fixa à esquerda, ABAIXO do header (top-16 = h do AppHeader) */}
      <aside className="fixed bottom-0 left-0 top-16 hidden w-[240px] flex-col border-r border-[#EAEAE4] bg-white px-5 py-6 md:flex">
        <nav className="flex flex-col">
          {NAV_SECTIONS.map((section, sectionIndex) => (
            <div key={section.label ?? `section-${sectionIndex}`}>
              {/* Separador + rótulo entre grupos (proximidade + região comum) */}
              {sectionIndex > 0 && <div className="my-3 border-t border-[#F0F0EA]" />}
              {section.label && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A0A09B]">
                  {section.label}
                </p>
              )}
              <div className="flex flex-col gap-1">
                {section.items.map(({ href, label, icon: Icon }) => {
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
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile: bottom nav (seções achatadas, mesma ordem) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-[#EAEAE4] bg-white/95 px-0.5 py-1.5 backdrop-blur md:hidden">
        {ALL_ITEMS.map(({ href, mobileLabel, icon: Icon }) => {
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
