import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { createMPClient } from "@/app/lib/mercadopago";
import { createClient } from "@/app/lib/supabase/server";

const SINGLE_PRICE = 5000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { summaryId } = await request.json();
  if (!summaryId) {
    return NextResponse.json(
      { error: "summaryId es requerido" },
      { status: 400 },
    );
  }

  // Verify summary belongs to user
  const { data: summary } = await supabase
    .from("summaries")
    .select("id, title, user_id")
    .eq("id", summaryId)
    .single();

  if (!summary || summary.user_id !== user.id) {
    return NextResponse.json(
      { error: "Resumen no encontrado" },
      { status: 404 },
    );
  }

  const client = createMPClient();
  const preference = new Preference(client);

  const appUrl = process.env.NEXT_PUBLIC_URL ?? "";
  const isSandbox = process.env.MP_SANDBOX === "true";

  const result = await preference.create({
    body: {
      items: [
        {
          id: `summary-${summaryId}`,
          title: `Resumen: ${summary.title}`,
          unit_price: SINGLE_PRICE,
          quantity: 1,
          currency_id: "ARS",
        },
      ],
      payer: { email: user.email ?? "" },
      back_urls: {
        success: `${appUrl}/payment/success`,
        failure: `${appUrl}/payment/failure`,
        pending: `${appUrl}/payment/pending`,
      },
      // auto_return requires public (non-localhost) back_urls — omit in local dev
      ...(isSandbox ? {} : { auto_return: "approved" as const }),
      ...(isSandbox ? {} : { notification_url: `${appUrl}/api/webhooks/mercadopago` }),
      external_reference: summaryId,
      metadata: {
        user_id: user.id,
        summary_id: summaryId,
      },
    },
  });

  // Save payment record
  await supabase.from("payments").insert({
    user_id: user.id,
    summary_id: summaryId,
    mp_preference_id: result.id ?? null,
    type: "single" as const,
    amount: SINGLE_PRICE,
    currency: "ARS",
    status: "pending" as const,
  });

  // Use sandbox checkout URL for local dev (test accounts only work on sandbox)
  const checkoutUrl = isSandbox
    ? (result.sandbox_init_point ?? result.init_point)
    : result.init_point;

  return NextResponse.json({ init_point: checkoutUrl });
}
