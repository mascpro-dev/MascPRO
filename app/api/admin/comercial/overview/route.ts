import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_PAGOS = ["paid", "separacao", "despachado", "entregue"];
const PAGE = 1000;

const ORIGEM_LABEL: Record<string, string> = {
  manual: "Manual",
  indicacao: "Indicação",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  email: "E-mail",
  evento: "Evento",
  outro: "Outro",
};

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
  const d = new Date(y, m - 2, 1);
  return ymOf(d);
}

function mesesAte(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(ymOf(new Date(y, m - 1 - i, 1)));
  }
  return out;
}

function pct(num: number, den: number) {
  if (den <= 0) return 0;
  return Math.round((num / den) * 100);
}

function semaforo(atual: number, anterior: number, invertido = false) {
  if (invertido) {
    if (atual === 0) return "ok" as const;
    if (anterior === 0) return atual > 3 ? ("risco" as const) : ("atencao" as const);
    if (atual <= anterior) return "ok" as const;
    if (atual <= anterior * 1.25) return "atencao" as const;
    return "risco" as const;
  }
  if (anterior <= 0) return atual > 0 ? ("ok" as const) : ("atencao" as const);
  const r = atual / anterior;
  if (r >= 1) return "ok" as const;
  if (r >= 0.75) return "atencao" as const;
  return "risco" as const;
}

