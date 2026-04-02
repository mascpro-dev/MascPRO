import { NextRequest, NextResponse } from "next/server";
import { getProDb } from "@/lib/proGestaoDb";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { data, error } = await g.db
    .from("pro_charges")
    .select("*")
    .eq("professional_id", g.userId)
    .order("charge_date", { ascending: false });

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ ok: true, charges: [] });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, charges: data || [] });
}

export async function POST(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { client_name, client_phone, description, amount, charge_date } = await req.json();
  if (!client_name || amount == null || !charge_date) {
    return NextResponse.json(
      { ok: false, error: "Nome do cliente, valor e data sao obrigatorios" },
      { status: 400 }
    );
  }

  const { data, error } = await g.db
    .from("pro_charges")
    .insert({
      professional_id: g.userId,
      client_name: String(client_name).trim(),
      client_phone: client_phone || null,
      description: description || null,
      amount: Number(amount),
      paid: false,
      charge_date,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, charge: data });
}

export async function PATCH(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { id, ...campos } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatorio" }, { status: 400 });

  const { error } = await g.db
    .from("pro_charges")
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
    .from("pro_charges")
    .delete()
    .eq("id", id)
    .eq("professional_id", g.userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
