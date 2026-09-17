import type { SupabaseClient } from "@supabase/supabase-js";

type ItemSoma = {
  quantidade?: number | null;
  preco_unitario?: number | null;
  bonificado?: boolean | null;
};

/** Soma dos itens (bonificados = 0). */
export function somarItensPedido(itens: ItemSoma[] | null | undefined): number {
  return (itens || []).reduce((acc, i) => {
    const qtd = Number(i.quantidade || 0);
    const unit = Boolean(i.bonificado) ? 0 : Number(i.preco_unitario || 0);
    return acc + qtd * unit;
  }, 0);
}

export function calcularTotalPedido(opts: {
  itens: ItemSoma[] | null | undefined;
  shipping_cost?: number | null;
  desconto_total?: number | null;
}): number {
  const subtotal = somarItensPedido(opts.itens);
  const frete = Math.max(0, Number(opts.shipping_cost || 0));
  const desconto = Math.max(0, Number(opts.desconto_total || 0));
  return Number(Math.max(0, subtotal + frete - desconto).toFixed(2));
}

/**
 * Recalcula e grava `orders.total` a partir dos itens atuais + frete − desconto.
 * Use sempre após alterar itens.
 */
export async function sincronizarTotalPedido(
  supabase: SupabaseClient,
  orderId: string,
  override?: { shipping_cost?: number | null }
): Promise<{ ok: true; total: number; subtotal: number } | { ok: false; error: string }> {
  const { data: order, error: errOrd } = await supabase
    .from("orders")
    .select("id, shipping_cost, desconto_total")
    .eq("id", orderId)
    .maybeSingle();

  if (errOrd) return { ok: false, error: errOrd.message };
  if (!order) return { ok: false, error: "Pedido não encontrado." };

  const { data: itens, error: errItens } = await supabase
    .from("order_items")
    .select("quantidade, preco_unitario, bonificado")
    .eq("order_id", orderId);

  if (errItens) return { ok: false, error: errItens.message };

  const frete =
    override?.shipping_cost !== undefined && override.shipping_cost !== null
      ? Number(override.shipping_cost)
      : Number(order.shipping_cost || 0);

  const subtotal = somarItensPedido(itens);
  const total = calcularTotalPedido({
    itens,
    shipping_cost: frete,
    desconto_total: order.desconto_total,
  });

  const patch: Record<string, unknown> = { total };
  if (override?.shipping_cost !== undefined) {
    patch.shipping_cost = Math.max(0, frete);
  }

  const { error: upErr } = await supabase.from("orders").update(patch).eq("id", orderId);
  if (upErr) return { ok: false, error: upErr.message };

  return { ok: true, total, subtotal: Number(subtotal.toFixed(2)) };
}