function deltaTxt(atual: number, anterior: number) {
  const d = atual - anterior;
  if (d === 0) return "0";
  const sign = d > 0 ? "+" : "";
  return `${sign}${d}`;
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
  const janelaPedidos = mesesAte(periodo, 18);
  const inicioJanela = boundsMes(janelaPedidos[0]).ini;
  const { ini: iniMes, fim: fimMes } = boundsMes(periodo);
  const { ini: iniPrev, fim: fimPrev } = boundsMes(prev);

  const [
    leadsRes,
    pedidosRes,
    embCount,
    distCount,
  ] = await Promise.all([
    fetchAllRows<{
      id: string;
      created_at: string;
      status: string;
      origem: string | null;
      data_followup: string | null;
    }>(async (from, to) =>
      supabase
        .from("crm_leads")
        .select("id, created_at, status, origem, data_followup")
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
        .in("status", STATUS_PAGOS)
        .gte("created_at", inicioJanela)
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    supabase.from("profiles").select("id", { count: "exact", head: true }).ilike("role", "embaixador"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).ilike("role", "distribuidor"),
  ]);

  if (leadsRes.error) {
    return NextResponse.json({ ok: false, error: `leads: ${leadsRes.error}` }, { status: 500 });
  }
  if (pedidosRes.error) {
    return NextResponse.json({ ok: false, error: `pedidos: ${pedidosRes.error}` }, { status: 500 });
  }

  const leads = leadsRes.rows;
  const pedidos = pedidosRes.rows;
  const noMes = (iso: string, ini: string, fim: string) => iso >= ini && iso <= fim;

  const leadsMes = leads.filter((l) => noMes(l.created_at, iniMes, fimMes));
  const leadsPrev = leads.filter((l) => noMes(l.created_at, iniPrev, fimPrev));
  const pedidosMes = pedidos.filter((p) => noMes(p.created_at, iniMes, fimMes));
  const pedidosPrev = pedidos.filter((p) => noMes(p.created_at, iniPrev, fimPrev));

  const fat = (lista: typeof pedidos) => lista.reduce((s, p) => s + Number(p.total || 0), 0);
  const fatMes = fat(pedidosMes);
  const fatPrev = fat(pedidosPrev);
  const ticketMes = pedidosMes.length ? fatMes / pedidosMes.length : 0;
  const ticketPrev = pedidosPrev.length ? fatPrev / pedidosPrev.length : 0;

  const pipeline = {
    novo: leads.filter((l) => l.status === "novo").length,
    contato_feito: leads.filter((l) => l.status === "contato_feito").length,
    proposta: leads.filter((l) => l.status === "proposta").length,
    negociacao: leads.filter((l) => l.status === "negociacao").length,
    fechado: leads.filter((l) => l.status === "fechado").length,
    perdido: leads.filter((l) => l.status === "perdido").length,
    total: leads.length,
  };
  const pipelineAberto =
    pipeline.novo + pipeline.contato_feito + pipeline.proposta + pipeline.negociacao;

  const hoje0 = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const followupsAtrasados = leads.filter(
    (l) =>
      l.data_followup &&
      new Date(l.data_followup).getTime() < hoje0 &&
      !["fechado", "perdido"].includes(l.status)
  ).length;

  const primeiraCompra = new Map<string, string>();
  const ordenados = [...pedidos].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const p of ordenados) {
    if (!p.profile_id) continue;
    if (!primeiraCompra.has(p.profile_id)) primeiraCompra.set(p.profile_id, p.created_at);
  }
  const recomprasMes = pedidosMes.filter((p) => {
    if (!p.profile_id) return false;
    const prim = primeiraCompra.get(p.profile_id);
    return prim != null && prim < iniMes;
  }).length;
  const recomprasPrev = pedidosPrev.filter((p) => {
    if (!p.profile_id) return false;
    const prim = primeiraCompra.get(p.profile_id);
    return prim != null && prim < iniPrev;
  }).length;

  const compradores = new Set(pedidos.map((p) => p.profile_id).filter(Boolean) as string[]);
  const repetiram = new Set<string>();
  const freq = new Map<string, number>();
  for (const p of pedidos) {
    if (!p.profile_id) continue;
    freq.set(p.profile_id, (freq.get(p.profile_id) || 0) + 1);
  }
  for (const [id, n] of freq) if (n >= 2) repetiram.add(id);
  const taxaRecompra = pct(repetiram.size, compradores.size);

  const saidaNovo = pipeline.contato_feito + pipeline.proposta + pipeline.negociacao + pipeline.fechado;
  const emProposta = pipeline.proposta + pipeline.negociacao + pipeline.fechado;
  const gauges = [
    { label: "Contato", value: pct(saidaNovo, saidaNovo + pipeline.novo) },
    { label: "Proposta", value: pct(emProposta, pipeline.contato_feito + emProposta) },
    { label: "Fechamento", value: pct(pipeline.fechado, pipeline.proposta + pipeline.negociacao + pipeline.fechado) },
    { label: "Conversão", value: pct(pipeline.fechado, pipeline.total) },
    { label: "Recompra", value: taxaRecompra },
  ];

  const serie = janela.map((ym) => {
    const b = boundsMes(ym);
    const l = leads.filter((x) => noMes(x.created_at, b.ini, b.fim));
    const p = pedidos.filter((x) => noMes(x.created_at, b.ini, b.fim));
    const rec = p.filter((x) => {
      if (!x.profile_id) return false;
      const prim = primeiraCompra.get(x.profile_id);
      return prim != null && prim < b.ini;
    }).length;
    return {
      mes: ym,
      label: mesLabel(ym),
      leads: l.length,
      pedidos: p.length,
      faturamento: fat(p),
      ticket: p.length ? fat(p) / p.length : 0,
      recompras: rec,
    };
  });

  const origemBase = (leadsMes.length ? leadsMes : leads).reduce((acc, l) => {
    const k = (l.origem || "outro").toLowerCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const origens = Object.entries(origemBase)
    .map(([key, n]) => ({ key, label: ORIGEM_LABEL[key] || key, n }))
    .sort((a, b) => b.n - a.n);

  const pedidoIds = pedidosMes.map((p) => p.id);
  const itens: { product_id: string | null; quantidade: unknown; preco_unitario: unknown }[] = [];
  for (let i = 0; i < pedidoIds.length; i += 80) {
    const chunk = pedidoIds.slice(i, i + 80);
    if (!chunk.length) break;
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
  for (let i = 0; i < prodIds.length; i += 80) {
    const chunk = prodIds.slice(i, i + 80);
    const { data } = await supabase.from("products").select("id, title").in("id", chunk);
    for (const p of data || []) titulos.set(p.id, p.title);
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

  const funil = [
    { key: "novo", label: "Novo", n: pipeline.novo },
    { key: "contato_feito", label: "Contato feito", n: pipeline.contato_feito },
    { key: "proposta", label: "Proposta", n: pipeline.proposta },
    { key: "negociacao", label: "Negociação", n: pipeline.negociacao },
    { key: "fechado", label: "Fechado", n: pipeline.fechado },
    { key: "perdido", label: "Perdido", n: pipeline.perdido },
  ];

  const kpis = [
    {
      key: "leads",
      label: "Leads no mês",
      value: leadsMes.length,
      anterior: leadsPrev.length,
      formato: "int" as const,
      status: semaforo(leadsMes.length, leadsPrev.length),
      spark: serie.map((s) => s.leads),
    },
    {
      key: "pipeline",
      label: "Pipeline aberto",
      value: pipelineAberto,
      anterior: null as number | null,
      formato: "int" as const,
      status: pipelineAberto > 0 ? ("atencao" as const) : ("ok" as const),
      spark: serie.map((s) => s.leads),
    },
    {
      key: "pedidos",
      label: "Pedidos pagos",
      value: pedidosMes.length,
      anterior: pedidosPrev.length,
      formato: "int" as const,
      status: semaforo(pedidosMes.length, pedidosPrev.length),
      spark: serie.map((s) => s.pedidos),
    },
    {
      key: "faturamento",
      label: "Faturamento",
      value: fatMes,
      anterior: fatPrev,
      formato: "moeda" as const,
      status: semaforo(fatMes, fatPrev),
      spark: serie.map((s) => s.faturamento),
    },
    {
      key: "ticket",
      label: "Ticket médio",
      value: ticketMes,
      anterior: ticketPrev,
      formato: "moeda" as const,
      status: semaforo(ticketMes, ticketPrev),
      spark: serie.map((s) => s.ticket),
    },
    {
      key: "followups",
      label: "Follow-ups atrasados",
      value: followupsAtrasados,
      anterior: null,
      formato: "int" as const,
      status: semaforo(followupsAtrasados, 0, true),
      spark: [] as number[],
    },
    {
      key: "recompras",
      label: "Recompras no mês",
      value: recomprasMes,
      anterior: recomprasPrev,
      formato: "int" as const,
      status: semaforo(recomprasMes, recomprasPrev),
      spark: serie.map((s) => s.recompras),
    },
    {
      key: "embaixadoras",
      label: "Embaixadoras",
      value: embCount.count || 0,
      anterior: null,
      formato: "int" as const,
      status: "ok" as const,
      spark: [] as number[],
    },
  ];

  const scorecard = kpis
    .filter((k) => k.anterior != null)
    .map((k) => ({
      area: k.label,
      atual: k.value,
      anterior: k.anterior as number,
      formato: k.formato,
      status: k.status,
      delta: deltaTxt(
        k.formato === "moeda" ? Math.round(k.value) : k.value,
        k.formato === "moeda" ? Math.round(k.anterior as number) : (k.anterior as number)
      ),
    }));

  const origemTop = origens[0];
  const produtoTop = topProdutos[0];
  const etapasFluxo = funil.filter((f) => f.key !== "perdido");
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
    periodo,
    periodoAnterior: prev,
    kpis,
    serie,
    origens,
    gauges,
    funil,
    topProdutos,
    scorecard,
    leitura: {
      origem: origemTop
        ? `${origemTop.label} (${origemTop.n} lead${origemTop.n === 1 ? "" : "s"})`
        : "Ainda sem leads no CRM",
      produto: produtoTop
        ? `${produtoTop.title} · ${produtoTop.qtd} un.`
        : "Sem itens vendidos neste mês",
      gargalo: pipeline.total ? gargalo : "Sem pipeline para ler",
      followups: followupsAtrasados
        ? `${followupsAtrasados} follow-up(s) atrasado(s)`
        : "Nenhum follow-up atrasado",
      recompra: compradores.size
        ? `${taxaRecompra}% dos compradores do período voltaram a pedir`
        : "Sem base de recompra neste recorte",
    },
    totais: {
      embaixadoras: embCount.count || 0,
      distribuidores: distCount.count || 0,
    },
  });
}
