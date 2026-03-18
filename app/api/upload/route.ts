import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getDuration } from "@/app/lib/ffmpeg";
import { estimateCost } from "@/app/lib/cost";
import { createClient } from "@/app/lib/supabase/server";

const TEMP_DIR = path.join(process.cwd(), "temp");
const MAX_DURATION_SECONDS = 4 * 3600; // 4 hours

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const uploadId = crypto.randomUUID();
    const uploadDir = path.join(TEMP_DIR, uploadId);
    fs.mkdirSync(uploadDir, { recursive: true });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo inválido. Subí un video." },
        { status: 400 },
      );
    }

    const filePath = path.join(uploadDir, "input.mp4");
    const bytes = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(bytes));

    const duration = await getDuration(filePath);

    if (duration > MAX_DURATION_SECONDS) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
      return NextResponse.json(
        { error: "El video excede el máximo de 4 horas" },
        { status: 400 },
      );
    }

    const { durationMinutes, estimatedCost, estimatedTimeSeconds } =
      estimateCost(duration);

    return NextResponse.json({
      success: true,
      filePath,
      duration,
      durationMinutes,
      estimatedCost,
      estimatedTimeSeconds,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error al subir. Intentá de nuevo." },
      { status: 500 },
    );
  }
}
