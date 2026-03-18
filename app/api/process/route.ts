import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { convertToMp3, chunkAudio } from "@/app/lib/ffmpeg";
import { transcribeChunksParallel } from "@/app/lib/transcribe";
import { setProgress, resetProgress, clearProgress } from "@/app/lib/progress";
import { createClient, createServiceClient } from "@/app/lib/supabase/server";

const PARALLEL_CONCURRENCY = 3; // Conservative for shared hosting

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let summaryId = "";

  try {
    const body = await req.json();
    const { filePath, summaryId: sid } = body;
    summaryId = sid;

    if (!filePath || typeof filePath !== "string" || !summaryId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Validate the file path is within the temp directory
    const tempDir = path.join(process.cwd(), "temp");
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(tempDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Update summary status
    const serviceClient = createServiceClient();
    await serviceClient
      .from("summaries")
      .update({ status: "transcribing" })
      .eq("id", summaryId);

    resetProgress(summaryId);

    // Step 1: Convert to MP3
    setProgress(summaryId, { status: "Convirtiendo video a audio...", progress: 5 });
    const mp3Path = await convertToMp3(resolvedPath);

    // Step 2: Chunk audio
    setProgress(summaryId, { status: "Dividiendo audio en partes...", progress: 15 });
    const chunks = await chunkAudio(mp3Path);
    const totalChunks = chunks.length;

    setProgress(summaryId, { totalChunks });

    // Step 3: Transcribe chunks in parallel
    setProgress(summaryId, {
      status: `Transcribiendo ${totalChunks} partes...`,
      currentChunk: 0,
      progress: 15,
    });

    const results = await transcribeChunksParallel(
      chunks,
      PARALLEL_CONCURRENCY,
      (completedCount) => {
        setProgress(summaryId, {
          status: `Transcrito ${completedCount} de ${totalChunks} partes...`,
          currentChunk: completedCount,
          progress: 15 + Math.round((completedCount / totalChunks) * 80),
        });
      },
    );

    const fullTranscript = results.join("\n\n").trim();

    // Step 4: Save transcript to database
    setProgress(summaryId, { status: "Guardando transcripción...", progress: 98 });

    await serviceClient
      .from("summaries")
      .update({ transcript_text: fullTranscript })
      .eq("id", summaryId);

    // Track token usage for transcription (estimated by audio duration)
    const durationSeconds = chunks.length * 600; // ~10min per chunk
    const transcriptionCostUsd = (durationSeconds / 60) * 0.006;
    await serviceClient.from("token_usage").insert({
      user_id: user.id,
      summary_id: summaryId,
      operation: "transcription",
      model: "gpt-4o-transcribe",
      input_tokens: 0,
      output_tokens: 0,
      audio_duration_seconds: durationSeconds,
      estimated_cost_usd: transcriptionCostUsd,
    });

    // Step 5: Cleanup temp files for this upload
    const uploadDir = path.dirname(resolvedPath);
    if (uploadDir.startsWith(tempDir) && uploadDir !== tempDir) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }

    setProgress(summaryId, {
      status: "complete",
      progress: 100,
      currentChunk: totalChunks,
      totalChunks,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Processing error:", error);
    if (summaryId) {
      setProgress(summaryId, { status: "error", progress: 0 });
      const serviceClient = createServiceClient();
      await serviceClient
        .from("summaries")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Processing failed",
        })
        .eq("id", summaryId);
    }
    return NextResponse.json(
      { error: "Error durante el procesamiento." },
      { status: 500 },
    );
  } finally {
    if (summaryId) {
      // Clean progress after a delay
      setTimeout(() => clearProgress(summaryId), 60000);
    }
  }
}
