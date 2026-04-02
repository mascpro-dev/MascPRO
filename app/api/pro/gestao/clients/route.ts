import { NextRequest, NextResponse } from "next/server";
import { getProDb } from "@/lib/proGestaoDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { data, error } = await g.db
    .from("pro_clients")
    .select("*")
    .eq("professional_id", g.userId)
    .order("name");

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ ok: true, clients: [] });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, clients: data || [] });
}

export async function POST(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { name, phone, birthday, notes } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ ok: false, error: "Nome obrigatorio" }, { status: 400 });
  }

  const { data, error } = await g.db
    .from("pro_clients")
    .insert({
      professional_id: g.userId,
      name: name.trim(),
      phone: phone || null,
      birthday: birthday || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, client: data });
}

export async function PATCH(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { id, ...campos } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatorio" }, { status: 400 });

  const { error } = await g.db
    .from("pro_clients")
    .update(campos)
    .eq("id", id)
    .eq("professional_id", g.userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { id } = await req.json();
  const { error } = await g.db
    .from("pro_clients")
    .delete()
    .eq("id", id)
    .eq("professional_id", g.userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
