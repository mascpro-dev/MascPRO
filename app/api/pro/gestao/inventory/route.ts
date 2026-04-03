import { NextRequest, NextResponse } from "next/server";
import { getProDb } from "@/lib/proGestaoDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { data, error } = await g.db
    .from("pro_inventory")
    .select("*")
    .eq("professional_id", g.userId)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ ok: true, items: [] });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, items: data || [] });
}

export async function POST(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const body = await req.json();
  const { name, category, quantity, unit, min_quantity, notes } = body;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ ok: false, error: "Nome obrigatorio" }, { status: 400 });
  }

  const { data, error } = await g.db
    .from("pro_inventory")
    .insert({
      professional_id: g.userId,
      name: name.trim(),
      category: typeof category === "string" && category.trim() ? category.trim() : "outros",
      quantity: quantity != null ? Number(quantity) : 0,
      unit: typeof unit === "string" && unit.trim() ? unit.trim() : "un",
      min_quantity: min_quantity != null && min_quantity !== "" ? Number(min_quantity) : null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}

export async function PATCH(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { id, ...campos } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatorio" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (campos.name !== undefined) update.name = String(campos.name).trim();
  if (campos.category !== undefined) update.category = String(campos.category || "outros");
  if (campos.quantity !== undefined) update.quantity = Number(campos.quantity);
  if (campos.unit !== undefined) update.unit = String(campos.unit || "un");
  if (campos.min_quantity !== undefined) {
    update.min_quantity = campos.min_quantity === null || campos.min_quantity === "" ? null : Number(campos.min_quantity);
  }
  if (campos.notes !== undefined) update.notes = campos.notes;

  const { error } = await g.db
    .from("pro_inventory")
    .update(update)
    .eq("id", id)
    .eq("professional_id", g.userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { id } = await req.json();
  const { error } = await g.db.from("pro_inventory").delete().eq("id", id).eq("professional_id", g.userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
