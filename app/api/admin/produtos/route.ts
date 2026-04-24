import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";

export async function GET() {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json({ ok: false, error: error || "Falha de autenticação." }, { status: status || 401 });
    }
    const admin = await assertAdmin(supabase, userId);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
    }

    const { data, error: qerr } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (qerr) return NextResponse.json({ ok: false, error: qerr.message }, { status: 500 });
    return NextResponse.json({ ok: true, products: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json({ ok: false, error: error || "Falha de autenticação." }, { status: status || 401 });
    }
    const admin = await assertAdmin(supabase, userId);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, how_to_use, image_url, video_url, volume, peso_gramas,
      price_hairdresser, price_ambassador, price_distributor, stock, ativo } = body;
    if (!title) return NextResponse.json({ ok: false, error: "Título obrigatório" }, { status: 400 });
    const pg = Math.round(Number(peso_gramas));
    const { data, error: ierr } = await supabase
      .from("products")
      .insert({
        title, description, how_to_use, image_url, video_url, volume,
        price_hairdresser: Number(price_hairdresser) || 0,
        price_ambassador: Number(price_ambassador) || 0,
        price_distributor: Number(price_distributor) || 0,
        stock: Number(stock) || 0,
        ativo: ativo !== false,
        peso_gramas: Number.isFinite(pg) && pg > 0 ? pg : 500,
      })
      .select()
      .single();
    if (ierr) return NextResponse.json({ ok: false, error: ierr.message }, { status: 500 });
    return NextResponse.json({ ok: true, product: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json({ ok: false, error: error || "Falha de autenticação." }, { status: status || 401 });
    }
    const admin = await assertAdmin(supabase, userId);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...campos } = body;
    if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
    const patch = { ...campos } as Record<string, unknown>;
    ["price_hairdresser", "price_ambassador", "price_distributor", "stock"].forEach((k) => {
      if (patch[k] !== undefined) patch[k] = Number(patch[k]) || 0;
    });
    if (patch.peso_gramas !== undefined) {
      const pg = Math.round(Number(patch.peso_gramas));
      patch.peso_gramas = Number.isFinite(pg) && pg > 0 ? pg : 500;
    }
    const { error: uerr } = await supabase.from("products").update(patch).eq("id", id);
    if (uerr) return NextResponse.json({ ok: false, error: uerr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json({ ok: false, error: error || "Falha de autenticação." }, { status: status || 401 });
    }
    const admin = await assertAdmin(supabase, userId);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
    const { error: derr } = await supabase.from("products").delete().eq("id", id);
    if (derr) return NextResponse.json({ ok: false, error: derr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
