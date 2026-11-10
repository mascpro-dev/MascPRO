import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { idsRedeComercial } from "@/lib/crmCarteiraServidor";
import { assertForcaAcesso } from "@/lib/forcaAcesso";
import { STATUS_PEDIDO_CONFIRMADO, dataHojeSaoPaulo, intervaloDiaSaoPaulo } from "@/lib/forcaVendasDia";
import { calcularProgresso, calcularRealizadoVendedor } from "@/lib/vendedorMetas";
import { carregarTabelaPrecosDistribuidor } from "@/lib/vendedorPrecos";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });
  const access = await assertForcaAcesso(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const periodo = dataHojeSaoPaulo().slice(0, 7);
  const ini = intervaloDiaSaoPaulo(`${periodo}-01`).ini;
  const rede = access.papel === "DISTRIBUIDOR" ? await idsRedeComercial(supabase, userId) : [];

  let pedidosQuery = supabase
    .from("orders")
    .select("id, total, status, created_at, crm_lead_id")
    .gte("created_at", ini)
    .order("created_at", { ascending: false })
    .limit(30);
  let pedidosMesQuery = supabase.from("orders").select("total, status").gte("created_at", ini);
  let visitasQuery = supabase
    .from("crm_visitas")
    .select("id, crm_lead_id, cliente_nome, cliente_telefone, cliente_cidade, resultado, notas, data_visita, encerrada_em")
    .gte("data_visita", ini)
    .order("data_visita", { ascending: false })
    .limit(30);
  let visitasCountQuery = supabase
    .from("crm_visitas")
    .select("id", { count: "exact", head: true })
    .gte("data_visita", ini);
  let clientesQuery = supabase
    .from("crm_leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", ini);

  if (access.papel === "VENDEDOR") {
    pedidosQuery = pedidosQuery.eq("vendedor_id", userId);
    pedidosMesQuery = pedidosMesQuery.eq("vendedor_id", userId);
    visitasQuery = visitasQuery.eq("vendedor_id", userId);
    visitasCountQuery = visitasCountQuery.eq("vendedor_id", userId);
    clientesQuery = clientesQuery.or(`created_by.eq.${userId},responsavel_id.eq.${userId}`);
  } else if (access.papel === "DISTRIBUIDOR") {
    const ids = rede.join(",");
    const filtroPedido = `vendedor_id.in.(${ids}),distribuidor_gestor_id.eq.${userId}`;
    const filtroVisita = `vendedor_id.in.(${ids}),distribuidor_id.eq.${userId}`;
    pedidosQuery = pedidosQuery.or(filtroPedido);
    pedidosMesQuery = pedidosMesQuery.or(filtroPedido);
    visitasQuery = visitasQuery.or(filtroVisita);
    visitasCountQuery = visitasCountQuery.or(filtroVisita);
    clientesQuery = clientesQuery.or(`created_by.in.(${ids}),responsavel_id.in.(${ids})`);
  }

  const [pedidosRes, pedidosMesRes, visitasRes, visitasCountRes, clientesRes, produtosRes] = await Promise.all([
    pedidosQuery,
    pedidosMesQuery,
    visitasQuery,
    visitasCountQuery,
    clientesQuery,
    supabase
      .from("products")
      .select("id, title, linha, price, price_hairdresser, stock, ativo")
      .eq("ativo", true)
      .order("title", { ascending: true })
      .limit(200),
  ]);

  if (pedidosRes.error) return NextResponse.json({ ok: false, error: pedidosRes.error.message }, { status: 500 });
  if (pedidosMesRes.error) return NextResponse.json({ ok: false, error: pedidosMesRes.error.message }, { status: 500 });
  if (visitasRes.error) return NextResponse.json({ ok: false, error: visitasRes.error.message }, { status: 500 });
  if (produtosRes.error) return NextResponse.json({ ok: false, error: produtosRes.error.message }, { status: 500 });

  const pedidos = pedidosRes.data || [];
  const doMes = pedidosMesRes.data || [];
  const confirmados = doMes.filter((p) => STATUS_PEDIDO_CONFIRMADO.includes(String(p.status)));
  const receita = confirmados.reduce((acc, p) => acc + Number(p.total || 0), 0);
  const leadIds = [...new Set(pedidos.map((p) => p.crm_lead_id).filter(Boolean))] as string[];
  const nomes = new Map<string, string>();
  if (leadIds.length > 0) {
    const { data: leads } = await supabase.from("crm_leads").select("id, nome, empresa").in("id", leadIds);
    for (const lead of leads || []) nomes.set(lead.id, lead.empresa || lead.nome || "Salão");
  }

  let precos = new Map<string, { preco_final: number }>();
  if (access.distribuidor_id) {
    try {
      precos = await carregarTabelaPrecosDistribuidor(supabase, access.distribuidor_id);
    } catch {
      precos = new Map();
    }
  }

  let metas: {
    meta: { meta_leads: number; meta_visitas: number; meta_conversoes: number; meta_receita: number };
    realizado: { leads: number; visitas: number; conversoes: number; receita: number };
    progresso: { leads: number; visitas: number; conversoes: number; receita: number };
  } | null = null;
  if (access.papel === "VENDEDOR") {
    const { data: metaRow } = await supabase
      .from("vendedor_metas")
      .select("meta_leads, meta_visitas, meta_conversoes, meta_receita")
      .eq("vendedor_id", userId)
      .eq("periodo", periodo)
      .maybeSingle();
    const meta = {
      meta_leads: Number(metaRow?.meta_leads || 0),
      meta_visitas: Number(metaRow?.meta_visitas || 0),
      meta_conversoes: Number(metaRow?.meta_conversoes || 0),
      meta_receita: Number(metaRow?.meta_receita || 0),
    };
    const realizado = await calcularRealizadoVendedor(supabase, userId, periodo);
    metas = { meta, realizado, progresso: calcularProgresso(meta, realizado) };
  }

  return NextResponse.json({
    ok: true,
    papel: access.papel,
    usuario: access.full_name,
    periodo,
    web: access.papel === "VENDEDOR" ? "/vendedor/crm/dashboard" : "/admin/crm/dashboard",
    resumo: {
      visitas: visitasCountRes.count || 0,
      pedidos: doMes.length,
      pedidos_confirmados: confirmados.length,
      receita: Math.round(receita * 100) / 100,
      clientes: clientesRes.count || 0,
    },
    pedidos: pedidos.map((p) => ({
      ...p,
      cliente: p.crm_lead_id ? nomes.get(p.crm_lead_id) || "Salão" : "Pedido",
    })),
    visitas: visitasRes.data || [],
    metas,
    produtos: (produtosRes.data || []).map((p) => {
      const tabela = precos.get(p.id);
      const tabelaBase = Number(p.price_hairdresser) || Number(p.price) || 0;
      const preco = tabela ? tabela.preco_final : tabelaBase;
      return {
        id: p.id,
        title: p.title,
        linha: p.linha,
        preco,
        preco_tabela: tabelaBase,
        estoque_central: Number(p.stock || 0),
      };
    }),
  });
}
