import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function GET() {
  const { data, error } = await sb()
    .from("comunicados")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, comunicados: data || [] });
}

export async function POST(req: NextRequest) {
  const { titulo, mensagem, publico, tipo } = await req.json();
  if (!titulo || !mensagem) return NextResponse.json({ ok: false, error: "Título e mensagem obrigatórios" }, { status: 400 });
  const { data, error } = await sb().from("comunicados").insert({
    titulo, mensagem,
    publico: publico || "TODOS",
    tipo: tipo || "info",
    ativo: true,
  }).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, comunicado: data });
}

export async function PATCH(req: NextRequest) {
  const { id, ...campos } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
  const { error } = await sb().from("comunicados").update(campos).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
  const { error } = await sb().from("comunicados").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
