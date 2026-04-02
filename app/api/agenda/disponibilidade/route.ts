import { NextRequest, NextResponse } from "next/server";
import { getProDb } from "@/lib/proGestaoDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { data, error } = await g.db
    .from("availability")
    .select("*")
    .eq("professional_id", g.userId)
    .order("day_of_week");

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ ok: true, disponibilidade: [] });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, disponibilidade: data || [] });
}

export async function POST(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { dias } = await req.json();
  if (!Array.isArray(dias)) {
    return NextResponse.json({ ok: false, error: "dias obrigatorio (array)" }, { status: 400 });
  }

  await g.db.from("availability").delete().eq("professional_id", g.userId);

  if (dias.length > 0) {
    const rows = dias.map((d: Record<string, unknown>) => ({
      ...d,
      professional_id: g.userId,
    }));
    const { error } = await g.db.from("availability").insert(rows);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
