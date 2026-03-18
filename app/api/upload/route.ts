import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Readable } from "stream";
import busboy from "busboy";
import { getDuration } from "@/app/lib/ffmpeg";
import { estimateCost } from "@/app/lib/cost";
import { createClient } from "@/app/lib/supabase/server";

const TEMP_DIR = path.join(process.cwd(), "temp");
const MAX_DURATION_SECONDS = 4 * 3600; // 4 hours
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];

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

    // Stream the multipart body directly to disk — never buffer the whole video in RAM
    const contentType = req.headers.get("content-type") ?? "";
    const bb = busboy({ headers: { "content-type": contentType } });

    let filePath = "";
    let fileName = "";
    let fileSize = 0;
    let mimeType = "";
    let parseError: string | null = null;

    await new Promise<void>((resolve, reject) => {
      bb.on("file", (fieldname, fileStream, info) => {
        if (fieldname !== "file") { fileStream.resume(); return; }

        mimeType = info.mimeType;
        fileName = info.filename;

        if (!ALLOWED_TYPES.includes(mimeType)) {
          parseError = "Tipo de archivo inválido. Subí un video.";
          fileStream.resume();
          resolve();
          return;
        }

        filePath = path.join(uploadDir, "input.mp4");
        const writeStream = fs.createWriteStream(filePath);

        fileStream.on("data", (chunk: Buffer) => { fileSize += chunk.length; });
        fileStream.pipe(writeStream);
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
        fileStream.on("error", reject);
      });

      bb.on("error", reject);
      bb.on("finish", () => {
        if (!filePath && !parseError) parseError = "No se recibió ningún archivo.";
        resolve();
      });

      // Pipe the web-streams request body into busboy
      Readable.fromWeb(req.body as Parameters<typeof Readable.fromWeb>[0]).pipe(bb);
    });

    if (parseError) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
      return NextResponse.json({ error: parseError }, { status: 400 });
    }

    if (!filePath) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }

    const duration = await getDuration(filePath);

    if (duration > MAX_DURATION_SECONDS) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
      return NextResponse.json(
        { error: "El video excede el máximo de 4 horas" },
        { status: 400 },
      );
    }

    const { durationMinutes, estimatedCost, estimatedTimeSeconds } = estimateCost(duration);

    return NextResponse.json({
      success: true,
      filePath,
      duration,
      durationMinutes,
      estimatedCost,
      estimatedTimeSeconds,
      fileName,
      fileSize,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error al subir. Intentá de nuevo." },
      { status: 500 },
    );
  }
}

