import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUS_PEDIDO_PAGO } from "@/lib/comercialMetricas";

const PAGE = 1000;

export function statusPedidoPago(status: unknown) {
  return (STATUS_PEDIDO_PAGO as readonly string[]).includes(
    String(status || "").trim().toLowerCase()
  );
}

export function instanteAtivoPedido(p: {
  pago_em?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}) {
  return p.pago_em || p.updated_at || p.created_at || "";
}

export function pedidoAtivoNoPeriodo(
  p: {
    pago_em?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  },
  iniIso: string,
  fimIso: string
) {
  const t = new Date(instanteAtivoPedido(p)).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= new Date(iniIso).getTime() && t <= new Date(fimIso).getTime();
}

type PedidoAtivoRow = {
  profile_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  pago_em?: string | null;
  status?: string | null;
};

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  let from = 0;
  for (let i = 0; i < 200; i++) {
    const res = await fetchPage(from, from + PAGE - 1);
    if (res.error) return { rows: [], error: res.error.message };
    const chunk = res.data || [];
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return { rows, error: null };
}

/**
 * Pedidos pagos cuja data de atividade (pagamento, senão atualização, senão criação)
 * cai no mês. Assim o cliente entra em Ativos no instante do pagamento,
 * mesmo se o pedido foi aberto como pending no mês anterior.
 */
export async function pedidosAtivosNoPeriodo(
  supabase: SupabaseClient,
  iniIso: string,
  fimIso: string
): Promise<{ rows: PedidoAtivoRow[]; error: string | null }> {
  const tentar = async (select: string) =>
    fetchAllRows<PedidoAtivoRow>(async (from, to) => {
      return await supabase
        .from("orders")
        .select(select)
        .in("status", [...STATUS_PEDIDO_PAGO])
        .range(from, to);
    });

  let fetched = await tentar("profile_id, created_at, updated_at, pago_em, status");
  if (fetched.error) {
    fetched = await tentar("profile_id, created_at, updated_at, status");
  }
  if (fetched.error) return fetched;

  return {
    rows: fetched.rows.filter((p) => pedidoAtivoNoPeriodo(p, iniIso, fimIso)),
    error: null,
  };
}

export function idsUnicos(rows: PedidoAtivoRow[]) {
  return [...new Set(rows.map((p) => p.profile_id).filter(Boolean) as string[])];
}

export async function atualizarComoPago(
  supabase: SupabaseClient,
  orderId: string,
  campos: Record<string, unknown> = {}
) {
  const now = new Date().toISOString();
  const full = { ...campos, pago_em: campos.pago_em || now, updated_at: now };
  const { error } = await supabase.from("orders").update(full).eq("id", orderId);
  if (error && /pago_em|schema cache/i.test(error.message)) {
    const rest = { ...campos, updated_at: now };
    delete (rest as { pago_em?: unknown }).pago_em;
    return await supabase.from("orders").update(rest).eq("id", orderId);
  }
  return { error };
}
