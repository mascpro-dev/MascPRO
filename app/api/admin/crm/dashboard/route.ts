import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function assertCrmAccess(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  const role = String(data?.role || "").toUpperCase();
  if (!["ADMIN", "DISTRIBUIDOR"].includes(role)) {
    return { ok: false as const, error: "Acesso restrito." };
  }
  return { ok: true as const, role, full_name: data?.full_name as string, avatar_url: data?.avatar_url };
}

// GET /api/admin/crm/dashboard
// Dashboard financeiro e operacional do distribuidor (ou visão geral para ADMIN)
export async function GET() {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId)
    return NextResponse.json({ ok: false, error: authErr }, { status });

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok)
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
  const STATUS_PAGOS = ["paid", "separacao", "despachado", "entregue"];

  // IDs da rede (próprio + indicados diretos)
  const { data: redeRaw } = await supabase
    .from("profiles")
    .select("id, full_name, email, whatsapp, role, created_at, pro_total, personal_coins")
    .eq("indicado_por", userId);
  const rede = redeRaw || [];
  const redeIds = rede.map((p: { id: string }) => p.id);
  const todosIds = access.role === "ADMIN" ? [] : [userId, ...redeIds];

  // Pipeline de leads
  const leadsQuery = supabase
    .from("crm_leads")
    .select("status, valor_estimado, data_followup, profile_id");

  const leadsQueryFinal = access.role === "ADMIN"
    ? leadsQuery
    : leadsQuery.or(
        [userId, ...redeIds].map((id) => `created_by.eq.${id},responsavel_id.eq.${id}`).join(",")
      );

  const { data: leadsRaw } = await leadsQueryFinal;
  const leads = leadsRaw || [];

  const pipeline = {
    novo:          leads.filter((l: any) => l.status === "novo").length,
    contato_feito: leads.filter((l: any) => l.status === "contato_feito").length,
    proposta:      leads.filter((l: any) => l.status === "proposta").length,
    negociacao:    leads.filter((l: any) => l.status === "negociacao").length,
    fechado:       leads.filter((l: any) => l.status === "fechado").length,
    perdido:       leads.filter((l: any) => l.status === "perdido").length,
    total:         leads.length,
    valor_pipeline: leads
      .filter((l: any) => !["fechado", "perdido"].includes(l.status))
      .reduce((s: number, l: any) => s + Number(l.valor_estimado || 0), 0),
  };

  const followupsAtrasados = leads.filter(
    (l: any) =>
      l.data_followup &&
      new Date(l.data_followup) < new Date(new Date().toDateString()) &&
      !["fechado", "perdido"].includes(l.status)
  ).length;

  // Pedidos da rede
  let pedidosRede: any[] = [];
  if (access.role === "ADMIN" || todosIds.length > 0) {
    const pedidosQuery = access.role === "ADMIN"
      ? supabase.from("orders").select("id, total, status, created_at, profile_id").order("created_at", { ascending: false }).limit(500)
      : supabase.from("orders").select("id, total, status, created_at, profile_id").in("profile_id", todosIds).order("created_at", { ascending: false }).limit(500);

    const { data } = await pedidosQuery;
    pedidosRede = data || [];
  }

  const pedidosPagosRede = pedidosRede.filter((p: any) => STATUS_PAGOS.includes(p.status));
  const pedidosMes = pedidosPagosRede.filter((p: any) => p.created_at >= inicioMes);

  const financeiro = {
    total_vendas_rede:  pedidosPagosRede.reduce((s: number, p: any) => s + Number(p.total || 0), 0),
    vendas_mes:         pedidosMes.reduce((s: number, p: any) => s + Number(p.total || 0), 0),
    total_pedidos_rede: pedidosPagosRede.length,
    pedidos_mes:        pedidosMes.length,
  };

  // Comissões (withdrawal_requests)
  const { data: comissoesRaw } = await supabase
    .from("withdrawal_requests")
    .select("id, amount, status, created_at")
    .eq("embaixador_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  const comissoes = comissoesRaw || [];
  const comissoesPagas = comissoes
    .filter((c: any) => c.status === "pago")
    .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const comissoesAguardando = comissoes
    .filter((c: any) => c.status === "aguardando")
    .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

  // Membros em risco (não compram há mais de 30 dias)
  const LIMITE_RISCO_DIAS = 30;
  const limite = new Date(Date.now() - LIMITE_RISCO_DIAS * 86_400_000).toISOString();
  let membrosEmRisco: { id: string; full_name: string; ultima_compra: string | null; dias: number }[] = [];

  if (redeIds.length > 0) {
    const { data: ultimasCompras } = await supabase
      .from("orders")
      .select("profile_id, created_at")
      .in("profile_id", redeIds)
      .in("status", STATUS_PAGOS)
      .order("created_at", { ascending: false });

    const ultimaPorMembro = new Map<string, string>();
    for (const o of (ultimasCompras || []) as any[]) {
      if (!ultimaPorMembro.has(o.profile_id)) {
        ultimaPorMembro.set(o.profile_id, o.created_at);
      }
    }

    for (const membro of rede as any[]) {
      const ultima = ultimaPorMembro.get(membro.id) || null;
      if (!ultima || ultima < limite) {
        const dias = ultima
          ? Math.floor((Date.now() - new Date(ultima).getTime()) / 86_400_000)
          : 999;
        membrosEmRisco.push({ id: membro.id, full_name: membro.full_name, ultima_compra: ultima, dias });
      }
    }
    membrosEmRisco.sort((a, b) => b.dias - a.dias);
    membrosEmRisco = membrosEmRisco.slice(0, 10);
  }

  // Taxa de conversão
  const taxaConversao = pipeline.total > 0
    ? Math.round((pipeline.fechado / pipeline.total) * 100)
    : 0;

  return NextResponse.json({
    ok: true,
    usuario: { full_name: access.full_name, role: access.role, avatar_url: access.avatar_url },
    pipeline: { ...pipeline, followups_atrasados: followupsAtrasados, taxa_conversao: taxaConversao },
    financeiro: {
      ...financeiro,
      comissoes_pagas: comissoesPagas,
      comissoes_aguardando: comissoesAguardando,
    },
    rede: {
      total: rede.length,
      lista: rede,
    },
    membros_em_risco: membrosEmRisco,
    ultimos_pedidos: pedidosPagosRede.slice(0, 8),
  });
}
