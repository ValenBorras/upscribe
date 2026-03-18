import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { segmentVideo } from "@/app/lib/ffmpeg";
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
    const { filePath, summaryId } = await req.json();

    if (!filePath || !summaryId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // Validate file path is within temp dir
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(TEMP_DIR) || !fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
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

    // Update status
    const serviceClient = createServiceClient();
    await serviceClient
      .from("summaries")
      .update({ status: "transcribing" })
      .eq("id", summaryId);

    // Split video into segments — fast because it just copies streams
    const chunks = await segmentVideo(resolvedPath);

    return NextResponse.json({
      success: true,
      chunks,
      totalChunks: chunks.length,
    });
  } catch (error) {
    console.error("Prepare error:", error);
    return NextResponse.json(
      { error: "Error al preparar el video" },
      { status: 500 },
    );
  }
}
