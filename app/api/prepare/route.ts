import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { segmentVideo } from "@/app/lib/ffmpeg";
import { createClient, createServiceClient } from "@/app/lib/supabase/server";

const TEMP_DIR = path.join(process.cwd(), "temp");
const BUCKET = "videos";

export async function POST(req: NextRequest) {
  console.log("[prepare] POST received");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { chunkPaths, summaryId } = await req.json();

    if (!Array.isArray(chunkPaths) || chunkPaths.length === 0 || !summaryId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // Validate all chunk paths belong to this user
    if (
      !chunkPaths.every(
        (p: unknown) => typeof p === "string" && p.startsWith(user.id + "/"),
      )
    ) {
      return NextResponse.json({ error: "Paths inválidos" }, { status: 403 });
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

    const serviceClient = createServiceClient();

    await serviceClient
      .from("summaries")
      .update({ status: "transcribing" })
      .eq("id", summaryId);

    // Download all chunks from Supabase Storage and concatenate into one file.
    // Each chunk is raw bytes (file.slice) so simple concatenation reconstructs
    // the original file perfectly.
    const uploadDir = path.join(TEMP_DIR, summaryId);
    fs.mkdirSync(uploadDir, { recursive: true });
    const localPath = path.join(uploadDir, "input.mp4");

    for (let i = 0; i < chunkPaths.length; i++) {
      console.log(`[prepare] downloading chunk ${i + 1}/${chunkPaths.length}`);
      const { data: signedData, error: signedError } = await serviceClient.storage
        .from(BUCKET)
        .createSignedUrl(chunkPaths[i], 600);

      if (signedError || !signedData) {
        throw new Error(`No signed URL for chunk ${i}: ${signedError?.message}`);
      }

      const resp = await fetch(signedData.signedUrl);
      if (!resp.ok || !resp.body) {
        throw new Error(`Chunk ${i} download failed: ${resp.status}`);
      }

      // First chunk creates the file; subsequent chunks append
      await pipeline(
        Readable.fromWeb(resp.body as Parameters<typeof Readable.fromWeb>[0]),
        fs.createWriteStream(localPath, { flags: i === 0 ? "w" : "a" }),
      );
    }

    console.log("[prepare] all chunks concatenated, deleting from Supabase Storage...");
    await serviceClient.storage.from(BUCKET).remove(chunkPaths);
    console.log("[prepare] Storage cleared, running ffmpeg segment...");

    const chunks = await segmentVideo(localPath);
    console.log("[prepare] segmented into", chunks.length, "chunks");

    return NextResponse.json({
      success: true,
      chunks,
      totalChunks: chunks.length,
    });
  } catch (error) {
    console.error("[prepare] error:", error);
    return NextResponse.json(
      { error: "Error al preparar el video" },
      { status: 500 },
    );
  }
}

