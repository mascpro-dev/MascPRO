import { NextRequest, NextResponse } from "next/server";
import { getProDb } from "@/lib/proGestaoDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { data, error } = await g.db
    .from("pro_staff")
    .select("id, name, role_label, active, sort_order, created_at")
    .eq("owner_id", g.userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error?.code === "42P01") {
    return NextResponse.json({ ok: true, staff: [] });
  }
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, staff: data || [] });
}

export async function POST(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Nome do profissional obrigatorio." }, { status: 400 });
  }
  const role_label = body.role_label != null ? String(body.role_label).trim() || null : null;
  const sort_order = Number(body.sort_order);
  const row = {
    owner_id: g.userId,
    name,
    role_label,
    active: body.active === false ? false : true,
    sort_order: Number.isFinite(sort_order) ? sort_order : 0,
  };

  const { data, error } = await g.db.from("pro_staff").insert(row).select().single();
  if (error?.code === "42P01") {
    return NextResponse.json(
      { ok: false, error: "Execute o SQL pro_staff.sql no Supabase para habilitar a equipe." },
      { status: 503 }
    );
  }
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, member: data });
}

export async function PATCH(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const body = await req.json();
  const id = body.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ ok: false, error: "id obrigatorio" }, { status: 400 });
  }

  const campos: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const n = String(body.name || "").trim();
    if (n.length < 2) return NextResponse.json({ ok: false, error: "Nome invalido" }, { status: 400 });
    campos.name = n;
  }
  if (body.role_label !== undefined) {
    campos.role_label = String(body.role_label || "").trim() || null;
  }
  if (body.active !== undefined) campos.active = Boolean(body.active);
  if (body.sort_order !== undefined) {
    const s = Number(body.sort_order);
    if (Number.isFinite(s)) campos.sort_order = s;
  }

  if (Object.keys(campos).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para atualizar" }, { status: 400 });
  }

  const { error } = await g.db.from("pro_staff").update(campos).eq("id", id).eq("owner_id", g.userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
