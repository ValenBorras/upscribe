import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient, createServiceClient } from "@/app/lib/supabase/server";

const BUCKET = "videos";
const MAX_CHUNKS = 300; // 300 × 40 MB = 12 GB max

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { fileName, chunkCount } = await req.json();
    const count = Math.min(Math.max(1, Number(chunkCount) || 1), MAX_CHUNKS);
    const sessionId = crypto.randomUUID();

    const serviceClient = createServiceClient();
    await serviceClient.storage.createBucket(BUCKET, { public: false }).catch(() => {});

    const chunks: { path: string; signedUrl: string }[] = [];
    for (let i = 0; i < count; i++) {
      const chunkPath = `${user.id}/${sessionId}/chunk_${String(i).padStart(4, "0")}.bin`;
      const { data, error } = await serviceClient.storage
        .from(BUCKET)
        .createSignedUploadUrl(chunkPath);
      if (error || !data) {
        console.error(`[get-upload-url] chunk ${i} error:`, error);
        return NextResponse.json({ error: "Error al crear URL de subida" }, { status: 500 });
      }
      chunks.push({ path: chunkPath, signedUrl: data.signedUrl });
    }

    return NextResponse.json({ sessionId, chunks });
  } catch (err) {
    console.error("[get-upload-url] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
