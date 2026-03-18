import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { transcribeChunk } from "@/app/lib/transcribe";
import { createClient, createServiceClient } from "@/app/lib/supabase/server";

const TEMP_DIR = path.join(process.cwd(), "temp");

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { chunkPath, chunkIndex, totalChunks, summaryId } = await req.json();

    if (!chunkPath || chunkIndex === undefined || !summaryId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // Validate path is within temp dir
    const resolvedPath = path.resolve(chunkPath);
    if (!resolvedPath.startsWith(TEMP_DIR) || !fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: "Chunk no encontrado" }, { status: 404 });
    }

    // Verify summary belongs to this user
    const { data: summary } = await supabase
      .from("summaries")
      .select("id, user_id")
      .eq("id", summaryId)
      .eq("user_id", user.id)
      .single();

    if (!summary) {
      return NextResponse.json({ error: "Resumen no encontrado" }, { status: 404 });
    }

    // Transcribe this single chunk — takes 30-90 seconds, well within timeout
    const text = await transcribeChunk(resolvedPath);

    // Track token usage for this chunk
    const serviceClient = createServiceClient();
    const chunkDurationSeconds = 600; // ~10 min per chunk
    const costUsd = (chunkDurationSeconds / 60) * 0.006;
    await serviceClient.from("token_usage").insert({
      user_id: user.id,
      summary_id: summaryId,
      operation: "transcription",
      model: "gpt-4o-transcribe",
      input_tokens: 0,
      output_tokens: 0,
      audio_duration_seconds: chunkDurationSeconds,
      estimated_cost_usd: costUsd,
    });

    return NextResponse.json({
      success: true,
      chunkIndex,
      text,
    });
  } catch (error) {
    console.error("Transcribe chunk error:", error);
    return NextResponse.json(
      { error: "Error al transcribir. Intentá de nuevo." },
      { status: 500 },
    );
  }
}
