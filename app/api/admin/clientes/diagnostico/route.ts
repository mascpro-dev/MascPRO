import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico completo de um cliente: perfil, pedidos (qualquer status)
 * e carrinho abandonado. Útil quando o admin precisa "achar" alguém
 * que está com problema para pagar.
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();
    if (q.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Digite ao menos 2 letras do nome ou e-mail." },
        { status: 400 }
      );
    }

    const { data: clientes, error: errC } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, avatar_url, cep, logradouro, numero, bairro, municipio, uf, indicado_por, created_at, last_sign_in_at")
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .order("full_name", { ascending: true })
      .limit(20);

    if (errC) {
      return NextResponse.json({ ok: false, error: errC.message }, { status: 500 });
    }
    if (!clientes || clientes.length === 0) {
      return NextResponse.json({ ok: true, clientes: [] });
    }

    const ids = clientes.map((c) => c.id);

    const [{ data: pedidos }, { data: carrinhos }] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, profile_id, total, status, payment_method, mp_payment_id, mp_preference_id, shipping_cost, shipping_cep, shipping_address, codigo_rastreio, transportadora, created_at, order_items(quantidade, preco_unitario, products(title))"
        )
        .in("profile_id", ids)
        .order("created_at", { ascending: false }),
      supabase
        .from("abandoned_carts")
        .select("profile_id, items, subtotal, shipping_cep, shipping_address, status, updated_at")
        .in("profile_id", ids),
    ]);

    type PedidoRow = NonNullable<typeof pedidos>[number];
    type CarrinhoRow = NonNullable<typeof carrinhos>[number];

    const pedidosPorCliente = new Map<string, PedidoRow[]>();
    for (const p of pedidos ?? []) {
      const arr = pedidosPorCliente.get(p.profile_id) ?? [];
      arr.push(p);
      pedidosPorCliente.set(p.profile_id, arr);
    }

    const carrinhoPorCliente = new Map<string, CarrinhoRow>();
    for (const c of carrinhos ?? []) {
      carrinhoPorCliente.set(c.profile_id, c);
    }

    const resultado = clientes.map((c) => ({
      ...c,
      pedidos: pedidosPorCliente.get(c.id) || [],
      carrinho: carrinhoPorCliente.get(c.id) || null,
    }));

    return NextResponse.json({ ok: true, clientes: resultado });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
