import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { JoinWaitlistButton } from "@/components/account/join-waitlist-button";

export default async function AccountPage() {
  const user = await getCurrentUser();
  const admin = getSupabaseAdmin();
  const { data: profile } = user
    ? await admin.from("profiles").select("name, email, avatar_url, plan").eq("id", user.id).maybeSingle()
    : { data: null };

  const name = profile?.name || user?.user_metadata?.full_name || "Você";
  const email = profile?.email || user?.email || "";
  const plan = (profile?.plan as "free" | "pro" | undefined) ?? "free";

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
              Plano {plan === "pro" ? "Pro" : "Free"}
            </p>
            <p className="mt-0.5 text-[13px] text-[#6E6E72]">
              {plan === "pro"
                ? "Análises ilimitadas."
                : "3 headlines, 2 CV Tailors e 1 LinkedIn Review por mês."}
            </p>
          </div>
        </div>
        {plan !== "pro" && (
          <div className="mt-4">
            <JoinWaitlistButton />
          </div>
        )}
      </div>

      <div>
        <LogoutButton />
      </div>
    </div>
  );
}
