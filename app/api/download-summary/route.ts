import { NextResponse } from "next/server";
import { markdownToPdf } from "@/app/lib/pdf";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { data: summary } = await supabase
    .from("summaries")
    .select("summary_markdown, title, user_id")
    .eq("id", id)
    .single();

  if (!summary || summary.user_id !== user.id) {
    return NextResponse.json({ error: "Resumen no encontrado" }, { status: 404 });
  }

  if (!summary.summary_markdown) {
    return NextResponse.json({ error: "El resumen aún no está listo" }, { status: 400 });
  }

  try {
    const pdfBuffer = await markdownToPdf(summary.summary_markdown);
    const safeName = summary.title.replace(/[^a-zA-Z0-9\s-]/g, "").trim();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Error al generar el PDF" },
      { status: 500 },
    );
  }
}
