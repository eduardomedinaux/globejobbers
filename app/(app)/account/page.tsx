import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { resolveEffectivePlan } from "@/lib/plan";
import { PRO_LIMITS } from "@/lib/usage";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function AccountPage() {
  const user = await getCurrentUser();
  const admin = getSupabaseAdmin();
  const { data: profile } = user
    ? await admin
        .from("profiles")
        .select("name, email, avatar_url, plan, plan_expires_at, stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const name = profile?.name || user?.user_metadata?.full_name || "Você";
  const email = profile?.email || user?.email || "";
  // Plano EFETIVO: pro expirado exibe (e vale) como free — ver lib/plan.ts.
  const { plan, expiresAt } = resolveEffectivePlan(profile?.plan, profile?.plan_expires_at);

  // Degustação: free = 1 uso de cada ferramenta (ver lib/usage.ts).
  const planDescription =
    plan === "pro"
      ? `${PRO_LIMITS.headline} headlines, ${PRO_LIMITS.cv_tailor} CV Tailors e ${PRO_LIMITS.linkedin_review} LinkedIn Reviews por mês.`
      : "Degustação gratuita: 1 uso de cada ferramenta. Assine pra liberar os limites completos.";

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161618]">Account</h1>
        <p className="mt-1 text-[14.5px] text-[#6E6E72]">Suas informações de conta.</p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF1EF] text-[18px] font-semibold text-[#0F4D4A]">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <p className="text-[16px] font-semibold text-[#1B1B1E]">{name}</p>
          <p className="text-[13.5px] text-[#6E6E72]">{email}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14.5px] font-semibold text-[#1B1B1E]">
              {plan === "pro" ? "Plano Pro" : "Degustação gratuita"}
            </p>
            <p className="mt-0.5 text-[13px] text-[#6E6E72]">{planDescription}</p>
            {plan === "pro" && expiresAt && (
              <p className="mt-1 text-[12.5px] text-[#8A8A85]">
                Válido até {formatDate(expiresAt)}.
              </p>
            )}
          </div>
        </div>
        {plan !== "pro" && (
          <div className="mt-4">
            <Link
              href="/assinatura"
              className="inline-flex items-center rounded-lg bg-[#0F4D4A] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#0C403D]"
            >
              Ver planos
            </Link>
          </div>
        )}
        {/* Quem assina pelo Stripe gerencia por lá (cartão, cancelamento, faturas). */}
        {profile?.stripe_customer_id && (
          <div className="mt-4">
            <ManageSubscriptionButton />
          </div>
        )}
      </div>

      <div>
        <LogoutButton />
      </div>
    </div>
  );
}
