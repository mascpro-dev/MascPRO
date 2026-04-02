import { NextRequest, NextResponse } from "next/server";
import { getProDb, ultimoDiaMes } from "@/lib/proGestaoDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes");
  let q = g.db
    .from("pro_expenses")
    .select("*")
    .eq("professional_id", g.userId)
    .order("expense_date", { ascending: false });

  if (mes) {
    const ini = `${mes}-01`;
    const fim = ultimoDiaMes(mes);
    q = q.gte("expense_date", ini).lte("expense_date", fim);
  }

  const { data, error } = await q;

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ ok: true, expenses: [] });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, expenses: data || [] });
}

export async function POST(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { description, amount, category, expense_date } = await req.json();
  if (!description || amount == null || !expense_date) {
    return NextResponse.json(
      { ok: false, error: "Descricao, valor e data sao obrigatorios" },
      { status: 400 }
    );
  }

  const { data, error } = await g.db
    .from("pro_expenses")
    .insert({
      professional_id: g.userId,
      description: String(description).trim(),
      amount: Number(amount),
      category: category || "diversos",
      expense_date,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, expense: data });
}

export async function PATCH(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { id, ...campos } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatorio" }, { status: 400 });

  const { error } = await g.db
    .from("pro_expenses")
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
    .from("pro_expenses")
    .delete()
    .eq("id", id)
    .eq("professional_id", g.userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
