import type { SupabaseClient } from "@supabase/supabase-js";

export async function podeVerPedidoCrm(
  supabase: SupabaseClient,
  userId: string,
  order: {
    vendedor_id?: string | null;
    distribuidor_gestor_id?: string | null;
    gestor_tipo?: string | null;
  }
): Promise<{ ok: true; role: string } | { ok: false; error: string }> {
  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = String(perfil?.role || "").toUpperCase();

  if (role === "ADMIN") return { ok: true, role };

  if (role === "DISTRIBUIDOR") {
    if (
      String(order.gestor_tipo || "").toLowerCase() === "distribuidor" &&
      order.distribuidor_gestor_id === userId
    ) {
      return { ok: true, role };
    }
    return { ok: false, error: "Sem acesso a este pedido." };
  }

  if (role === "VENDEDOR") {
    if (order.vendedor_id === userId) return { ok: true, role };
    return { ok: false, error: "Sem acesso a este pedido." };
  }

  return { ok: false, error: "Sem permissão." };
}

export async function carregarPedidoParaPdf(
  supabase: SupabaseClient,
  orderId: string
) {
  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id, created_at, total, payment_method, status,
      shipping_cost, shipping_cep, shipping_address,
      desconto_total, aprovacao_status, vendedor_id,
      distribuidor_gestor_id, gestor_tipo, crm_lead_id,
      profiles!orders_profile_id_fkey(full_name, email, whatsapp),
      crm_leads(nome, telefone, email, cidade, estado),
      order_items(quantidade, preco_unitario, bonificado, preco_tabela, products(title))
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!order) return null;

  let vendedor_nome: string | null = null;
  let distribuidor_nome: string | null = null;

  if (order.vendedor_id) {
    const { data: v } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", order.vendedor_id)
      .maybeSingle();
    vendedor_nome = v?.full_name || null;
  }

  if (order.distribuidor_gestor_id) {
    const { data: d } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", order.distribuidor_gestor_id)
      .maybeSingle();
    distribuidor_nome = d?.full_name || null;
  }

  return {
    ...order,
    vendedor_nome,
    distribuidor_nome,
  };
}
