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
  // Só pagamento: zera no dia 1º. Envio/atualização não reconta o mês.
  return p.pago_em || p.created_at || "";
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
  const tentar = async (comPagoEm: boolean) =>
    fetchAllRows<PedidoAtivoRow>(async (from, to) => {
      const q = comPagoEm
        ? supabase
            .from("orders")
            .select("profile_id, created_at, updated_at, pago_em, status")
            .in("status", [...STATUS_PEDIDO_PAGO])
            .range(from, to)
        : supabase
            .from("orders")
            .select("profile_id, created_at, updated_at, status")
            .in("status", [...STATUS_PEDIDO_PAGO])
            .range(from, to);
      const res = await q;
      return { data: (res.data || null) as PedidoAtivoRow[] | null, error: res.error };
    });

  let fetched = await tentar(true);
  if (fetched.error) fetched = await tentar(false);
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
  campos: Record<string, unknown> = {},
  jaEstavaPago = false
) {
  const now = new Date().toISOString();
  const full: Record<string, unknown> = { ...campos, updated_at: now };
  if (!jaEstavaPago && full.pago_em == null) full.pago_em = now;
  const { error } = await supabase.from("orders").update(full).eq("id", orderId);
  if (error && /pago_em|schema cache/i.test(error.message)) {
    const rest = { ...full };
    delete rest.pago_em;
    return await supabase.from("orders").update(rest).eq("id", orderId);
  }
  return { error };
}
