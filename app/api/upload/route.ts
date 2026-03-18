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
  console.log("[upload] POST received");
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[upload] No autenticado");
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    console.log("[upload] user:", user.id);

    const uploadId = crypto.randomUUID();
    const uploadDir = path.join(TEMP_DIR, uploadId);
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("[upload] uploadDir:", uploadDir);

    const contentType = req.headers.get("content-type") ?? "";
    console.log("[upload] content-type:", contentType);
    const bb = busboy({ headers: { "content-type": contentType } });

    let filePath = "";
    let fileName = "";
    let fileSize = 0;
    let mimeType = "";
    let parseError: string | null = null;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const done = (err?: Error) => {
        if (settled) return;
        settled = true;
        if (err) reject(err); else resolve();
      };

      // Track both halves — only resolve when the whole body AND the file write are done
      let bbFinished = false;
      let writeFinished = !filePath; // if no file field, write is trivially done
      const tryResolve = () => { if (bbFinished && writeFinished) done(); };

      bb.on("file", (fieldname, fileStream, info) => {
        console.log("[upload] file field:", fieldname, "mime:", info.mimeType, "name:", info.filename);
        if (fieldname !== "file") { fileStream.resume(); return; }

        mimeType = info.mimeType;
        fileName = info.filename;

        if (!ALLOWED_TYPES.includes(mimeType)) {
          parseError = "Tipo de archivo inválido. Subí un video.";
          fileStream.resume();
          writeFinished = true;
          return;
        }

        filePath = path.join(uploadDir, "input.mp4");
        writeFinished = false; // reset — we now have a real write to wait for
        const writeStream = fs.createWriteStream(filePath);

        fileStream.on("data", (chunk: Buffer) => {
          fileSize += chunk.length;
          if (fileSize % (50 * 1024 * 1024) < chunk.length) {
            console.log(`[upload] received ${Math.round(fileSize / 1024 / 1024)}MB so far...`);
          }
        });
        fileStream.pipe(writeStream);
        writeStream.on("finish", () => {
          console.log("[upload] write finished, total size:", fileSize);
          writeFinished = true;
          tryResolve();
        });
        writeStream.on("error", (e) => { console.error("[upload] write error:", e); done(e); });
        fileStream.on("error", (e) => { console.error("[upload] stream error:", e); done(e); });
      });

      bb.on("error", (e: Error) => { console.error("[upload] busboy error:", e); done(e); });
      bb.on("finish", () => {
        console.log("[upload] busboy finish, filePath:", filePath);
        if (!filePath && !parseError) parseError = "No se recibió ningún archivo.";
        bbFinished = true;
        tryResolve();
      });

      // IMPORTANT: attach error handler so busboy parse/source errors don't become uncaughtExceptions
      const bodyStream = Readable.fromWeb(req.body as Parameters<typeof Readable.fromWeb>[0]);
      bodyStream.on("error", (e) => { console.error("[upload] body stream error:", e); done(e); });
      bodyStream.pipe(bb);
    });

    if (parseError) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
      return NextResponse.json({ error: parseError }, { status: 400 });
    }

    if (!filePath) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }

    console.log("[upload] running ffprobe on:", filePath);
    const duration = await getDuration(filePath);
    console.log("[upload] duration:", duration, "seconds");

    if (duration > MAX_DURATION_SECONDS) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
      return NextResponse.json(
        { error: "El video excede el máximo de 4 horas" },
        { status: 400 },
      );
    }

    const { durationMinutes, estimatedCost, estimatedTimeSeconds } = estimateCost(duration);
    console.log("[upload] success:", { durationMinutes, estimatedCost });

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
    console.error("[upload] UNHANDLED ERROR:", error);
    return NextResponse.json(
      { error: "Error al subir. Intentá de nuevo." },
      { status: 500 },
    );
  }
}

