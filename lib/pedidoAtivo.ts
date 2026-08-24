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

/**
 * Pedidos pagos cuja data de pagamento (pago_em, senão created_at) cai no mês.
 */
export async function pedidosAtivosNoPeriodo(
  supabase: SupabaseClient,
  iniIso: string,
  fimIso: string
): Promise<{ rows: PedidoAtivoRow[]; error: string | null }> {
  const statuses = ["paid", "separacao", "despachado", "entregue"];

  async function carregar(comPagoEm: boolean): Promise<{ rows: PedidoAtivoRow[]; error: string | null }> {
    const rows: PedidoAtivoRow[] = [];
    let from = 0;
    for (let i = 0; i < 200; i++) {
      const to = from + PAGE - 1;
      const builder = supabase.from("orders");
      const query = comPagoEm
        ? (builder as any).select("profile_id, created_at, updated_at, pago_em, status")
        : builder.select("profile_id, created_at, updated_at, status");
      const { data, error } = await query.in("status", statuses).range(from, to);
      if (error) return { rows: [], error: error.message };
      const chunk = (data || []) as PedidoAtivoRow[];
      rows.push(...chunk);
      if (chunk.length < PAGE) break;
      from += PAGE;
    }
    return { rows, error: null };
  }

  let fetched = await carregar(true);
  if (fetched.error) fetched = await carregar(false);
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
  const { error } = await supabase.from("orders").update(full as never).eq("id", orderId);
  if (error && /pago_em|schema cache/i.test(error.message)) {
    const rest = { ...full };
    delete rest.pago_em;
    return await supabase.from("orders").update(rest as never).eq("id", orderId);
  }
  return { error };
}
