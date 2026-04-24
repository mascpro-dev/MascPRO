import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Baixa estoque global (products.stock) quando o pedido entra no fluxo pago.
 * Idempotente: usa orders.estoque_baixa_aplicada.
 */
export async function applyOrderCatalogStock(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ ok: true; appliedLines: number; skipped?: string } | { ok: false; error: string }> {
  const { data: order, error: e0 } = await supabase
    .from("orders")
    .select("id, status, estoque_baixa_aplicada")
    .eq("id", orderId)
    .maybeSingle();

  if (e0) {
    if (e0.code === "42703" || String(e0.message || "").includes("estoque_baixa_aplicada")) {
      return {
        ok: false,
        error:
          "Coluna orders.estoque_baixa_aplicada ausente. Rode supabase/orders_stock_baixa.sql no Supabase.",
      };
    }
    return { ok: false, error: e0.message };
  }
  if (!order) return { ok: false, error: "Pedido não encontrado" };

  const status = String(order.status || "");
  if (!["paid", "separacao", "despachado", "entregue"].includes(status)) {
    return { ok: true, appliedLines: 0, skipped: "status ainda não exige baixa de estoque" };
  }
  if (order.estoque_baixa_aplicada === true) {
    return { ok: true, appliedLines: 0, skipped: "estoque do catálogo já baixado" };
  }

  const { data: items, error: e1 } = await supabase
    .from("order_items")
    .select("product_id, quantidade")
    .eq("order_id", orderId);
  if (e1) return { ok: false, error: e1.message };

  const agg = new Map<string, number>();
  for (const row of items || []) {
    const pid = row.product_id as string | null;
    if (!pid) continue;
    const q = Number(row.quantidade || 0);
    if (q <= 0) continue;
    agg.set(pid, (agg.get(pid) || 0) + q);
  }

  if (agg.size === 0) {
    const { error: eFlag } = await supabase
      .from("orders")
      .update({ estoque_baixa_aplicada: true })
      .eq("id", orderId);
    if (eFlag) return { ok: false, error: eFlag.message };
    return { ok: true, appliedLines: 0, skipped: "nenhum item com produto vinculado" };
  }

  let appliedLines = 0;
  for (const [productId, qty] of agg) {
    const { data: prod, error: eProd } = await supabase
      .from("products")
      .select("id, stock")
      .eq("id", productId)
      .maybeSingle();
    if (eProd) return { ok: false, error: eProd.message };
    if (!prod) continue;

    const atual = Number(prod.stock || 0);
    const novo = Math.max(0, atual - qty);

    const { error: up } = await supabase
      .from("products")
      .update({ stock: novo })
      .eq("id", productId);
    if (up) return { ok: false, error: up.message };
    appliedLines += 1;
  }

  const { error: eFlag } = await supabase
    .from("orders")
    .update({ estoque_baixa_aplicada: true })
    .eq("id", orderId);
  if (eFlag) return { ok: false, error: eFlag.message };

  return { ok: true, appliedLines };
}

