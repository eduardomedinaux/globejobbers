import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DashboardNav } from "@/components/dashboard/nav";
import { DashboardTopBar } from "@/components/dashboard/top-bar";

/**
 * Guarda de autenticação de toda a área logada. Roda em Server Component
 * (fonte da verdade), não só no middleware — o middleware cuida apenas do
 * refresh do cookie de sessão (ver middleware.ts).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("name, plan")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.name || user.user_metadata?.full_name || user.email || "Você";
  const plan = (profile?.plan as "free" | "pro") ?? "free";

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="flex flex-col pb-16 md:pb-0 md:pl-[240px]">
        <DashboardTopBar name={name} plan={plan} />
        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
