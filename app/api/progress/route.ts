import { NextResponse } from "next/server";
import { getProgress } from "@/app/lib/progress";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const summaryId = searchParams.get("summaryId");

  if (!summaryId) {
    return NextResponse.json({ error: "summaryId required" }, { status: 400 });
  }

  return NextResponse.json(getProgress(summaryId));
}
