import { NextRequest, NextResponse } from "next/server";
import { estimateCost } from "@/app/lib/cost";
import { createClient } from "@/app/lib/supabase/server";

const MAX_DURATION_SECONDS = 4 * 3600;

/**
 * Finalize step: called after all chunks are uploaded to Supabase Storage.
 * Duration is read by the browser from the video element — no ffprobe needed,
 * no video body passes through Railway.
 */
export async function POST(req: NextRequest) {
  console.log("[upload/finalize] POST received");
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { chunkPaths, fileName, fileSize, duration } = await req.json();

    if (
      !Array.isArray(chunkPaths) ||
      chunkPaths.length === 0 ||
      !chunkPaths.every(
        (p: unknown) => typeof p === "string" && p.startsWith(user.id + "/"),
      )
    ) {
      return NextResponse.json({ error: "Paths inválidos" }, { status: 400 });
    }

    if (typeof duration !== "number" || duration <= 0) {
      return NextResponse.json({ error: "Duración inválida" }, { status: 400 });
    }

    if (duration > MAX_DURATION_SECONDS) {
      return NextResponse.json(
        { error: "El video excede el máximo de 4 horas" },
        { status: 400 },
      );
    }

    const { durationMinutes, estimatedCost, estimatedTimeSeconds } = estimateCost(duration);
    console.log("[upload/finalize] ok — chunks:", chunkPaths.length, "duration:", duration);

    return NextResponse.json({
      success: true,
      chunkPaths,
      duration,
      durationMinutes,
      estimatedCost,
      estimatedTimeSeconds,
      fileName: fileName ?? "",
      fileSize: fileSize ?? 0,
    });
  } catch (error) {
    console.error("[upload/finalize] UNHANDLED ERROR:", error);
    return NextResponse.json(
      { error: "Error al procesar. Intentá de nuevo." },
      { status: 500 },
    );
  }
}
