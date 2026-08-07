"use client";

import Link from "next/link";
import { Sparkles, FileText, Radar, ScanSearch, Users, PenSquare, type LucideIcon } from "lucide-react";
import { track } from "@/lib/analytics";

const ICONS = {
  sparkles: Sparkles,
  "file-text": FileText,
  radar: Radar,
  "scan-search": ScanSearch,
  users: Users,
  "pen-square": PenSquare,
} satisfies Record<string, LucideIcon>;

export type ToolIcon = keyof typeof ICONS;

interface ToolCardProps {
  icon: ToolIcon;
  name: string;
  description: string;
  href: string;
  remainingLabel: string;
}

export function ToolCard({ icon, name, description, href, remainingLabel }: ToolCardProps) {
  const Icon = ICONS[icon];
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF1EF]">
        <Icon className="h-5 w-5 text-[#0F4D4A]" />
      </div>
      <div>
        <h3 className="text-[16px] font-semibold text-[#1B1B1E]">{name}</h3>
        <p className="mt-1.5 text-[14px] leading-[1.55] text-[#6E6E72]">{description}</p>
      </div>
      <p className="text-[13px] font-medium text-[#8A8A85]">{remainingLabel}</p>
      <Link
        href={href}
        onClick={() => track("tool_card_clicked", { tool: name })}
        className="mt-1 rounded-xl bg-[#0F4D4A] px-4 py-2.5 text-center text-[14px] font-semibold text-[#FBFEFD] transition-colors hover:bg-[#0B3F3C]"
      >
        Usar ferramenta
      </Link>
    </div>
  );
}
