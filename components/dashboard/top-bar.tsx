import { LogoutButton } from "@/components/dashboard/logout-button";

interface TopBarProps {
  name: string;
  plan: "free" | "pro";
}

export function DashboardTopBar({ name, plan }: TopBarProps) {
  return (
    <div className="flex items-center justify-between border-b border-[#EAEAE4] bg-white px-5 py-4 sm:px-8">
      <div>
        <p className="text-[15px] font-semibold text-[#1B1B1E]">{name}</p>
        <span className="mt-0.5 inline-block rounded-full bg-[#EAF1EF] px-2 py-0.5 text-[11.5px] font-semibold uppercase tracking-wide text-[#0F4D4A]">
          Plano {plan === "pro" ? "Pro" : "Free"}
        </span>
      </div>
      <LogoutButton />
    </div>
  );
}
