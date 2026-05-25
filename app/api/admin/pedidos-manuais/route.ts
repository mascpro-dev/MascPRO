import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";
import { applyOrderRewards } from "@/lib/applyOrderRewards";
import { applyOrderCatalogStock } from "@/lib/applyOrderCatalogStock";

export const dynamic = "force-dynamic";

type ItemInput = {
  product_id: string;
  quantidade: number;
  preco_unitario: number;
};

type Body = {
  profile_id: string;
  items: ItemInput[];
  shipping_cost?: number;
  shipping_cep?: string | null;
  shipping_address?: string | null;
  payment_method?: string;
  status?: string;
  observacao?: string | null;
  codigo_rastreio?: string | null;
  transportadora?: string | null;
};

const STATUS_VALIDOS = new Set([
  "novo",
  "pending",
  "paid",
  "separacao",
  "despachado",
  "entregue",
]);

const STATUS_PAGO = new Set(["paid", "separacao", "despachado", "entregue"]);

export async function POST(req: NextRequest) {
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

    const body = (await req.json()) as Body;

    if (!body?.profile_id) {
      return NextResponse.json(
        { ok: false, error: "Selecione o cliente do pedido." },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Adicione pelo menos 1 produto." },
        { status: 400 }
      );
    }

    const itensLimpos: ItemInput[] = body.items
      .map((i) => ({
        product_id: String(i?.product_id || ""),
        quantidade: Math.max(1, Math.floor(Number(i?.quantidade) || 0)),
        preco_unitario: Math.max(0, Number(i?.preco_unitario) || 0),
      }))
      .filter((i) => i.product_id && i.quantidade > 0 && i.preco_unitario >= 0);

    if (itensLimpos.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Itens inválidos. Confira produtos, quantidade e preço." },
        { status: 400 }
      );
    }

    const { data: comprador, error: errComp } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", body.profile_id)
      .maybeSingle();
    if (errComp) {
      return NextResponse.json({ ok: false, error: errComp.message }, { status: 500 });
    }
    if (!comprador) {
      return NextResponse.json(
        { ok: false, error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    const idsProdutos = [...new Set(itensLimpos.map((i) => i.product_id))];
    const { data: produtos, error: errProd } = await supabase
      .from("products")
      .select("id, title")
      .in("id", idsProdutos);
    if (errProd) {
      return NextResponse.json({ ok: false, error: errProd.message }, { status: 500 });
    }
    const idsValidos = new Set((produtos || []).map((p) => p.id));
    const faltando = idsProdutos.filter((id) => !idsValidos.has(id));
    if (faltando.length > 0) {
      return NextResponse.json(
        { ok: false, error: `Produto(s) não encontrado(s): ${faltando.join(", ")}` },
        { status: 400 }
      );
    }

    const subtotal = itensLimpos.reduce(
      (acc, i) => acc + i.quantidade * i.preco_unitario,
      0
    );
    const frete = Math.max(0, Number(body.shipping_cost) || 0);
    const total = Number((subtotal + frete).toFixed(2));

    const statusInicial = String(body.status || "paid").toLowerCase();
    if (!STATUS_VALIDOS.has(statusInicial)) {
      return NextResponse.json(
        { ok: false, error: `Status inválido: ${statusInicial}` },
        { status: 400 }
      );
    }

    const { data: order, error: errOrder } = await supabase
      .from("orders")
      .insert({
        profile_id: body.profile_id,
        total,
        payment_method: body.payment_method || "manual",
        status: statusInicial,
        shipping_cost: Number(frete.toFixed(2)),
        shipping_cep: body.shipping_cep || null,
        shipping_address: body.shipping_address || null,
        codigo_rastreio: body.codigo_rastreio || null,
        transportadora: body.transportadora || null,
      })
      .select("id")
      .single();

    if (errOrder || !order) {
      return NextResponse.json(
        { ok: false, error: errOrder?.message || "Falha ao criar pedido." },
        { status: 500 }
      );
    }

    const { error: errItems } = await supabase.from("order_items").insert(
      itensLimpos.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        quantidade: i.quantidade,
        preco_unitario: Number(i.preco_unitario.toFixed(2)),
      }))
    );

    if (errItems) {
      // tenta reverter o pedido se itens falharem
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { ok: false, error: `Falha ao salvar itens: ${errItems.message}` },
        { status: 500 }
      );
    }

    let recompensas: Awaited<ReturnType<typeof applyOrderRewards>> | null = null;
    let estoque: Awaited<ReturnType<typeof applyOrderCatalogStock>> | null = null;

    if (STATUS_PAGO.has(statusInicial)) {
      recompensas = await applyOrderRewards(supabase, order.id);
      estoque = await applyOrderCatalogStock(supabase, order.id);
    }

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      total,
      subtotal,
      frete,
      status: statusInicial,
      recompensas,
      estoque,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
