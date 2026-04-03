import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Quando o pedido fica "entregue", soma os itens (order_items) no pro_inventory do comprador.
 * Idempotente: usa orders.estoque_recebimento_aplicado.
 */
export async function applyOrderToProInventory(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ ok: true; appliedLines: number; skipped?: string } | { ok: false; error: string }> {
  const { data: order, error: e0 } = await supabase
    .from("orders")
    .select("id, profile_id, status, estoque_recebimento_aplicado")
    .eq("id", orderId)
    .maybeSingle();

  if (e0) {
    if (e0.code === "42703" || String(e0.message || "").includes("estoque_recebimento_aplicado")) {
      return {
        ok: false,
        error:
          "Coluna orders.estoque_recebimento_aplicado ausente. Rode supabase/pro_inventory_pedido_entregue.sql no Supabase.",
      };
    }
    return { ok: false, error: e0.message };
  }
  if (!order) return { ok: false, error: "Pedido não encontrado" };
  if (!order.profile_id) return { ok: true, appliedLines: 0, skipped: "sem comprador" };
  if (order.status !== "entregue") return { ok: true, appliedLines: 0, skipped: "status não é entregue" };
  if (order.estoque_recebimento_aplicado === true) {
    return { ok: true, appliedLines: 0, skipped: "estoque já aplicado para este pedido" };
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
      .update({ estoque_recebimento_aplicado: true })
      .eq("id", orderId);
    if (eFlag) return { ok: false, error: eFlag.message };
    return { ok: true, appliedLines: 0, skipped: "nenhum item com produto vinculado" };
  }

  const pids = [...agg.keys()];
  const { data: products, error: e2 } = await supabase.from("products").select("id, title").in("id", pids);
  if (e2) return { ok: false, error: e2.message };
  const pmap = new Map((products || []).map((p: { id: string; title: string }) => [p.id, p.title]));

  let appliedLines = 0;
  const now = new Date().toISOString();

  for (const [productId, qty] of agg) {
    const name = (pmap.get(productId) || "Produto loja").trim() || "Produto loja";

    const { data: existing, error: e3 } = await supabase
      .from("pro_inventory")
      .select("id, quantity")
      .eq("professional_id", order.profile_id)
      .eq("product_id", productId)
      .maybeSingle();

    if (e3) {
      if (e3.code === "42703" || String(e3.message || "").includes("product_id")) {
        return {
          ok: false,
          error:
            "Coluna pro_inventory.product_id ausente. Rode supabase/pro_inventory_pedido_entregue.sql no Supabase.",
        };
      }
      return { ok: false, error: e3.message };
    }

    if (existing) {
      const prevQty = Number(existing.quantity || 0);
      const { error: up } = await supabase
        .from("pro_inventory")
        .update({
          quantity: prevQty + qty,
          updated_at: now,
        })
        .eq("id", existing.id);
      if (up) return { ok: false, error: up.message };
      const { error: mErr } = await supabase.from("pro_inventory_movements").insert({
        professional_id: order.profile_id,
        order_id: orderId,
        product_id: productId,
        inventory_id: existing.id,
        quantity_delta: qty,
        reason: "pedido_entregue",
      });
      if (mErr) {
        await supabase
          .from("pro_inventory")
          .update({ quantity: prevQty, updated_at: now })
          .eq("id", existing.id);
        if (mErr.code === "42P01") {
          return {
            ok: false,
            error:
              "Tabela pro_inventory_movements ausente. Rode supabase/pro_inventory_movements.sql no Supabase.",
          };
        }
        return { ok: false, error: mErr.message };
      }
    } else {
      const { data: novo, error: ins } = await supabase
        .from("pro_inventory")
        .insert({
          professional_id: order.profile_id,
          product_id: productId,
          name,
          category: "outros",
          quantity: qty,
          unit: "un",
          notes: "Entrada automática — pedido loja MascPRO (recebido)",
          updated_at: now,
        })
        .select("id")
        .single();
      if (ins) return { ok: false, error: ins.message };
      const { error: mErr } = await supabase.from("pro_inventory_movements").insert({
        professional_id: order.profile_id,
        order_id: orderId,
        product_id: productId,
        inventory_id: novo?.id ?? null,
        quantity_delta: qty,
        reason: "pedido_entregue",
      });
      if (mErr) {
        if (novo?.id) await supabase.from("pro_inventory").delete().eq("id", novo.id);
        if (mErr.code === "42P01") {
          return {
            ok: false,
            error:
              "Tabela pro_inventory_movements ausente. Rode supabase/pro_inventory_movements.sql no Supabase.",
          };
        }
        return { ok: false, error: mErr.message };
      }
    }
    appliedLines += 1;
  }

  const { error: eFlag } = await supabase
    .from("orders")
    .update({ estoque_recebimento_aplicado: true })
    .eq("id", orderId);
  if (eFlag) return { ok: false, error: eFlag.message };

  return { ok: true, appliedLines };
}
