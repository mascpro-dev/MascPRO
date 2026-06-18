import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  assertEmbaixadoraCrmAccess,
  filtroLeadsEmbaixadoraOr,
  idsEscopoEmbaixadora,
} from "@/lib/crmEmbaixadoraServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertEmbaixadoraCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
  const STATUS_PAGOS = ["paid", "separacao", "despachado", "entregue"];
  const escopo = await idsEscopoEmbaixadora(supabase, userId);

  const { data: leadsRaw } = await supabase
    .from("crm_leads")
    .select("id, status, valor_estimado, data_followup, profile_id, order_id")
    .or(filtroLeadsEmbaixadoraOr(escopo));

  const leads = leadsRaw || [];
  const pipeline = {
    novo: leads.filter((l) => l.status === "novo").length,
    contato_feito: leads.filter((l) => l.status === "contato_feito").length,
    proposta: leads.filter((l) => l.status === "proposta").length,
    negociacao: leads.filter((l) => l.status === "negociacao").length,
    fechado: leads.filter((l) => l.status === "fechado").length,
    perdido: leads.filter((l) => l.status === "perdido").length,
    total: leads.length,
    valor_pipeline: leads
      .filter((l) => !["fechado", "perdido"].includes(l.status))
      .reduce((s, l) => s + Number(l.valor_estimado || 0), 0),
  };

  const followupsAtrasados = leads.filter(
    (l) =>
      l.data_followup &&
      new Date(l.data_followup) < new Date(new Date().toDateString()) &&
      !["fechado", "perdido"].includes(l.status)
  ).length;

  const leadIds = leads.map((l) => l.id);
  let pedidosRede: { id: string; total: number; status: string; created_at: string }[] = [];
  if (leadIds.length > 0) {
    const { data } = await supabase
      .from("orders")
      .select("id, total, status, created_at")
      .in("crm_lead_id", leadIds)
      .order("created_at", { ascending: false })
      .limit(100);
    pedidosRede = data || [];
  }

  const pedidosPagos = pedidosRede.filter((p) => STATUS_PAGOS.includes(p.status));
  const pedidosMes = pedidosPagos.filter((p) => p.created_at >= inicioMes);

  const { data: comissoesRaw } = await supabase
    .from("commissions")
    .select("id, valor_comissao, valor_pedido, status, created_at")
    .eq("embaixador_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const comissoes = comissoesRaw || [];
  const comissaoMes = comissoes
    .filter((c) => c.created_at >= inicioMes)
    .reduce((s, c) => s + Number(c.valor_comissao || 0), 0);

  const { data: rede } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("indicado_por", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    ok: true,
    usuario: { full_name: access.full_name },
    pipeline: {
      ...pipeline,
      followups_atrasados: followupsAtrasados,
      taxa_conversao:
        pipeline.total > 0
          ? Math.round((pipeline.fechado / pipeline.total) * 100)
          : 0,
    },
    resumo: {
      vendas_mes: pedidosMes.reduce((s, p) => s + Number(p.total || 0), 0),
      pedidos_mes: pedidosMes.length,
      comissao_mes: comissaoMes,
      indicados: (rede || []).length,
    },
    rede: rede || [],
    ultimos_pedidos: pedidosPagos.slice(0, 6),
  });
}
