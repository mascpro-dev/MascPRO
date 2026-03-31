import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("data_hora", { ascending: true });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, eventos: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { titulo, descricao, flyer_url, local, cidade, estado, organizador, valor, data_hora } = body;
    if (!titulo || !data_hora) {
      return NextResponse.json({ ok: false, error: "Título e data são obrigatórios." }, { status: 400 });
    }
    const supabase = getSupabase();
    const { data, error } = await supabase.from("events").insert({
      titulo, descricao, flyer_url, local, cidade, estado, organizador,
      valor: valor ? Number(valor) : null,
      data_hora,
      ativo: true,
    }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, evento: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...campos } = body;
    if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
    if (campos.valor !== undefined) campos.valor = campos.valor ? Number(campos.valor) : null;
    const supabase = getSupabase();
    const { error } = await supabase.from("events").update(campos).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
    const supabase = getSupabase();
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
