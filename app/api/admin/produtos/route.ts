import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function GET() {
  const { data, error } = await sb().from("products").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, products: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, how_to_use, image_url, video_url, volume, peso_gramas,
    price_hairdresser, price_ambassador, price_distributor, stock, ativo } = body;
  if (!title) return NextResponse.json({ ok: false, error: "Título obrigatório" }, { status: 400 });
  const pg = Math.round(Number(peso_gramas));
  const { data, error } = await sb().from("products").insert({
    title, description, how_to_use, image_url, video_url, volume,
    price_hairdresser: Number(price_hairdresser) || 0,
    price_ambassador: Number(price_ambassador) || 0,
    price_distributor: Number(price_distributor) || 0,
    stock: Number(stock) || 0,
    ativo: ativo !== false,
    peso_gramas: Number.isFinite(pg) && pg > 0 ? pg : 500,
  }).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, product: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...campos } = body;
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
  ["price_hairdresser", "price_ambassador", "price_distributor", "stock"].forEach(k => {
    if (campos[k] !== undefined) campos[k] = Number(campos[k]) || 0;
  });
  if (campos.peso_gramas !== undefined) {
    const pg = Math.round(Number(campos.peso_gramas));
    (campos as { peso_gramas?: number }).peso_gramas = Number.isFinite(pg) && pg > 0 ? pg : 500;
  }
  const { error } = await sb().from("products").update(campos).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
  const { error } = await sb().from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
