import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Remove um pedido e dependências comuns (itens + comissões vinculadas).
 * Usa service role no servidor para não depender de RLS.
 */
export async function deleteOrderCascade(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ error: string | null }> {
  const { error: e1 } = await supabase.from("commissions").delete().eq("order_id", orderId);
  if (e1) return { error: `commissions: ${e1.message}` };

  const { error: e2 } = await supabase.from("order_items").delete().eq("order_id", orderId);
  if (e2) return { error: `order_items: ${e2.message}` };

  const { error: e3 } = await supabase.from("orders").delete().eq("id", orderId);
  if (e3) return { error: `orders: ${e3.message}` };

  return { error: null };
}
