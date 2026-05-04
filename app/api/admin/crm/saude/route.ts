import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function assertCrmAccess(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  const role = String(data?.role || "").toUpperCase();
  if (!["ADMIN", "DISTRIBUIDOR"].includes(role)) {
    return { ok: false as const, error: "Acesso restrito." };
  }
  return { ok: true as const, role, full_name: data?.full_name as string };
}

const STATUS_PAGOS = ["paid", "separacao", "despachado", "entregue"];

// GET /api/admin/crm/saude
// Retorna saúde completa do negócio: estoque, curva ABC, clientes, pagamentos, margem
export async function GET() {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId)
    return NextResponse.json({ ok: false, error: authErr }, { status });

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok)
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  // IDs da rede do distribuidor (ou todos para ADMIN)
  let redeIds: string[] = [];
  let todosIdsRede: string[] = [];
  if (access.role === "ADMIN") {
    const { data: todos } = await supabase.from("profiles").select("id");
    todosIdsRede = (todos || []).map((p: any) => p.id);
  } else {
    const { data: rede } = await supabase.from("profiles").select("id, full_name").eq("indicado_por", userId);
    redeIds = (rede || []).map((p: any) => p.id);
    todosIdsRede = [userId, ...redeIds];
  }

  // ─── 1. ESTOQUE DE PRODUTOS ─────────────────────────────
  const { data: produtosRaw } = await supabase
    .from("products")
    .select("id, title, stock, ativo, price_hairdresser, price_ambassador, price_distributor, volume")
    .order("stock", { ascending: true });

  const produtos = (produtosRaw || []).map((p: any) => ({
    ...p,
    risco: p.stock === 0 ? "critico" : p.stock <= 5 ? "baixo" : p.stock <= 20 ? "atencao" : "ok",
  }));

  const estoque = {
    total_produtos: produtos.length,
    ativos: produtos.filter((p: any) => p.ativo).length,
    criticos: produtos.filter((p: any) => p.risco === "critico").length,
    baixos: produtos.filter((p: any) => p.risco === "baixo").length,
    lista: produtos.slice(0, 50),
  };

  // ─── 2. PEDIDOS PAGOS DA REDE (base para análises) ─────
  const pedidosQuery = access.role === "ADMIN"
    ? supabase.from("orders").select("id, total, status, payment_method, shipping_cost, created_at, profile_id")
        .in("status", STATUS_PAGOS).order("created_at", { ascending: false }).limit(2000)
    : supabase.from("orders").select("id, total, status, payment_method, shipping_cost, created_at, profile_id")
        .in("status", STATUS_PAGOS).in("profile_id", todosIdsRede).order("created_at", { ascending: false }).limit(2000);

  const { data: pedidosRaw } = await pedidosQuery;
  const pedidos = pedidosRaw || [];
  const pedidoIds = pedidos.map((p: any) => p.id);

  // ─── 3. ITENS DOS PEDIDOS (curva ABC + margem) ──────────
  let itensBrutos: any[] = [];
  if (pedidoIds.length > 0) {
    const { data: itens } = await supabase
      .from("order_items")
      .select("order_id, product_id, quantidade, preco_unitario")
      .in("order_id", pedidoIds);
    itensBrutos = itens || [];
  }

  // Junta com dados do produto para calcular margem
  const prodMap = new Map(produtos.map((p: any) => [p.id, p]));

  type ItemProcessado = {
    product_id: string;
    title: string;
    qtd: number;
    receita: number;
    custo: number; // price_distributor como base de custo
    margem_rs: number;
    margem_pct: number;
  };

  const porProduto = new Map<string, ItemProcessado>();

  for (const item of itensBrutos) {
    const prod: any = prodMap.get(item.product_id);
    const titulo = prod?.title || "Produto removido";
    const qtd = Number(item.quantidade || 0);
    const receita = Number(item.preco_unitario || 0) * qtd;
    // Custo real: usa custo_unitario se existir, senão price_distributor como fallback
    const custo = Number(prod?.custo_unitario || prod?.price_distributor || 0) * qtd;

    if (!porProduto.has(item.product_id)) {
      porProduto.set(item.product_id, { product_id: item.product_id, title: titulo, qtd: 0, receita: 0, custo: 0, margem_rs: 0, margem_pct: 0 });
    }
    const entry = porProduto.get(item.product_id)!;
    entry.qtd += qtd;
    entry.receita += receita;
    entry.custo += custo;
  }

  // Calcula margem %
  for (const entry of porProduto.values()) {
    entry.margem_rs = entry.receita - entry.custo;
    entry.margem_pct = entry.receita > 0 ? Math.round((entry.margem_rs / entry.receita) * 100) : 0;
  }

  // ─── 4. CURVA ABC (Pareto) ──────────────────────────────
  const rankingProdutos = Array.from(porProduto.values())
    .sort((a, b) => b.receita - a.receita);

  const receitaTotal = rankingProdutos.reduce((s, p) => s + p.receita, 0);
  let acumulado = 0;
  const curvaABC = rankingProdutos.map((p) => {
    acumulado += p.receita;
    const pct_acumulado = receitaTotal > 0 ? (acumulado / receitaTotal) * 100 : 0;
    const curva = pct_acumulado <= 80 ? "A" : pct_acumulado <= 95 ? "B" : "C";
    return { ...p, pct_receita: receitaTotal > 0 ? Math.round((p.receita / receitaTotal) * 100) : 0, pct_acumulado: Math.round(pct_acumulado), curva };
  });

  const resumoCurva = {
    A: { count: curvaABC.filter(p => p.curva === "A").length, receita: curvaABC.filter(p => p.curva === "A").reduce((s, p) => s + p.receita, 0) },
    B: { count: curvaABC.filter(p => p.curva === "B").length, receita: curvaABC.filter(p => p.curva === "B").reduce((s, p) => s + p.receita, 0) },
    C: { count: curvaABC.filter(p => p.curva === "C").length, receita: curvaABC.filter(p => p.curva === "C").reduce((s, p) => s + p.receita, 0) },
  };

  // ─── 5. SAÚDE DOS CLIENTES ──────────────────────────────
  const agora = Date.now();
  const ultimaCompraPorCliente = new Map<string, number>();

  for (const pedido of pedidos) {
    const t = new Date(pedido.created_at).getTime();
    const atual = ultimaCompraPorCliente.get(pedido.profile_id) || 0;
    if (t > atual) ultimaCompraPorCliente.set(pedido.profile_id, t);
  }

  type ClasseCliente = "ativo" | "retornando" | "risco" | "perdido" | "nunca_comprou";
  const classCliente = (profileId: string): ClasseCliente => {
    const ultima = ultimaCompraPorCliente.get(profileId);
    if (!ultima) return "nunca_comprou";
    const dias = Math.floor((agora - ultima) / 86_400_000);
    if (dias <= 30) return "ativo";
    if (dias <= 90) return "retornando";
    if (dias <= 180) return "risco";
    return "perdido";
  };

  const clientesStats = {
    ativos:        todosIdsRede.filter(id => classCliente(id) === "ativo").length,
    retornando:    todosIdsRede.filter(id => classCliente(id) === "retornando").length,
    risco:         todosIdsRede.filter(id => classCliente(id) === "risco").length,
    perdidos:      todosIdsRede.filter(id => classCliente(id) === "perdido").length,
    nunca_comprou: todosIdsRede.filter(id => classCliente(id) === "nunca_comprou").length,
  };

  // ─── 6. FORMAS DE PAGAMENTO ─────────────────────────────
  const pagamentos: Record<string, { count: number; total: number }> = {};
  for (const pedido of pedidos) {
    const metodo = pedido.payment_method || "outros";
    if (!pagamentos[metodo]) pagamentos[metodo] = { count: 0, total: 0 };
    pagamentos[metodo].count++;
    pagamentos[metodo].total += Number(pedido.total || 0);
  }
  const pagamentosArray = Object.entries(pagamentos)
    .map(([metodo, d]) => ({ metodo, ...d }))
    .sort((a, b) => b.total - a.total);

  // ─── 7. VALORES EM ABERTO ───────────────────────────────
  const pendingQuery = access.role === "ADMIN"
    ? supabase.from("orders").select("id, total, status, payment_method, created_at, profile_id, profiles!orders_profile_id_fkey(full_name)")
        .in("status", ["pending"]).order("created_at", { ascending: false }).limit(100)
    : supabase.from("orders").select("id, total, status, payment_method, created_at, profile_id, profiles!orders_profile_id_fkey(full_name)")
        .in("status", ["pending"]).in("profile_id", todosIdsRede).order("created_at", { ascending: false }).limit(100);

  const { data: pedidosPendentes } = await pendingQuery;

  const valoresEmAberto = {
    total: (pedidosPendentes || []).reduce((s: number, p: any) => s + Number(p.total || 0), 0),
    count: (pedidosPendentes || []).length,
    lista: (pedidosPendentes || []).slice(0, 10),
  };

  // ─── 8. TENDÊNCIA DE RECEITA (últimos 6 meses) ──────────
  const tendencia: { mes: string; receita: number; pedidos: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const mes = d.toISOString().slice(0, 7);
    const pedidosMes = pedidos.filter((p: any) => p.created_at.startsWith(mes));
    tendencia.push({
      mes,
      receita: pedidosMes.reduce((s: number, p: any) => s + Number(p.total || 0), 0),
      pedidos: pedidosMes.length,
    });
  }

  // ─── 9. TOP MARGENS ─────────────────────────────────────
  const topMargem = [...porProduto.values()]
    .filter(p => p.qtd > 0)
    .sort((a, b) => b.margem_pct - a.margem_pct)
    .slice(0, 10);

  // ─── 10. SCORE RFM ──────────────────────────────────────
  // R=Recência (dias desde última compra) F=Frequência (nº pedidos) M=Monetário (total gasto)
  const rfmMap = new Map<string, { profile_id: string; ultima_compra: number; frequencia: number; monetario: number }>();
  for (const pedido of pedidos as any[]) {
    const t = new Date(pedido.created_at).getTime();
    const e = rfmMap.get(pedido.profile_id) || { profile_id: pedido.profile_id, ultima_compra: 0, frequencia: 0, monetario: 0 };
    if (t > e.ultima_compra) e.ultima_compra = t;
    e.frequencia++;
    e.monetario += Number(pedido.total || 0);
    rfmMap.set(pedido.profile_id, e);
  }

  const rfmList = Array.from(rfmMap.values()).map(c => {
    const dias = Math.floor((agora - c.ultima_compra) / 86_400_000);
    // Score 1-5 para cada dimensão
    const r = dias <= 7 ? 5 : dias <= 30 ? 4 : dias <= 90 ? 3 : dias <= 180 ? 2 : 1;
    const fMax = Math.max(...Array.from(rfmMap.values()).map(x => x.frequencia), 1);
    const mMax = Math.max(...Array.from(rfmMap.values()).map(x => x.monetario), 1);
    const f = Math.ceil((c.frequencia / fMax) * 5);
    const m = Math.ceil((c.monetario / mMax) * 5);
    const score = r + f + m;
    const segmento = score >= 13 ? "VIP" : score >= 9 ? "Leal" : score >= 6 ? "Regular" : score >= 3 ? "Em Risco" : "Perdido";
    return { ...c, dias_sem_comprar: dias, score_r: r, score_f: f, score_m: m, score_total: score, segmento };
  }).sort((a, b) => b.score_total - a.score_total).slice(0, 50);

  const rfmResumo = {
    VIP:      rfmList.filter(c => c.segmento === "VIP").length,
    Leal:     rfmList.filter(c => c.segmento === "Leal").length,
    Regular:  rfmList.filter(c => c.segmento === "Regular").length,
    em_risco: rfmList.filter(c => c.segmento === "Em Risco").length,
    perdido:  rfmList.filter(c => c.segmento === "Perdido").length,
  };

  return NextResponse.json({
    ok: true,
    estoque,
    curva_abc: { resumo: resumoCurva, lista: curvaABC.slice(0, 30) },
    clientes: clientesStats,
    rfm: { resumo: rfmResumo, lista: rfmList },
    pagamentos: pagamentosArray,
    valores_em_aberto: valoresEmAberto,
    tendencia,
    top_margem: topMargem,
    receita_total: receitaTotal,
  });
}
