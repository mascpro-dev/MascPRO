import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Item = {
  id: string;
  title?: string;
  quantity: number;
  displayPrice?: number;
  price?: number;
  image_url?: string;
};

/**
 * Salva (ou apaga) o carrinho do usuário logado, para que o admin
 * possa recuperar vendas abandonadas em /admin/pedidos > Abandonados.
 *
 * - Se items vazio: marca registro como `descartado` (ou apaga).
 * - Se items >= 1: upsert com status `ativo`.
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession();

    // Sem login: ignora silenciosamente (não dá pra atribuir o carrinho).
    if (!session?.user) {
      return NextResponse.json({ ok: true, saved: false, reason: "unauthenticated" });
    }

    const body = (await req.json().catch(() => ({}))) as {
      items?: Item[];
      shipping_cep?: string | null;
      shipping_address?: string | null;
      shipping_cost?: number;
      notes?: string;
    };

    const items = Array.isArray(body.items) ? body.items : [];
    const itemsLimpos = items
      .filter((i) => i && typeof i.id === "string" && i.id.length > 0)
      .map((i) => ({
        id: i.id,
        title: i.title || "",
        quantity: Math.max(1, Math.floor(Number(i.quantity) || 1)),
        price: Number(i.displayPrice ?? i.price ?? 0) || 0,
        image_url: i.image_url || "",
      }))
      .slice(0, 50);

    const subtotal = itemsLimpos.reduce((s, i) => s + i.quantity * i.price, 0);

    // Sempre usa service role aqui — o cliente PWA pode ter políticas RLS bloqueando.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = serviceKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
      : supabaseAuth;

    if (itemsLimpos.length === 0) {
      // Carrinho vazio — apaga / descarta para não poluir a lista do admin.
      await supabase.from("abandoned_carts").delete().eq("profile_id", session.user.id);
      return NextResponse.json({ ok: true, saved: false, reason: "empty" });
    }

    const { error } = await supabase
      .from("abandoned_carts")
      .upsert(
        {
          profile_id: session.user.id,
          items: itemsLimpos,
          subtotal: Number(subtotal.toFixed(2)),
          shipping_cep: body.shipping_cep || null,
          shipping_address: body.shipping_address || null,
          shipping_cost: Number(body.shipping_cost || 0),
          notes: body.notes || null,
          status: "ativo",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" }
      );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, saved: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
