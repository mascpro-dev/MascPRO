import type { SupabaseClient } from "@supabase/supabase-js";

export type MetaVendedor = {
  meta_leads: number;
  meta_visitas: number;
  meta_conversoes: number;
  meta_receita: number;
};

export type RealizadoVendedor = {
  leads: number;
  visitas: number;
  conversoes: number;
  receita: number;
};

export async function calcularRealizadoVendedor(
  supabase: SupabaseClient,
  vendedorId: string,
  periodo: string
): Promise<RealizadoVendedor> {
  const iniMes = `${periodo}-01`;
  const fimDate = new Date(
    new Date(`${periodo}-01`).getFullYear(),
    new Date(`${periodo}-01`).getMonth() + 1,
    0
  );
  const fimMes = `${fimDate.toISOString().slice(0, 10)}T23:59:59`;

  const [leadsRes, visitasRes, pedidosRes] = await Promise.all([
    supabase
      .from("crm_leads")
      .select("status")
      .or(`created_by.eq.${vendedorId},responsavel_id.eq.${vendedorId}`)
      .gte("created_at", iniMes)
      .lte("created_at", fimMes),

    supabase
      .from("crm_visitas")
      .select("id")
      .eq("vendedor_id", vendedorId)
      .gte("data_visita", iniMes)
      .lte("data_visita", fimMes),

    supabase
      .from("orders")
      .select("total, status, aprovacao_status, excluir_meta")
      .eq("vendedor_id", vendedorId)
      .gte("created_at", iniMes)
      .lte("created_at", fimMes),
  ]);

  const leads = leadsRes.data || [];
  const pedidos = (pedidosRes.data || []).filter(
    (p) =>
      !p.excluir_meta &&
      ["paid", "separacao", "despachado", "entregue"].includes(String(p.status)) &&
      p.aprovacao_status !== "pendente" &&
      p.aprovacao_status !== "rejeitado"
  );

  return {
    leads: leads.length,
    visitas: (visitasRes.data || []).length,
    conversoes: leads.filter((l) => l.status === "fechado").length,
    receita: pedidos.reduce((s, p) => s + Number(p.total || 0), 0),
  };
}

export function calcularProgresso(meta: MetaVendedor, realizado: RealizadoVendedor) {
  const pct = (real: number, alvo: number) =>
    alvo > 0 ? Math.round((real / alvo) * 100) : 0;
  return {
    leads: pct(realizado.leads, meta.meta_leads),
    visitas: pct(realizado.visitas, meta.meta_visitas),
    conversoes: pct(realizado.conversoes, meta.meta_conversoes),
    receita: pct(realizado.receita, meta.meta_receita),
  };
}
