import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";

export const dynamic = "force-dynamic";

/** Lista carrinhos abandonados ativos (com cliente + itens). */
export async function GET(_req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json(
        { ok: false, error: error || "Falha de autenticação." },
        { status: status || 401 }
      );
    }
    const adm = await assertAdmin(supabase, userId);
    if (!adm.ok) {
      return NextResponse.json({ ok: false, error: adm.error }, { status: 403 });
    }

    const { data, error: qerr } = await supabase
      .from("abandoned_carts")
      .select(`
        profile_id, items, subtotal, shipping_cep, shipping_address,
        shipping_cost, status, notes, created_at, updated_at,
        profiles!abandoned_carts_profile_id_fkey(full_name, email, role, avatar_url)
      `)
      .eq("status", "ativo")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (qerr) {
      return NextResponse.json({ ok: false, error: qerr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, carrinhos: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** Descarta um carrinho abandonado (admin). */
export async function DELETE(req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json(
        { ok: false, error: error || "Falha de autenticação." },
        { status: status || 401 }
      );
    }
    const adm = await assertAdmin(supabase, userId);
    if (!adm.ok) {
      return NextResponse.json({ ok: false, error: adm.error }, { status: 403 });
    }

    const { profileId } = (await req.json().catch(() => ({}))) as {
      profileId?: string;
    };
    if (!profileId) {
      return NextResponse.json(
        { ok: false, error: "profileId obrigatório." },
        { status: 400 }
      );
    }

    const { error: derr } = await supabase
      .from("abandoned_carts")
      .update({ status: "descartado" })
      .eq("profile_id", profileId);

    if (derr) {
      return NextResponse.json({ ok: false, error: derr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
