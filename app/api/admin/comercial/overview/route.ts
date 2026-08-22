import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";
import { registrarAudit } from "@/lib/auditLog";
import {
  STATUS_PEDIDO_PAGO,
  ORIGEM_LEAD_LABEL,
  ROLE_LABEL,
  CHAVE_METAS_COMERCIAL,
  METAS_VAZIAS,
  parseMetasPorPeriodo,
  gravarMetasPeriodo,
  semaforoComercial,
  notaMeta,
  progressoMeta,
  pctSeguro,
  DEFINICOES_FASE1,
  type MetasCiclo,
} from "@/lib/comercialMetricas";
import {
  COLUNAS_KANBAN_CRM,
  LINHAS_PRODUTO,
  STATUS_FUNIL_PRINCIPAL,
  statusContaFollowup,
  statusPipelineAberto,
} from "@/lib/comercialClassificacao";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE = 1000;

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  let from = 0;
  for (let i = 0; i < 50; i++) {
    const res = await fetchPage(from, from + PAGE - 1);
    if (res.error) return { rows: [], error: res.error.message };
    const chunk = res.data || [];
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return { rows, error: null };
}

function ymOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

function boundsMes(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const ini = new Date(y, m - 1, 1);
  const fim = new Date(y, m, 0, 23, 59, 59, 999);
  return { ini: ini.toISOString(), fim: fim.toISOString() };
}

function mesAnterior(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return ymOf(new Date(y, m - 2, 1));
}

