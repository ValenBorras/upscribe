import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { createClient } from "@/app/lib/supabase/server";

const OUTPUT_DIR = path.join(process.cwd(), "output");

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Tipo de archivo inválido. Subí un archivo .txt." },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const content = Buffer.from(bytes).toString("utf-8");

    // Save temporarily (will be read by summarize route)
    const outputPath = path.join(OUTPUT_DIR, "transcript.txt");
    fs.writeFileSync(outputPath, content, "utf-8");

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      transcriptContent: content,
    });
  } catch (error) {
    console.error("Transcript upload error:", error);
    return NextResponse.json(
      { error: "Error al subir. Intentá de nuevo." },
      { status: 500 },
    );
  }
}
