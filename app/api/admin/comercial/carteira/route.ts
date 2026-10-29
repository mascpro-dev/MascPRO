import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin, assertAdminOrDistribuidor } from "@/lib/adminServer";
import { STATUS_PEDIDO_PAGO } from "@/lib/comercialMetricas";
import {
  idsRedeComercial,
  listarLeadsCarteira,
  perfilComercialLead,
} from "@/lib/crmCarteiraServidor";
import {
  CHAVE_METAS_CARTEIRA,
  DEFINICOES_CARTEIRA,
  RESULTADO_CONVERSA,
  RESULTADO_DECISOR,
  RESULTADO_TENTATIVA,
  ehElegivel,
  gravarMetasCarteira,
  noIntervalo,
  parseMetasCarteira,
  resultadoLead,
  ymdDe,
} from "@/lib/crmCarteiraIndicadores";
import { ymdSaoPaulo } from "@/lib/comercialRegua";
import { registrarAudit } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

function boundsMes(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const ini = new Date(y, m - 1, 1);
  const fim = new Date(y, m, 0, 23, 59, 59, 999);
  return { ini: ini.toISOString(), fim: fim.toISOString() };
}

function pct(a: number, b: number) {
  if (!b) return null;
  return Math.round((a / b) * 100);
}

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const access = await assertAdminOrDistribuidor(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const agora = new Date();
  const periodo = sp.get("periodo") || `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  const { ini, fim } = boundsMes(periodo);
  const hoje = ymdSaoPaulo();
  const vendedor = sp.get("vendedor") || "";
  const cidade = sp.get("cidade") || "";
  const uf = sp.get("uf") || "";
  const perfil = sp.get("perfil") || "";
  const origem = sp.get("origem") || "";

  const escopo = access.role === "ADMIN" ? null : await idsRedeComercial(supabase, userId);
  const { data: leadsAll, error } = await listarLeadsCarteira(supabase, escopo);
  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });

  const leads = leadsAll.filter((l) => {
    if (vendedor && l.responsavel_id !== vendedor) return false;
    if (cidade && String(l.cidade || "").trim().toLowerCase() !== cidade.toLowerCase()) return false;
    if (uf && String(l.estado || "").trim().toUpperCase() !== uf.toUpperCase()) return false;
    if (perfil && perfilComercialLead(l) !== perfil) return false;
    if (origem && String(l.origem || "") !== origem) return false;
    return true;
  });

  const idsResp = [...new Set(leads.map((l) => l.responsavel_id).filter(Boolean))] as string[];
  const nomes: Record<string, string> = {};
  if (idsResp.length) {
    const { data: perfis } = await supabase.from("profiles").select("id, full_name").in("id", idsResp);
    for (const p of perfis || []) nomes[p.id] = p.full_name || "Sem nome";
  }

  let vendedores: { id: string; full_name: string }[] = [];
  if (access.role === "ADMIN") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["DISTRIBUIDOR", "VENDEDOR"])
      .order("full_name");
    vendedores = (data || []).map((p) => ({ id: p.id, full_name: p.full_name || "Sem nome" }));
  } else {
    const ids = escopo || [userId];
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids).order("full_name");
    vendedores = (data || []).map((p) => ({ id: p.id, full_name: p.full_name || "Sem nome" }));
  }

  const cidades = [...new Set(leadsAll.map((l) => String(l.cidade || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const ufs = [...new Set(leadsAll.map((l) => String(l.estado || "").trim().toUpperCase()).filter(Boolean))].sort();

  const atendQ = await supabase
    .from("crm_atendimentos")
    .select("lead_id, tipo, resultado, created_at, autor_id")
    .gte("created_at", ini)
    .lte("created_at", fim);
  const atendimentos = atendQ.error ? [] : atendQ.data || [];

  const pedidosFull = await supabase
    .from("orders")
    .select("id, total, status, created_at, crm_lead_id, vendedor_id, profile_id")
    .in("status", [...STATUS_PEDIDO_PAGO])
    .gte("created_at", ini)
    .lte("created_at", fim);
  const pedidosBase = pedidosFull.error && /column|schema cache|PGRST204/i.test(pedidosFull.error.message)
    ? await supabase
        .from("orders")
        .select("id, total, status, created_at, profile_id")
        .in("status", [...STATUS_PEDIDO_PAGO])
        .gte("created_at", ini)
        .lte("created_at", fim)
    : pedidosFull;
  const pagosMes = ((pedidosBase.data || []) as Record<string, unknown>[]).map((p) => ({
    id: String(p.id),
    total: p.total,
    status: String(p.status),
    created_at: String(p.created_at),
    crm_lead_id: (p.crm_lead_id as string) || null,
    vendedor_id: (p.vendedor_id as string) || null,
    profile_id: (p.profile_id as string) || null,
  }));
  const leadIds = new Set(leads.map((l) => l.id));
  const pagosVinculados = pagosMes.filter((p) => p.crm_lead_id && leadIds.has(p.crm_lead_id));
  const conciliacao = pagosMes.filter((p) => !p.crm_lead_id).length;

  let pagosAntes: { crm_lead_id: string | null }[] = [];
  const antesQ = await supabase
    .from("orders")
    .select("crm_lead_id")
    .in("status", [...STATUS_PEDIDO_PAGO])
    .lt("created_at", ini)
    .not("crm_lead_id", "is", null);
  if (!antesQ.error) pagosAntes = antesQ.data || [];
  const jaComprou = new Set(pagosAntes.map((p) => p.crm_lead_id).filter(Boolean));

  const compradoresMes = new Set(pagosVinculados.map((p) => p.crm_lead_id as string));
  const novos = [...compradoresMes].filter((id) => !jaComprou.has(id));
  const reativados = [...compradoresMes].filter((id) => jaComprou.has(id));
  const fat = pagosVinculados.reduce((s, p) => s + Number(p.total || 0), 0);
  const ticket = pagosVinculados.length ? fat / pagosVinculados.length : 0;

  const tentativasUnicas = new Set<string>();
  const conversasUnicas = new Set<string>();
  const trabalhadosPeriodo = new Set<string>();
  let visitasAgendadas = 0;
  let visitasRealizadas = 0;
  let propostas = 0;
  let followups = 0;

  if (atendimentos.length) {
    for (const a of atendimentos) {
      if (!leadIds.has(a.lead_id)) continue;
      trabalhadosPeriodo.add(a.lead_id);
      if (RESULTADO_TENTATIVA.has(String(a.resultado || "")) || a.tipo) tentativasUnicas.add(a.lead_id);
      if (RESULTADO_CONVERSA.has(String(a.resultado || ""))) conversasUnicas.add(a.lead_id);
      if (a.tipo === "visita" || a.resultado === "visita_realizada") visitasRealizadas += 1;
      if (a.resultado === "visita_agendada") visitasAgendadas += 1;
      if (a.tipo === "proposta" || a.resultado === "proposta_enviada") propostas += 1;
      if (a.tipo === "whatsapp" || a.tipo === "ligacao") followups += 1;
    }
  } else {
    for (const l of leads) {
      const quando = l.ultimo_atendimento_em || l.updated_at;
      if (!noIntervalo(quando, ini, fim)) continue;
      const res = resultadoLead(l);
      if (!res || res === "nao_abordado") continue;
      trabalhadosPeriodo.add(l.id);
      if (RESULTADO_TENTATIVA.has(res)) tentativasUnicas.add(l.id);
      if (RESULTADO_CONVERSA.has(res)) conversasUnicas.add(l.id);
      if (res === "visita_agendada") visitasAgendadas += 1;
      if (res === "visita_realizada") visitasRealizadas += 1;
      if (res === "proposta_enviada") propostas += 1;
    }
  }

  const estoque = {
    total: leads.length,
    elegiveis: leads.filter(ehElegivel).length,
    sem_responsavel: leads.filter((l) => !l.responsavel_id).length,
    nao_abordados: leads.filter((l) => resultadoLead(l) === "nao_abordado" || !resultadoLead(l)).length,
    sem_proxima_acao: leads.filter((l) => !l.proxima_acao && !l.data_followup && !l.proxima_acao_em).length,
    decisores_estoque: leads.filter((l) => RESULTADO_DECISOR.has(resultadoLead(l))).length,
  };

  const atribuidoElegivel = leads.filter((l) => ehElegivel(l) && l.responsavel_id);
  const trabalhadosEstoque = atribuidoElegivel.filter((l) => {
    const r = resultadoLead(l);
    return r && r !== "nao_abordado";
  });
  const trabalhadosElegiveisPeriodo = [...trabalhadosPeriodo].filter((id) => {
    const l = leads.find((x) => x.id === id);
    return l && ehElegivel(l);
  });

  const atrasados = leads.filter((l) => {
    const d = ymdDe(l.proxima_acao_em) || ymdDe(l.data_followup);
    return Boolean(d && d < hoje);
  }).length;

  const { data: metasCfg } = await supabase.from("system_config").select("valor").eq("chave", CHAVE_METAS_CARTEIRA).maybeSingle();
  const metas = parseMetasCarteira(metasCfg?.valor, periodo);

  const porVendedor = new Map<string, {
    vendedor_id: string;
    vendedor: string;
    carteira: number;
    trabalhados: number;
    decisores: number;
    visitas: number;
    convertidos: number;
    pedidos: number;
    faturamento: number;
    pendencias: number;
  }>();

  function bucket(id: string | null) {
    const key = id || "sem";
    const cur = porVendedor.get(key) || {
      vendedor_id: key,
      vendedor: id ? nomes[id] || "—" : "Sem responsável",
      carteira: 0,
      trabalhados: 0,
      decisores: 0,
      visitas: 0,
      convertidos: 0,
      pedidos: 0,
      faturamento: 0,
      pendencias: 0,
    };
    porVendedor.set(key, cur);
    return cur;
  }

  for (const l of leads) {
    const b = bucket(l.responsavel_id);
    b.carteira += 1;
    if (trabalhadosPeriodo.has(l.id)) b.trabalhados += 1;
    if (RESULTADO_DECISOR.has(resultadoLead(l))) b.decisores += 1;
    if (resultadoLead(l) === "visita_realizada") b.visitas += 1;
    const d = ymdDe(l.proxima_acao_em) || ymdDe(l.data_followup);
    if ((d && d < hoje) || (!l.proxima_acao && !l.data_followup && resultadoLead(l) === "nao_abordado")) b.pendencias += 1;
  }
  const convertidosVistos = new Set<string>();
  for (const p of pagosVinculados) {
    const lead = leads.find((l) => l.id === p.crm_lead_id);
    const b = bucket(lead?.responsavel_id || p.vendedor_id);
    b.pedidos += 1;
    b.faturamento += Number(p.total || 0);
    const lid = String(p.crm_lead_id);
    if (novos.includes(lid) && !convertidosVistos.has(`${b.vendedor_id}:${lid}`)) {
      convertidosVistos.add(`${b.vendedor_id}:${lid}`);
      b.convertidos += 1;
    }
  }

  const porCidade = new Map<string, {
    cidade: string;
    uf: string;
    total: number;
    cobertura: number | null;
    decisores: number;
    compradores: number;
    faturamento: number;
    pendencias: number;
  }>();

  for (const l of leads) {
    const cidadeN = String(l.cidade || "").trim() || "Sem cidade";
    const ufN = String(l.estado || "").trim().toUpperCase();
    const key = `${cidadeN}|${ufN}`;
    const cur = porCidade.get(key) || {
      cidade: cidadeN,
      uf: ufN,
      total: 0,
      cobertura: null,
      decisores: 0,
      compradores: 0,
      faturamento: 0,
      pendencias: 0,
    };
    cur.total += 1;
    if (RESULTADO_DECISOR.has(resultadoLead(l))) cur.decisores += 1;
    const d = ymdDe(l.proxima_acao_em) || ymdDe(l.data_followup);
    if (d && d < hoje) cur.pendencias += 1;
    porCidade.set(key, cur);
  }
  for (const p of pagosVinculados) {
    const lead = leads.find((l) => l.id === p.crm_lead_id);
    if (!lead) continue;
    const cidadeN = String(lead.cidade || "").trim() || "Sem cidade";
    const ufN = String(lead.estado || "").trim().toUpperCase();
    const cur = porCidade.get(`${cidadeN}|${ufN}`);
    if (!cur) continue;
    cur.compradores += 1;
    cur.faturamento += Number(p.total || 0);
  }
  for (const cur of porCidade.values()) {
    const doSitio = leads.filter((l) => {
      const cidadeN = String(l.cidade || "").trim() || "Sem cidade";
      const ufN = String(l.estado || "").trim().toUpperCase();
      return cidadeN === cur.cidade && ufN === cur.uf && ehElegivel(l) && l.responsavel_id;
    });
    const trab = doSitio.filter((l) => resultadoLead(l) && resultadoLead(l) !== "nao_abordado");
    cur.cobertura = pct(trab.length, doSitio.length);
  }

  const oportunidades = leads
    .filter((l) => ["proposta", "negociacao"].includes(l.status))
    .reduce((s, l) => s + Number(l.valor_estimado || 0), 0);

  return NextResponse.json({
    ok: true,
    periodo,
    viewer_role: access.role,
    filtros: { vendedores, cidades, ufs },
    estoque,
    atividade: {
      tentativas: tentativasUnicas.size,
      conversas: conversasUnicas.size,
      visitas_agendadas: visitasAgendadas,
      visitas_realizadas: visitasRealizadas,
      propostas,
      followups: followups || atendimentos.length,
      atrasados,
      trabalhados_periodo: trabalhadosPeriodo.size,
      alcancados: conversasUnicas.size,
    },
    resultado: {
      clientes_novos: novos.length,
      reativados: reativados.length,
      pedidos_pagos: pagosVinculados.length,
      faturamento: fat,
      ticket_medio: ticket,
      recompras: reativados.length,
      conversao: pct(novos.length, trabalhadosElegiveisPeriodo.length),
      oportunidades_abertas: oportunidades,
      conciliacao,
    },
    taxas: {
      contato_efetivo: pct(conversasUnicas.size, tentativasUnicas.size),
      cobertura: pct(trabalhadosEstoque.length, atribuidoElegivel.length),
      comparecimento: pct(visitasRealizadas, visitasAgendadas || visitasRealizadas),
    },
    metas,
    vendedores: [...porVendedor.values()].sort((a, b) => b.faturamento - a.faturamento || b.carteira - a.carteira),
    cidades: [...porCidade.values()].sort((a, b) => b.total - a.total).slice(0, 40),
    definicoes: DEFINICOES_CARTEIRA,
  });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const admin = await assertAdmin(supabase, userId);
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  const periodo = String(body?.periodo || "");
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ ok: false, error: "Período inválido." }, { status: 400 });
  }
  const metas = {
    trabalhados: Number(body?.metas?.trabalhados) || 0,
    decisores: Number(body?.metas?.decisores) || 0,
    visitas: Number(body?.metas?.visitas) || 0,
    clientes_novos: Number(body?.metas?.clientes_novos) || 0,
  };
  const { data: atual } = await supabase.from("system_config").select("valor").eq("chave", CHAVE_METAS_CARTEIRA).maybeSingle();
  const valor = gravarMetasCarteira(atual?.valor, periodo, metas);
  const { error } = await supabase.from("system_config").upsert(
    {
      chave: CHAVE_METAS_CARTEIRA,
      valor,
      descricao: "Metas de carteira (trabalhados, decisores, visitas, clientes novos) por mês",
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "chave" }
  );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await registrarAudit(supabase, {
    usuarioId: userId,
    acao: "UPDATE_CONFIG",
    entidade: "system_config",
    entidadeId: CHAVE_METAS_CARTEIRA,
    dadosApos: { periodo, metas },
  });
  return NextResponse.json({ ok: true, metas });
}
