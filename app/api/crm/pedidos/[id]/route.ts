import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { carregarPedidoParaPdf, podeVerPedidoCrm } from "@/lib/pedidoAcessoCrm";

export const dynamic = "force-dynamic";

const EDITAVEIS = new Set(["novo", "pending"]);

type ItemInput = {
  product_id: string;
  quantidade: number;
  preco_unitario: number;
  bonificado?: boolean;
  preco_tabela?: number | null;
};

/** Dados do pedido para gerar PDF / editar (vendedor, distribuidor ou admin) */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  try {
    const pedido = await carregarPedidoParaPdf(supabase, params.id);
    if (!pedido) {
      return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
    }

    const access = await podeVerPedidoCrm(supabase, userId, pedido);
    if (!access.ok) {
      return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      pedido,
      editavel: EDITAVEIS.has(String(pedido.status || "").toLowerCase()),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao carregar pedido.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** Ajusta itens/frete do pedido (vendedor nos próprios; admin/distribuidor com acesso). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  try {
    const { data: order, error: errOrd } = await supabase
      .from("orders")
      .select(
        "id, status, shipping_cost, desconto_total, vendedor_id, distribuidor_gestor_id, gestor_tipo, crm_lead_id"
      )
      .eq("id", params.id)
      .maybeSingle();

    if (errOrd) {
      return NextResponse.json({ ok: false, error: errOrd.message }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
    }

    const access = await podeVerPedidoCrm(supabase, userId, order);
    if (!access.ok) {
      return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
    }

    const st = String(order.status || "").toLowerCase();
    if (!EDITAVEIS.has(st)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Pedido com status "${order.status}" não pode mais ser alterado. Só pedidos novos/pendentes.`,
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json({ ok: false, error: "Informe os itens do pedido." }, { status: 400 });
    }

    const itensLimpos: ItemInput[] = body.items
      .map((i: ItemInput) => ({
        product_id: String(i?.product_id || ""),
        quantidade: Math.max(1, Math.floor(Number(i?.quantidade) || 0)),
        preco_unitario: Math.max(0, Number(i?.preco_unitario) || 0),
        bonificado: Boolean(i?.bonificado),
        preco_tabela:
          i?.preco_tabela != null && !Number.isNaN(Number(i.preco_tabela))
            ? Number(i.preco_tabela)
            : null,
      }))
      .filter((i: ItemInput) => i.product_id && i.quantidade > 0);

    if (itensLimpos.length === 0) {
      return NextResponse.json(
        { ok: false, error: "O pedido precisa ter pelo menos 1 item." },
        { status: 400 }
      );
    }

    const ids = [...new Set(itensLimpos.map((i) => i.product_id))];
    const { data: prods } = await supabase.from("products").select("id").in("id", ids);
    const valid = new Set((prods || []).map((p) => p.id));
    const faltando = ids.filter((id) => !valid.has(id));
    if (faltando.length) {
      return NextResponse.json(
        { ok: false, error: `Produto(s) inválido(s): ${faltando.join(", ")}` },
        { status: 400 }
      );
    }

    const frete =
      body.shipping_cost != null
        ? Math.max(0, Number(body.shipping_cost) || 0)
        : Number(order.shipping_cost || 0);
    const desconto = Math.max(0, Number(order.desconto_total || 0));
    const subtotal = itensLimpos.reduce(
      (acc, i) => acc + i.quantidade * (i.bonificado ? 0 : i.preco_unitario),
      0
    );
    const total = Number(Math.max(0, subtotal + frete - desconto).toFixed(2));

    const { error: delErr } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", params.id);
    if (delErr) {
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
    }

    const { error: insErr } = await supabase.from("order_items").insert(
      itensLimpos.map((i) => ({
        order_id: params.id,
        product_id: i.product_id,
        quantidade: i.quantidade,
        preco_unitario: Number((i.bonificado ? 0 : i.preco_unitario).toFixed(2)),
        bonificado: Boolean(i.bonificado),
        preco_tabela:
          i.preco_tabela != null ? Number(Number(i.preco_tabela).toFixed(2)) : i.preco_unitario,
      }))
    );
    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    const patch: Record<string, unknown> = {
      total,
      shipping_cost: frete,
      updated_at: new Date().toISOString(),
    };
    if (body.shipping_cep !== undefined) {
      patch.shipping_cep = body.shipping_cep ? String(body.shipping_cep) : null;
    }
    if (body.shipping_address !== undefined) {
      patch.shipping_address = body.shipping_address ? String(body.shipping_address) : null;
    }
    if (body.payment_method != null) {
      patch.payment_method = String(body.payment_method).trim() || "pix";
    }

    const { error: upErr } = await supabase.from("orders").update(patch).eq("id", params.id);
    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    const pedido = await carregarPedidoParaPdf(supabase, params.id);
    return NextResponse.json({ ok: true, pedido, total });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar pedido.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
