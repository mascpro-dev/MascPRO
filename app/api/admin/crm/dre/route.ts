import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function assertCrmAccess(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = String(data?.role || "").toUpperCase();
  if (!["ADMIN", "DISTRIBUIDOR"].includes(role)) return { ok: false as const, error: "Sem acesso." };
  return { ok: true as const, role };
}

// GET /api/admin/crm/dre?mes=2026-05
// Retorna Demonstração de Resultado do Exercício do período
export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const mes = new URL(req.url).searchParams.get("mes") || new Date().toISOString().slice(0, 7);
  const iniMes = `${mes}-01`;
  const fimMes = new Date(new Date(`${mes}-01`).getFullYear(), new Date(`${mes}-01`).getMonth() + 1, 0)
    .toISOString().slice(0, 10);

  // IDs da rede
  let redeIds: string[] = [];
  if (access.role !== "ADMIN") {
    const { data: rede } = await supabase.from("profiles").select("id").eq("indicado_por", userId);
    redeIds = (rede || []).map((p: any) => p.id);
  }
  const todosIds = access.role === "ADMIN" ? null : [userId, ...redeIds];

  // ── 1. RECEITA BRUTA (pedidos pagos no período) ──────────
  let pedidosQuery = supabase
    .from("orders")
    .select("id, total, status, shipping_cost, created_at, profile_id")
    .gte("created_at", iniMes)
    .lte("created_at", `${fimMes}T23:59:59`)
    .in("status", ["paid","separacao","despachado","entregue"]);

  if (todosIds) pedidosQuery = pedidosQuery.in("profile_id", todosIds);
  const { data: pedidos } = await pedidosQuery;

  const receitaBruta       = (pedidos || []).reduce((s: number, p: any) => s + Number(p.total || 0), 0);
  const receitaFrete        = (pedidos || []).reduce((s: number, p: any) => s + Number(p.shipping_cost || 0), 0);
  const receitaSemFrete     = receitaBruta - receitaFrete;

  // ── 2. DEVOLUÇÕES ────────────────────────────────────────
  const { data: devolucoes } = await supabase
    .from("returns")
    .select("valor_estorno")
    .eq("status", "concluido")
    .gte("created_at", iniMes)
    .lte("created_at", `${fimMes}T23:59:59`);
  const totalDevolucoes = (devolucoes || []).reduce((s: number, d: any) => s + Number(d.valor_estorno || 0), 0);

  const receitaLiquida = receitaBruta - totalDevolucoes;

  // ── 3. CMV (Custo da Mercadoria Vendida) ─────────────────
  const pedidoIds = (pedidos || []).map((p: any) => p.id);
  let cmv = 0;
  if (pedidoIds.length > 0) {
    const { data: itens } = await supabase
      .from("order_items")
      .select("product_id, quantidade")
      .in("order_id", pedidoIds);

    const prodIds = [...new Set((itens || []).map((i: any) => i.product_id).filter(Boolean))];
    if (prodIds.length > 0) {
      const { data: prods } = await supabase
        .from("products")
        .select("id, custo_unitario")
        .in("id", prodIds);
      const custoMap = new Map((prods || []).map((p: any) => [p.id, Number(p.custo_unitario || 0)]));
      for (const item of (itens || [])) {
        cmv += (custoMap.get(item.product_id) || 0) * Number(item.quantidade || 0);
      }
    }
  }

  const lucroBruto     = receitaLiquida - cmv;
  const margemBruta    = receitaLiquida > 0 ? Math.round((lucroBruto / receitaLiquida) * 100) : 0;

  // ── 4. COMISSÕES PAGAS NO PERÍODO ────────────────────────
  let comissoesQuery = supabase
    .from("commissions")
    .select("valor_comissao")
    .gte("created_at", iniMes)
    .lte("created_at", `${fimMes}T23:59:59`);
  if (todosIds) comissoesQuery = comissoesQuery.in("cabeleireiro_id", todosIds);
  const { data: comissoes } = await comissoesQuery;
  const totalComissoes = (comissoes || []).reduce((s: number, c: any) => s + Number(c.valor_comissao || 0), 0);

  // ── 5. SAQUES PAGOS (custo de distribuição) ──────────────
  const { data: saques } = await supabase
    .from("withdrawal_requests")
    .select("valor_liquido")
    .eq("status", "pago")
    .gte("created_at", iniMes)
    .lte("created_at", `${fimMes}T23:59:59`);
  const totalSaques = (saques || []).reduce((s: number, w: any) => s + Number(w.valor_liquido || 0), 0);

  // ── 6. EBITDA ────────────────────────────────────────────
  const despesasOperacionais = totalComissoes + totalSaques;
  const ebitda               = lucroBruto - despesasOperacionais;
  const margemEbitda         = receitaLiquida > 0 ? Math.round((ebitda / receitaLiquida) * 100) : 0;

  // ── 7. HISTÓRICO ÚLTIMOS 6 MESES ─────────────────────────
  const historico: any[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const m = d.toISOString().slice(0, 7);
    const ini = `${m}-01`;
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

    let hq = supabase.from("orders").select("total")
      .gte("created_at", ini).lte("created_at", `${fim}T23:59:59`)
      .in("status", ["paid","separacao","despachado","entregue"]);
    if (todosIds) hq = hq.in("profile_id", todosIds);
    const { data: hp } = await hq;
    const rec = (hp || []).reduce((s: number, p: any) => s + Number(p.total || 0), 0);
    historico.push({ mes: m, receita: rec });
  }

  return NextResponse.json({
    ok: true, mes,
    dre: {
      receita_bruta:          receitaBruta,
      receita_frete:          receitaFrete,
      receita_sem_frete:      receitaSemFrete,
      devolucoes:             totalDevolucoes,
      receita_liquida:        receitaLiquida,
      cmv,
      lucro_bruto:            lucroBruto,
      margem_bruta:           margemBruta,
      comissoes:              totalComissoes,
      saques:                 totalSaques,
      despesas_operacionais:  despesasOperacionais,
      ebitda,
      margem_ebitda:          margemEbitda,
      total_pedidos:          (pedidos || []).length,
      ticket_medio:           (pedidos || []).length > 0 ? receitaBruta / (pedidos || []).length : 0,
    },
    historico,
  });
}
