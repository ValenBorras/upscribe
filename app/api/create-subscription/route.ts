import { NextResponse } from "next/server";
import { PreApproval } from "mercadopago";
import { createMPClient } from "@/app/lib/mercadopago";
import { createClient } from "@/app/lib/supabase/server";

const SUBSCRIPTION_PRICE = 30000;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const client = createMPClient();
  const preapproval = new PreApproval(client);

  const appUrl = process.env.NEXT_PUBLIC_URL ?? "";
  const isSandbox = process.env.MP_SANDBOX === "true";

  const result = await preapproval.create({
    body: {
      reason: "UP-Scribe Suscripción Mensual",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: SUBSCRIPTION_PRICE,
        currency_id: "ARS",
      },
      back_url: `${appUrl}/payment/success?type=subscription`,
      payer_email: user.email ?? "",
      external_reference: user.id,
    },
  });

  // Save payment record
  await supabase.from("payments").insert({
    user_id: user.id,
    mp_preapproval_id: result.id ?? null,
    type: "subscription" as const,
    amount: SUBSCRIPTION_PRICE,
    currency: "ARS",
    status: "pending" as const,
  });

  // Use sandbox checkout URL for local dev (test accounts only work on sandbox)
  const resultAny = result as unknown as Record<string, unknown>;
  const checkoutUrl = isSandbox
    ? ((resultAny.sandbox_init_point as string | undefined) ?? result.init_point)
    : result.init_point;

  return NextResponse.json({ init_point: checkoutUrl });
}