function mesesAte(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(ymOf(new Date(y, m - 1 - i, 1)));
  return out;
}

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const admin = await assertAdmin(supabase, userId);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
  }

  const agora = new Date();
  const periodo = req.nextUrl.searchParams.get("periodo") || ymOf(agora);
  const prev = mesAnterior(periodo);
  const janela = mesesAte(periodo, 6);
  const inicioPedidos = boundsMes(mesesAte(periodo, 18)[0]).ini;
  const { ini: iniMes, fim: fimMes } = boundsMes(periodo);
  const { ini: iniPrev, fim: fimPrev } = boundsMes(prev);

  let [leadsRes, pedidosRes, embCount, distCount, metasCfg] = await Promise.all([
    fetchAllRows<{
      id: string;
      created_at: string;
      status: string;
      origem: string | null;
      data_followup: string | null;
      linha_interesse: string | null;
    }>(async (from, to) =>
      supabase
        .from("crm_leads")
        .select("id, created_at, status, origem, data_followup, linha_interesse")
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    fetchAllRows<{
      id: string;
      total: unknown;
      status: string;
      created_at: string;
      profile_id: string | null;
    }>(async (from, to) =>
      supabase
        .from("orders")
        .select("id, total, status, created_at, profile_id")
        .in("status", [...STATUS_PEDIDO_PAGO])
        .gte("created_at", inicioPedidos)
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    supabase.from("profiles").select("id", { count: "exact", head: true }).ilike("role", "embaixador"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).ilike("role", "distribuidor"),
    supabase.from("system_config").select("valor").eq("chave", CHAVE_METAS_COMERCIAL).maybeSingle(),
  ]);

  if (leadsRes.error) {
    const fallback = await fetchAllRows<{
      id: string;
      created_at: string;
      status: string;
      origem: string | null;
      data_followup: string | null;
      linha_interesse: string | null;
    }>(async (from, to) =>
      supabase
        .from("crm_leads")
        .select("id, created_at, status, origem, data_followup")
        .order("created_at", { ascending: false })
        .range(from, to)
    );
    if (fallback.error) {
      return NextResponse.json({ ok: false, error: `leads: ${leadsRes.error}` }, { status: 500 });
    }
    leadsRes = {
      rows: fallback.rows.map((r) => ({ ...r, linha_interesse: r.linha_interesse ?? null })),
      error: null,
    };
  }
  if (pedidosRes.error) {
    return NextResponse.json({ ok: false, error: `pedidos: ${pedidosRes.error}` }, { status: 500 });
  }

  const metas = parseMetasPorPeriodo(metasCfg.data?.valor, periodo);
  const leads = leadsRes.rows;
  const pedidos = pedidosRes.rows;
  const noMes = (iso: string, ini: string, fim: string) => iso >= ini && iso <= fim;

  const leadsMes = leads.filter((l) => noMes(l.created_at, iniMes, fimMes));
  const leadsPrev = leads.filter((l) => noMes(l.created_at, iniPrev, fimPrev));
  const pedidosMes = pedidos.filter((p) => noMes(p.created_at, iniMes, fimMes));
  const pedidosPrev = pedidos.filter((p) => noMes(p.created_at, iniPrev, fimPrev));

  const somaFat = (lista: typeof pedidos) => lista.reduce((s, p) => s + Number(p.total || 0), 0);
  const fatMes = somaFat(pedidosMes);
  const fatPrev = somaFat(pedidosPrev);
  const ticketMes = pedidosMes.length ? fatMes / pedidosMes.length : 0;
  const ticketPrev = pedidosPrev.length ? fatPrev / pedidosPrev.length : 0;

  const porStatus = (key: string) => leads.filter((l) => l.status === key).length;
  const pipeline = {
    novo: porStatus("novo"),
    contato_feito: porStatus("contato_feito"),
    qualificado: porStatus("qualificado"),
    diagnostico: porStatus("diagnostico"),
    proposta: porStatus("proposta"),
    negociacao: porStatus("negociacao"),
    fechado: porStatus("fechado"),
    perdido: porStatus("perdido"),
    reativar: porStatus("reativar"),
    nao_qualificado: porStatus("nao_qualificado"),
    total: leads.length,
  };
  const pipelineAberto = leads.filter((l) => statusPipelineAberto(l.status)).length;

  const hoje0 = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const followupsAtrasados = leads.filter(
    (l) =>
      l.data_followup &&
      new Date(l.data_followup).getTime() < hoje0 &&
      statusContaFollowup(l.status)
  ).length;

  const primeiraCompra = new Map<string, string>();
  for (const p of [...pedidos].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!p.profile_id) continue;
    if (!primeiraCompra.has(p.profile_id)) primeiraCompra.set(p.profile_id, p.created_at);
  }
  const contarRecompras = (lista: typeof pedidos, ini: string) =>
    lista.filter((p) => {
      if (!p.profile_id) return false;
      const prim = primeiraCompra.get(p.profile_id);
      return prim != null && prim < ini;
    }).length;
  const recomprasMes = contarRecompras(pedidosMes, iniMes);
  const recomprasPrev = contarRecompras(pedidosPrev, iniPrev);

  const compradores = new Set(pedidos.map((p) => p.profile_id).filter(Boolean) as string[]);
  const freq = new Map<string, number>();
  for (const p of pedidos) {
    if (!p.profile_id) continue;
    freq.set(p.profile_id, (freq.get(p.profile_id) || 0) + 1);
  }
  const repetiram = [...freq.values()].filter((n) => n >= 2).length;
  const taxaRecompra = pctSeguro(repetiram, compradores.size);

  const aposNovo =
    pipeline.contato_feito +
    pipeline.qualificado +
    pipeline.diagnostico +
    pipeline.proposta +
    pipeline.negociacao +
    pipeline.fechado;
  const aposContato =
    pipeline.qualificado + pipeline.diagnostico + pipeline.proposta + pipeline.negociacao + pipeline.fechado;
  const aposQualif = pipeline.diagnostico + pipeline.proposta + pipeline.negociacao + pipeline.fechado;
  const emProposta = pipeline.proposta + pipeline.negociacao + pipeline.fechado;
  const usaQualif = pipeline.qualificado + pipeline.diagnostico > 0;
  const denProposta = usaQualif
    ? pipeline.diagnostico + emProposta
    : pipeline.contato_feito + emProposta;
  const denFecha = pipeline.proposta + pipeline.negociacao + pipeline.fechado;

  const gauges = [
    {
      label: "Contato",
      value: pctSeguro(aposNovo, aposNovo + pipeline.novo),
      formula: "saiu de Novo ÷ (isso + ainda em Novo)",
    },
    {
      label: "Qualificação",
      value: pctSeguro(aposContato, pipeline.contato_feito + aposContato),
      formula: "(qualificado + diagnóstico + proposta + negociação + fechado) ÷ (contato + esses)",
    },
    {
      label: "Diagnóstico",
      value: pctSeguro(aposQualif, pipeline.qualificado + aposQualif),
      formula: "(diagnóstico + proposta + negociação + fechado) ÷ (qualificado + esses)",
    },
    {
      label: "Proposta",
      value: pctSeguro(emProposta, denProposta),
      formula: usaQualif
        ? "(proposta + negociação + fechado) ÷ (diagnóstico + esses)"
        : "(proposta + negociação + fechado) ÷ (contato + esses)",
    },
    {
      label: "Fechamento",
      value: pctSeguro(pipeline.fechado, denFecha),
      formula: "fechado ÷ (proposta + negociação + fechado)",
    },
    {
      label: "Conversão",
      value: pctSeguro(pipeline.fechado, pipeline.total),
      formula: "fechado ÷ total de leads do CRM",
    },
    {
      label: "Recompra",
      value: taxaRecompra,
      formula: "compradores com 2+ pedidos pagos no recorte ÷ compradores",
    },
  ];

  const diagnosticos: { problema: string; leitura: string }[] = [];
  if (pipeline.total >= 8 && pctSeguro(aposNovo, aposNovo + pipeline.novo) < 50) {
    diagnosticos.push({
      problema: "Muito lead parado em Novo",
      leitura: "Atendimento fraco ou lead sem dono. Todo lead precisa de responsável e próximo passo.",
    });
  }
  if (pipeline.contato_feito >= 8 && pctSeguro(aposContato, pipeline.contato_feito + aposContato) < 40) {
    diagnosticos.push({
      problema: "Contato sem qualificar",
      leitura: "A conversa começa e não vira perfil/dor/linha. Classificar o lead é a fase 2.",
    });
  }
  if (pipeline.qualificado >= 5 && pctSeguro(aposQualif, pipeline.qualificado + aposQualif) < 40) {
    diagnosticos.push({
      problema: "Qualificado sem diagnóstico",
      leitura: "Lead entra e não sai oferta de linha. Registrar dor e linha de interesse.",
    });
  }
  if (denProposta >= 8 && pctSeguro(emProposta, denProposta) < 40) {
    diagnosticos.push({
      problema: "Contato sem virar proposta",
      leitura: "Conversa começa e não vira oferta. Revisar script e indicação de kit.",
    });
  }
  if (denFecha >= 5 && pctSeguro(pipeline.fechado, denFecha) < 40) {
    diagnosticos.push({
      problema: "Muita proposta, pouco fechamento",
      leitura: "Objeção mal respondida ou oferta fraca.",
    });
  }
  if (pedidosMes.length >= 5 && pctSeguro(recomprasMes, pedidosMes.length) < 20) {
    diagnosticos.push({
      problema: "Venda sem recompra",
      leitura: "Pós-venda fraco. Marque o kit em Pedidos e cumpra a régua 7/15/30 na aba Home care.",
    });
  }
  if (!diagnosticos.length && pipeline.total > 0) {
    diagnosticos.push({
      problema: "Funil operando",
      leitura: "Nenhum gargalo gritante neste recorte. Olhe follow-ups atrasados e origem.",
    });
  }

  const serie = janela.map((ym) => {
    const b = boundsMes(ym);
    const l = leads.filter((x) => noMes(x.created_at, b.ini, b.fim));
    const p = pedidos.filter((x) => noMes(x.created_at, b.ini, b.fim));
    return {
      mes: ym,
      label: mesLabel(ym),
      leads: l.length,
      pedidos: p.length,
      faturamento: somaFat(p),
      ticket: p.length ? somaFat(p) / p.length : 0,
      recompras: contarRecompras(p, b.ini),
    };
  });

  const origemBase = leadsMes.reduce((acc, l) => {
    const k = (l.origem || "outro").toLowerCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const origens = Object.entries(origemBase)
    .map(([key, n]) => ({ key, label: ORIGEM_LEAD_LABEL[key] || key, n }))
    .sort((a, b) => b.n - a.n);

  const pedidoIds = pedidosMes.map((p) => p.id);
  const itens: { product_id: string | null; quantidade: unknown; preco_unitario: unknown }[] = [];
  for (let i = 0; i < pedidoIds.length; i += 80) {
    const chunk = pedidoIds.slice(i, i + 80);
    const { data, error } = await supabase
      .from("order_items")
      .select("product_id, quantidade, preco_unitario")
      .in("order_id", chunk);
    if (error) {
      return NextResponse.json({ ok: false, error: `itens: ${error.message}` }, { status: 500 });
    }
    itens.push(...(data || []));
  }

  const porProduto = new Map<string, { qtd: number; receita: number }>();
  for (const it of itens) {
    const id = it.product_id || "_sem";
    const cur = porProduto.get(id) || { qtd: 0, receita: 0 };
    const qtd = Number(it.quantidade || 0);
    cur.qtd += qtd;
    cur.receita += Number(it.preco_unitario || 0) * qtd;
    porProduto.set(id, cur);
  }
  const prodIds = [...porProduto.keys()].filter((id) => id !== "_sem");
  const titulos = new Map<string, string>();
  const linhaPorProduto = new Map<string, string | null>();
  for (let i = 0; i < prodIds.length; i += 80) {
    const chunkIds = prodIds.slice(i, i + 80);
    let { data, error } = await supabase.from("products").select("id, title, linha").in("id", chunkIds);
    if (error) {
      const retry = await supabase.from("products").select("id, title").in("id", chunkIds);
      data = retry.data as typeof data;
    }
    for (const p of data || []) {
      titulos.set(p.id, p.title);
      linhaPorProduto.set(p.id, (p as { linha?: string | null }).linha || null);
    }
  }
  const topProdutos = [...porProduto.entries()]
    .map(([id, v]) => ({
      id,
      title: id === "_sem" ? "Item sem produto" : titulos.get(id) || "Produto removido",
      qtd: v.qtd,
      receita: v.receita,
    }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 7);

  const porLinhaMap = new Map<string, { qtd: number; receita: number }>();
  for (const [id, v] of porProduto.entries()) {
    const key = id === "_sem" ? "_sem" : linhaPorProduto.get(id) || "_sem";
    const cur = porLinhaMap.get(key) || { qtd: 0, receita: 0 };
    cur.qtd += v.qtd;
    cur.receita += v.receita;
    porLinhaMap.set(key, cur);
  }
  const porLinha = LINHAS_PRODUTO.map((l) => {
    const v = porLinhaMap.get(l.value) || { qtd: 0, receita: 0 };
    return { key: l.value, label: l.label, qtd: v.qtd, receita: v.receita };
  }).concat(
    porLinhaMap.has("_sem")
      ? [{ key: "_sem", label: "Sem linha", qtd: porLinhaMap.get("_sem")!.qtd, receita: porLinhaMap.get("_sem")!.receita }]
      : []
  );

  const leadsLinhaBase = leadsMes.reduce((acc, l) => {
    const k = l.linha_interesse || "_sem";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const leadsPorLinha = [
    ...LINHAS_PRODUTO.map((l) => ({ key: l.value, label: l.label, n: leadsLinhaBase[l.value] || 0 })),
    ...(leadsLinhaBase._sem
      ? [{ key: "_sem", label: "Sem linha", n: leadsLinhaBase._sem }]
      : []),
  ];

  const buyerIds = [...new Set(pedidosMes.map((p) => p.profile_id).filter(Boolean) as string[])];
  const roleMap = new Map<string, string>();
  for (let i = 0; i < buyerIds.length; i += 80) {
    const { data } = await supabase.from("profiles").select("id, role").in("id", buyerIds.slice(i, i + 80));
    for (const p of data || []) roleMap.set(p.id, String(p.role || "").toUpperCase());
  }
  const porRole = new Map<string, { pedidos: number; faturamento: number }>();
  for (const p of pedidosMes) {
    const role = (p.profile_id && roleMap.get(p.profile_id)) || "SEM_PERFIL";
    const cur = porRole.get(role) || { pedidos: 0, faturamento: 0 };
    cur.pedidos += 1;
    cur.faturamento += Number(p.total || 0);
    porRole.set(role, cur);
  }
  const quemConverte = [...porRole.entries()]
    .map(([role, v]) => ({
      role,
      label: ROLE_LABEL[role] || role,
      pedidos: v.pedidos,
      faturamento: v.faturamento,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);

  const funil = COLUNAS_KANBAN_CRM.map((c) => ({
    key: c.key,
    label: c.label,
    n: pipeline[c.key as keyof typeof pipeline] as number,
  }));

  function kpi(
    key: string,
    label: string,
    value: number,
    anterior: number | null,
    formato: "int" | "moeda",
    meta: number,
    spark: number[],
    invertido = false
  ) {
    const status = semaforoComercial({ atual: value, anterior, meta, invertido });
    return {
      key,
      label,
      value,
      anterior,
      formato,
      meta: meta > 0 ? meta : null,
      progresso: progressoMeta(value, meta),
      nota: notaMeta(value, meta),
      status,
      spark,
      referencia: meta > 0 ? "meta" : anterior != null ? "mes_anterior" : "posicao",
    };
  }

  const kpis = [
    kpi("leads", "Leads no mês", leadsMes.length, leadsPrev.length, "int", metas.leads, serie.map((s) => s.leads)),
    kpi("pipeline", "Pipeline aberto", pipelineAberto, null, "int", 0, serie.map((s) => s.leads)),
    kpi("pedidos", "Pedidos pagos", pedidosMes.length, pedidosPrev.length, "int", metas.pedidos, serie.map((s) => s.pedidos)),
    kpi("faturamento", "Faturamento", fatMes, fatPrev, "moeda", metas.receita, serie.map((s) => s.faturamento)),
    kpi("ticket", "Ticket médio", ticketMes, ticketPrev, "moeda", 0, serie.map((s) => s.ticket)),
    kpi("followups", "Follow-ups atrasados", followupsAtrasados, null, "int", 0, [], true),
    kpi("recompras", "Recompras no mês", recomprasMes, recomprasPrev, "int", metas.recompras, serie.map((s) => s.recompras)),
    kpi("embaixadoras", "Embaixadoras", embCount.count || 0, null, "int", 0, []),
  ];

  const scorecard = kpis
    .filter((k) => k.meta != null || k.anterior != null)
    .map((k) => ({
      area: k.label,
      atual: k.value,
      anterior: k.anterior,
      meta: k.meta,
      progresso: k.progresso,
      nota: k.nota,
      formato: k.formato,
      status: k.status,
      referencia: k.referencia,
    }));

  const origemTop = origens[0];
  const produtoTop = topProdutos[0];
  const converteTop = quemConverte[0];
  const linhaTop = [...porLinha].filter((l) => l.key !== "_sem").sort((a, b) => b.receita - a.receita)[0];
  const etapasFluxo = STATUS_FUNIL_PRINCIPAL
    .map((key) => funil.find((f) => f.key === key)!)
    .filter((f) => {
      if (["qualificado", "diagnostico"].includes(f.key)) return f.n > 0;
      return true;
    });
  let gargalo = etapasFluxo[0]?.label || "—";
  let maiorQueda = 0;
  for (let i = 1; i < etapasFluxo.length; i++) {
    const queda = etapasFluxo[i - 1].n - etapasFluxo[i].n;
    if (queda > maiorQueda) {
      maiorQueda = queda;
      gargalo = `${etapasFluxo[i - 1].label} → ${etapasFluxo[i].label}`;
    }
  }

  return NextResponse.json({
    ok: true,
    fase: 2,
    periodo,
    periodoAnterior: prev,
    metas,
    kpis,
    serie,
    origens,
    gauges,
    funil,
    diagnosticos,
    topProdutos,
    porLinha,
    leadsPorLinha,
    quemConverte,
    scorecard,
    definicoes: DEFINICOES_FASE1,
    leitura: {
      origem: origemTop
        ? `${origemTop.label} (${origemTop.n} lead${origemTop.n === 1 ? "" : "s"} no mês)`
        : "Nenhum lead criado neste mês",
      converte: converteTop
        ? `${converteTop.label} puxa o faturamento (${converteTop.pedidos} pedido${converteTop.pedidos === 1 ? "" : "s"})`
        : "Sem pedido pago neste mês",
      produto: produtoTop
        ? `${produtoTop.title} · ${produtoTop.qtd} un.`
        : "Sem itens vendidos neste mês",
      linha: linhaTop && linhaTop.receita > 0
        ? `${linhaTop.label} puxa a receita`
        : porLinha.some((l) => l.key === "_sem" && l.receita > 0)
          ? "Há venda sem linha no produto — classifique em Produtos"
          : "Sem receita por linha neste mês",
      gargalo: pipeline.total ? gargalo : "Sem pipeline para ler",
      followups: followupsAtrasados
        ? `${followupsAtrasados} follow-up(s) atrasado(s)`
        : "Nenhum follow-up atrasado",
      recompra: compradores.size
        ? `${taxaRecompra}% dos compradores do recorte voltaram a pedir`
        : "Sem base de recompra neste recorte",
    },
    totais: {
      embaixadoras: embCount.count || 0,
      distribuidores: distCount.count || 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const admin = await assertAdmin(supabase, userId);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    periodo?: string;
    metas?: Partial<MetasCiclo>;
  } | null;
  const periodo = body?.periodo || ymOf(new Date());
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ ok: false, error: "Período inválido." }, { status: 400 });
  }

  const { data: atual } = await supabase
    .from("system_config")
    .select("valor")
    .eq("chave", CHAVE_METAS_COMERCIAL)
    .maybeSingle();

  const metas: MetasCiclo = {
    leads: Number(body?.metas?.leads) || 0,
    pedidos: Number(body?.metas?.pedidos) || 0,
    receita: Number(body?.metas?.receita) || 0,
    recompras: Number(body?.metas?.recompras) || 0,
  };
  const valor = gravarMetasPeriodo(atual?.valor, periodo, metas);

  const { error } = await supabase.from("system_config").upsert(
    {
      chave: CHAVE_METAS_COMERCIAL,
      valor,
      descricao: "Metas mensais do painel comercial (fase 1). JSON por YYYY-MM.",
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "chave" }
  );
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await registrarAudit(supabase, {
    usuarioId: userId,
    acao: "UPDATE_CONFIG",
    entidade: "system_config",
    entidadeId: CHAVE_METAS_COMERCIAL,
    dadosAntes: { valor: atual?.valor },
    dadosApos: { periodo, metas },
  });

  return NextResponse.json({ ok: true, periodo, metas });
}
