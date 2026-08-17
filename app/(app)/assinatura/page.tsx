import Link from "next/link";
import { Check } from "lucide-react";
import { ViewTracker } from "@/components/analytics/view-tracker";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { getCurrentUser } from "@/lib/supabase-server";
import { getPlanStatus } from "@/lib/plan";
import { PRO_LIMITS } from "@/lib/usage";

// Preços de lançamento (decisão de 05/ago/2026): cobrança desde o início.
// Fase 3 (Stripe) liga os botões nesses valores; até lá o acesso vem de
// grant (mentoria/cupom/beta — ver pro_grants em supabase/schema.sql).
const MONTHLY_PRICE = 69;
const ANNUAL_PRICE = 588; // = R$ 49/mês, "2 meses grátis" vs 12x mensal

const FEATURES = [
  `${PRO_LIMITS.market_intel} relatórios Market Intelligence por mês (vagas reais do seu mercado)`,
  `${PRO_LIMITS.linkedin_review} LinkedIn Reviews por mês`,
  `${PRO_LIMITS.cv_tailor} CVs adaptados por vaga, com download em PDF`,
  `${PRO_LIMITS.headline} headlines otimizadas pro seu mercado-alvo`,
  `${PRO_LIMITS.networking} mensagens de networking por mês`,
  `${PRO_LIMITS.post} posts de autoridade por mês`,
  "Perfil de Mercado: suas vagas-alvo alimentando todas as ferramentas",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function AssinaturaPage() {
  const user = await getCurrentUser();
  const { plan, expiresAt } = user ? await getPlanStatus(user.id) : { plan: "free" as const, expiresAt: null };

  if (plan === "pro") {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-4">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161618]">
          Seu plano está ativo
        </h1>
        <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
          <p className="text-[15px] font-semibold text-[#0F4D4A]">GlobeJobbers Pro</p>
          {expiresAt && (
            <p className="mt-1 text-[13.5px] text-[#6E6E72]">Válido até {formatDate(expiresAt)}.</p>
          )}
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center rounded-lg bg-[#0F4D4A] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#0C403D]"
          >
            Ir pro dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-8">
      <ViewTracker event="pricing_viewed" />
      <div className="text-center">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[#161618]">
          Desbloqueie o GlobeJobbers
        </h1>
        <p className="mx-auto mt-2 max-w-[480px] text-[14.5px] leading-[1.6] text-[#6E6E72]">
          Todas as ferramentas que aproximam você da vaga internacional — perfil,
          CV, networking e autoridade — trabalhando a partir das vagas que você quer.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Mensal */}
        <div className="flex flex-col rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
            Mensal
          </p>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="text-[34px] font-semibold tracking-[-0.02em] text-[#161618]">
              R$ {MONTHLY_PRICE}
            </span>
            <span className="text-[14px] text-[#8A8A85]">/mês</span>
          </p>
          <SubscribeButton plan="monthly" variant="secondary" />
        </div>

        {/* Anual */}
        <div className="relative flex flex-col rounded-2xl border-2 border-[#0F4D4A] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
          <span className="absolute -top-3 left-6 rounded-full bg-[#0F4D4A] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            2 meses grátis
          </span>
          <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
            Anual
          </p>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="text-[34px] font-semibold tracking-[-0.02em] text-[#161618]">
              R$ {Math.round(ANNUAL_PRICE / 12)}
            </span>
            <span className="text-[14px] text-[#8A8A85]">/mês</span>
          </p>
          <p className="mt-0.5 text-[12.5px] text-[#8A8A85]">
            R$ {ANNUAL_PRICE} cobrados uma vez por ano
          </p>
          <SubscribeButton plan="annual" variant="primary" />
        </div>
      </div>

      <div className="rounded-2xl border border-[#EAEAE4] bg-white p-6 shadow-[0_1px_2px_rgba(20,20,20,0.03)]">
        <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.04em] text-[#8A8A85]">
          O que está incluído
        </p>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex gap-2 text-[13.5px] leading-[1.5] text-[#3F3F43]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0F4D4A]" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-[#D8E5E2] bg-[#F4F8F7] p-6">
        <p className="text-[14.5px] font-semibold text-[#0F4D4A]">
          Comprou a mentoria ou recebeu um convite?
        </p>
        <p className="mt-1.5 text-[13.5px] leading-[1.6] text-[#3F3F43]">
          Seu acesso Pro é liberado automaticamente: basta entrar no GlobeJobbers
          com o mesmo e-mail da compra (ou do convite). Se você já está logado com
          outro e-mail, saia e entre de novo com o e-mail certo. Não funcionou?
          Fale com a gente que resolvemos na hora.
        </p>
      </div>
    </div>
  );
}
