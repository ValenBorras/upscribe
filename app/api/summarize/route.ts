import { NextRequest, NextResponse } from "next/server";
import { generateSummary } from "@/app/lib/summarize";
import { createClient, createServiceClient } from "@/app/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { summaryId } = await req.json();
    if (!summaryId) {
      return NextResponse.json({ error: "summaryId required" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Get summary with transcript
    const { data: summary } = await serviceClient
      .from("summaries")
      .select("transcript_text, user_id")
      .eq("id", summaryId)
      .single();

    if (!summary || summary.user_id !== user.id) {
      return NextResponse.json({ error: "Resumen no encontrado" }, { status: 404 });
    }

    if (!summary.transcript_text) {
      return NextResponse.json(
        { error: "No hay transcripción disponible" },
        { status: 400 },
      );
    }

    // Update status
    await serviceClient
      .from("summaries")
      .update({ status: "summarizing" })
      .eq("id", summaryId);

    // Generate summary
    const { markdown, inputTokens, outputTokens } = await generateSummary(
      summary.transcript_text,
    );

    // Save to database
    await serviceClient
      .from("summaries")
      .update({
        summary_markdown: markdown,
        status: "completed",
      })
      .eq("id", summaryId);

    // Track token usage
    const costPerInputToken = 0.0000025; // gpt-4o input
    const costPerOutputToken = 0.00001; // gpt-4o output
    const estimatedCostUsd =
      inputTokens * costPerInputToken + outputTokens * costPerOutputToken;

    await serviceClient.from("token_usage").insert({
      user_id: user.id,
      summary_id: summaryId,
      operation: "summarization",
      model: "gpt-4o",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: estimatedCostUsd,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Summary error:", error);
    return NextResponse.json(
      { error: "Error al generar el resumen." },
      { status: 500 },
    );
  }
}
