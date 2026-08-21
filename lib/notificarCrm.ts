import type { SupabaseClient } from "@supabase/supabase-js";

export async function criarNotificacao(
  supabase: SupabaseClient,
  params: {
    user_id: string;
    actor_id?: string | null;
    type: string;
    content: string;
    link: string;
  }
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: params.user_id,
    actor_id: params.actor_id ?? null,
    type: params.type,
    content: params.content,
    link: params.link,
    is_read: false,
  };

  const { error } = await supabase.from("notifications").insert(row);
  if (error) {
    // fallback legado (coluna read)
    await supabase.from("notifications").insert({
      ...row,
      read: false,
    });
  }
}

export async function notificarPedidoAguardandoAprovacao(
  supabase: SupabaseClient,
  params: {
    distribuidor_id: string;
    vendedor_id: string;
    vendedor_nome: string;
    order_id: string;
    total: number;
    motivo: string;
  }
): Promise<void> {
  const totalFmt = params.total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  await criarNotificacao(supabase, {
    user_id: params.distribuidor_id,
    actor_id: params.vendedor_id,
    type: "crm_aprovacao_pendente",
    content: `${params.vendedor_nome} enviou pedido ${totalFmt} aguardando aprovação (${params.motivo}).`,
    link: "/admin/crm/equipe?tab=aprovacoes",
  });
}

export async function notificarPedidoAprovado(
  supabase: SupabaseClient,
  params: {
    vendedor_id: string;
    distribuidor_id: string;
    order_id: string;
    total: number;
  }
): Promise<void> {
  const totalFmt = params.total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  await criarNotificacao(supabase, {
    user_id: params.vendedor_id,
    actor_id: params.distribuidor_id,
    type: "crm_aprovacao_ok",
    content: `Seu pedido ${totalFmt} foi aprovado pelo distribuidor.`,
    link: "/vendedor/crm/dashboard",
  });
}

export async function notificarPedidoRejeitado(
  supabase: SupabaseClient,
  params: {
    vendedor_id: string;
    distribuidor_id: string;
    order_id: string;
    total: number;
  }
): Promise<void> {
  const totalFmt = params.total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  await criarNotificacao(supabase, {
    user_id: params.vendedor_id,
    actor_id: params.distribuidor_id,
    type: "crm_aprovacao_rejeitada",
    content: `Pedido ${totalFmt} foi rejeitado pelo distribuidor.`,
    link: "/vendedor/crm",
  });
}
