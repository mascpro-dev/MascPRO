import { NextRequest, NextResponse } from "next/server";
import { getProDb } from "@/lib/proGestaoDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const [invRes, movRes] = await Promise.all([
    g.db
      .from("pro_inventory")
      .select("*")
      .eq("professional_id", g.userId)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    g.db
      .from("pro_inventory_movements")
      .select("id, order_id, product_id, inventory_id, quantity_delta, created_at")
      .eq("professional_id", g.userId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  if (invRes.error) {
    if (invRes.error.code === "42P01") return NextResponse.json({ ok: true, items: [], movements: [] });
    return NextResponse.json({ ok: false, error: invRes.error.message }, { status: 500 });
  }

  type MovRow = {
    id: string;
    order_id: string | null;
    product_id: string | null;
    inventory_id: string | null;
    quantity_delta: number;
    created_at: string;
  };

  let movements: {
    id: string;
    order_id: string | null;
    order_ref: string | null;
    product_title: string;
    item_name: string;
    quantity_delta: number;
    created_at: string;
  }[] = [];

  if (!movRes.error && movRes.data?.length) {
    const raw = movRes.data as MovRow[];
    const pids = [...new Set(raw.map((m) => m.product_id).filter(Boolean))] as string[];
    const iids = [...new Set(raw.map((m) => m.inventory_id).filter(Boolean))] as string[];
    let titleByPid = new Map<string, string>();
    let nameByInv = new Map<string, string>();
    if (pids.length > 0) {
      const { data: pr } = await g.db.from("products").select("id, title").in("id", pids);
      titleByPid = new Map((pr || []).map((p: { id: string; title: string }) => [p.id, p.title]));
    }
    if (iids.length > 0) {
      const { data: ir } = await g.db.from("pro_inventory").select("id, name").in("id", iids);
      nameByInv = new Map((ir || []).map((p: { id: string; name: string }) => [p.id, p.name]));
    }
    movements = raw.map((m) => ({
      id: m.id,
      order_id: m.order_id,
      order_ref: m.order_id ? `${String(m.order_id).slice(0, 8)}…` : null,
      product_title: (m.product_id && titleByPid.get(m.product_id)) || "—",
      item_name: (m.inventory_id && nameByInv.get(m.inventory_id)) || "—",
      quantity_delta: Number(m.quantity_delta),
      created_at: m.created_at,
    }));
  }

  return NextResponse.json({ ok: true, items: invRes.data || [], movements });
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
