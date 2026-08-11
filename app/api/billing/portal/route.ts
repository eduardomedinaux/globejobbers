import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createPortalSession } from "@/lib/stripe";

/** Customer Portal do Stripe: trocar cartão, cancelar, ver faturas. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login de novo." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id as string | null;
  if (!customerId) {
    return NextResponse.json(
      { error: "Você ainda não tem uma assinatura ativa pelo cartão." },
      { status: 400 },
    );
  }

  try {
    const { url } = await createPortalSession(customerId, request.nextUrl.origin);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("BILLING_PORTAL_FAILED", { userId: user.id, error: String(error) });
    return NextResponse.json(
      { error: "Não foi possível abrir o portal agora. Tente novamente em instantes." },
      { status: 502 },
    );
  }
}
