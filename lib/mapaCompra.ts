import type { SupabaseClient } from "@supabase/supabase-js";

export const MAPA_DIAS_COMPRA = 30;

export const STATUS_COMPRA_MAPA = ["paid", "separacao", "despachado", "entregue"] as const;

export function compraDentroDoPrazo(iso: string | null | undefined, dias = MAPA_DIAS_COMPRA): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= dias * 24 * 60 * 60 * 1000;
}

/** Último pedido pago (ou em separação, despachado, entregue) por perfil. */
export async function ultimasComprasPorPerfil(
  db: SupabaseClient,
  somenteIds?: string[]
): Promise<Map<string, string>> {
  const ultima = new Map<string, string>();
  const filtro = somenteIds?.filter(Boolean);
  if (filtro && filtro.length === 0) return ultima;

  for (let from = 0; from < 200_000; from += 1000) {
    let q = db
      .from("orders")
      .select("profile_id, created_at")
      .in("status", [...STATUS_COMPRA_MAPA])
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (filtro && filtro.length <= 200) q = q.in("profile_id", filtro);

    const { data, error } = await q;
    if (error) break;
    for (const row of data || []) {
      const id = String(row.profile_id || "");
      const quando = String(row.created_at || "");
      if (!id || !quando) continue;
      if (filtro && filtro.length > 200 && !filtro.includes(id)) continue;
      const atual = ultima.get(id);
      if (!atual || quando > atual) ultima.set(id, quando);
    }
    if (!data || data.length < 1000) break;
  }

  return ultima;
}
