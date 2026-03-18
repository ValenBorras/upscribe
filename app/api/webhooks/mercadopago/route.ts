import { NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { createMPClient } from "@/app/lib/mercadopago";
import { createServiceClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    const serviceClient = createServiceClient();
    const client = createMPClient();

    // Handle payment notifications
    if (type === "payment" && data?.id) {
      const paymentAPI = new Payment(client);
      const payment = await paymentAPI.get({ id: data.id });

      if (!payment) {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }

      const externalRef = payment.external_reference;
      const status = payment.status; // approved, rejected, pending, etc.

      if (status === "approved" && externalRef) {
        // Update payment record
        await serviceClient
          .from("payments")
          .update({
            mp_payment_id: String(data.id),
            status: "approved",
          })
          .eq("summary_id", externalRef);

        // Update summary status to "paid"
        await serviceClient
          .from("summaries")
          .update({ status: "paid" })
          .eq("id", externalRef)
          .eq("status", "pending_payment");
      } else if (status === "rejected" && externalRef) {
        await serviceClient
          .from("payments")
          .update({
            mp_payment_id: String(data.id),
            status: "rejected",
          })
          .eq("summary_id", externalRef);
      }
    }

    // Handle subscription notifications
    if (type === "subscription_preapproval" && data?.id) {
      // Fetch preapproval details — use fetch since SDK may not expose this
      const res = await fetch(
        `https://api.mercadopago.com/preapproval/${data.id}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          },
        },
      );
      const preapproval = await res.json();

      if (preapproval.status === "authorized") {
        const userId = preapproval.external_reference;

        await serviceClient
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_id: String(data.id),
          })
          .eq("id", userId);

        await serviceClient
          .from("payments")
          .update({ status: "approved" })
          .eq("mp_preapproval_id", String(data.id));
      } else if (preapproval.status === "cancelled") {
        const userId = preapproval.external_reference;

        await serviceClient
          .from("profiles")
          .update({
            subscription_status: "cancelled",
            subscription_id: null,
          })
          .eq("id", userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
