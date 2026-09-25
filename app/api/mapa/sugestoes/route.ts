import { NextRequest, NextResponse } from "next/server";
import { sugerirLocais } from "@/lib/mapaSaloes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = String(req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ sugestoes: [] });
  const sugestoes = await sugerirLocais(q);
  return NextResponse.json({ sugestoes });
}
