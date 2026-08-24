import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUS_PEDIDO_PAGO } from "@/lib/comercialMetricas";

const PAGE = 1000;
const STATUSES_PAGO = ["paid", "separacao", "despachado", "entregue"] as const;

export function statusPedidoPago(status: unknown) {
  return (STATUS_PEDIDO_PAGO as readonly string[]).includes(
    String(status || "").trim().toLowerCase()
  );
}

export function instanteAtivoPedido(p: {
  pago_em?: string | null;
  created_at?: string | null;
}) {
  // Só pagamento: zera no dia 1º. Envio/atualização não reconta o mês.
  return p.pago_em || p.created_at || "";
}

export function pedidoAtivoNoPeriodo(
  p: {
    pago_em?: string | null;
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
  pago_em?: string | null;
  status?: string | null;
};

async function carregarPedidosPagos(
  supabase: SupabaseClient,
  profileIds?: string[]
): Promise<{ rows: PedidoAtivoRow[]; error: string | null }> {
  async function pagina(comPagoEm: boolean, ids?: string[]) {
    const rows: PedidoAtivoRow[] = [];
    let from = 0;
    for (let i = 0; i < 200; i++) {
      const to = from + PAGE - 1;
      let query = comPagoEm
        ? (supabase.from("orders") as any).select("profile_id, created_at, pago_em, status")
        : supabase.from("orders").select("profile_id, created_at, status");
      query = query.in("status", [...STATUSES_PAGO]);
      if (ids?.length) query = query.in("profile_id", ids);
      const { data, error } = await query.range(from, to);
      if (error) return { rows: [] as PedidoAtivoRow[], error: error.message };
      const chunk = (data || []) as PedidoAtivoRow[];
      rows.push(...chunk);
      if (chunk.length < PAGE) break;
      from += PAGE;
    }
    return { rows, error: null as string | null };
  }

  const idsChunks: (string[] | undefined)[] = profileIds?.length
    ? Array.from({ length: Math.ceil(profileIds.length / 80) }, (_, i) =>
        profileIds.slice(i * 80, i * 80 + 80)
      )
    : [undefined];

  const all: PedidoAtivoRow[] = [];
  for (const chunk of idsChunks) {
    let fetched = await pagina(true, chunk);
    if (fetched.error) fetched = await pagina(false, chunk);
    if (fetched.error) return fetched;
    all.push(...fetched.rows);
  }
  return { rows: all, error: null };
}

/**
 * Pedidos pagos cuja data de pagamento (pago_em, senão created_at) cai no mês.
 */
export async function pedidosAtivosNoPeriodo(
  supabase: SupabaseClient,
  iniIso: string,
  fimIso: string
): Promise<{ rows: PedidoAtivoRow[]; error: string | null }> {
  const fetched = await carregarPedidosPagos(supabase);
  if (fetched.error) return fetched;
  return {
    rows: fetched.rows.filter((p) => pedidoAtivoNoPeriodo(p, iniIso, fimIso)),
    error: null,
  };
}

/** Igual ao período, mas só dos perfis da equipe (Minha Rede). */
export async function pedidosAtivosDosPerfis(
  supabase: SupabaseClient,
  profileIds: string[],
  iniIso: string,
  fimIso: string
): Promise<{ rows: PedidoAtivoRow[]; error: string | null }> {
  const ids = [...new Set(profileIds.map(String).filter(Boolean))];
  if (ids.length === 0) return { rows: [], error: null };
  const fetched = await carregarPedidosPagos(supabase, ids);
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
  const full: Record<string, unknown> = { ...campos };
  delete full.updated_at;
  if (!jaEstavaPago && full.pago_em == null) full.pago_em = now;
  const { error } = await supabase.from("orders").update(full as never).eq("id", orderId);
  if (error && /pago_em|updated_at|schema cache/i.test(error.message)) {
    const rest = { ...full };
    delete rest.pago_em;
    delete rest.updated_at;
    return await supabase.from("orders").update(rest as never).eq("id", orderId);
  }
  return { error };
}
