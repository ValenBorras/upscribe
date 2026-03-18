import { NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { createMPClient } from "@/app/lib/mercadopago";
import { createServiceClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { paymentId, summaryId } = await request.json();

    if (!paymentId || !summaryId) {
      return NextResponse.json(
        { error: "paymentId and summaryId required" },
        { status: 400 },
      );
    }

    const client = createMPClient();
    const paymentAPI = new Payment(client);
    const payment = await paymentAPI.get({ id: Number(paymentId) });

    if (!payment || payment.status !== "approved") {
      return NextResponse.json({
        verified: false,
        status: payment?.status ?? "unknown",
      });
    }

    // Verify external reference matches
    if (payment.external_reference !== summaryId) {
      return NextResponse.json(
        { error: "Reference mismatch" },
        { status: 400 },
      );
    }

    // Update summary status
    const serviceClient = createServiceClient();
    await serviceClient
      .from("summaries")
      .update({ status: "paid" })
      .eq("id", summaryId)
      .eq("status", "pending_payment");

    await serviceClient
      .from("payments")
      .update({ mp_payment_id: String(paymentId), status: "approved" })
      .eq("summary_id", summaryId);

    return NextResponse.json({ verified: true, status: "approved" });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 },
    );
  }
}
