import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveEffectivePlan } from "@/lib/plan";
import { DashboardNav } from "@/components/dashboard/nav";
import { AppHeader } from "@/components/dashboard/app-header";

/**
 * Guarda de autenticação de toda a área logada. Roda em Server Component
 * (fonte da verdade), não só no middleware — o middleware cuida apenas do
 * refresh do cookie de sessão (ver middleware.ts).
 *
 * Distribuição (padrão Didomi): AppHeader full-width no topo (logo + ajuda +
 * "Minha conta"); sidebar abaixo do header; conteúdo à direita da sidebar.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("name, plan, plan_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.name || user.user_metadata?.full_name || user.email || "Você";
  // Plano EFETIVO: pro expirado exibe (e vale) como free — ver lib/plan.ts.
  const { plan } = resolveEffectivePlan(profile?.plan, profile?.plan_expires_at);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader name={name} plan={plan} />
      <DashboardNav />
      <div className="flex flex-col pb-16 md:pb-0 md:pl-[240px]">
        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
