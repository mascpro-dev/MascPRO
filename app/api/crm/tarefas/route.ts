import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { podeAcessarLead } from "@/lib/crmServer";
import { podeAcessarLeadVendedor } from "@/lib/crmVendedorServer";
import { buscarTodasAsPaginas } from "@/lib/crmBuscarTodasPaginas";
import { normalizarStatusCrmSimplificado } from "@/lib/comercialClassificacao";
import {
  dataHoraTarefa,
  erroColunaTarefa,
  parseTipoTarefa,
  periodoAgenda,
  statusAgenda,
  TIPO_TAREFA_LABEL,
} from "@/lib/crmTarefas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SELECT_FULL =
  "id, tipo_tarefa, titulo, conteudo, agendada_em, concluida_em, cancelada_em, resultado, notificacao, autor_id, responsavel_id, created_at, lead_id";
const SELECT_BASE =
  "id, tipo_tarefa, conteudo, agendada_em, concluida_em, notificacao, autor_id, created_at, lead_id";

async function papel(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("role, full_name").eq("id", userId).maybeSingle();
  return { role: String(data?.role || "").toUpperCase(), nome: String(data?.full_name || "") };
}

async function acessoLead(supabase: any, leadId: string, userId: string, role: string) {
  if (role === "VENDEDOR" || role === "EMBAIXADOR") return podeAcessarLeadVendedor(supabase, leadId, userId);
  return podeAcessarLead(supabase, leadId, userId, role || "ADMIN");
}

async function idsLeadsEscopo(supabase: any, userId: string, role: string) {
  if (role === "ADMIN") return null;
  if (role === "VENDEDOR" || role === "EMBAIXADOR") {
    const { data } = await buscarTodasAsPaginas<{ id: string }>((inicio, fim) =>
      supabase
        .from("crm_leads")
        .select("id")
        .or(`created_by.eq.${userId},responsavel_id.eq.${userId}`)
        .range(inicio, fim)
    );
    return (data || []).map((l) => l.id);
  }
  const { data: rede } = await supabase.from("profiles").select("id").eq("indicado_por", userId);
  const ids = [userId, ...(rede || []).map((p: { id: string }) => p.id)];
  const { data } = await buscarTodasAsPaginas<{ id: string }>((inicio, fim) =>
    supabase
      .from("crm_leads")
      .select("id")
      .or(ids.map((id) => `created_by.eq.${id},responsavel_id.eq.${id}`).join(","))
      .range(inicio, fim)
  );
  return (data || []).map((l) => l.id);
}

async function sincronizarProxima(supabase: any, leadId: string) {
  const aberta = await supabase
    .from("crm_atividades")
    .select("tipo_tarefa, agendada_em")
    .eq("lead_id", leadId)
    .is("concluida_em", null)
    .not("agendada_em", "is", null)
    .order("agendada_em", { ascending: true })
    .limit(8);
  const rows = (aberta.data || []).filter((r: any) => !r.cancelada_em);
  const next = rows[0];
  const dataFollow = next?.agendada_em ? String(next.agendada_em).slice(0, 10) : null;
  const patch: Record<string, unknown> = {
    data_followup: dataFollow,
    updated_at: new Date().toISOString(),
    atividade_tipo: next?.tipo_tarefa || null,
    atividade_em: next?.agendada_em || null,
  };
  const upd = await supabase.from("crm_leads").update(patch).eq("id", leadId);
  if (upd.error && /atividade_tipo|atividade_em|schema cache|PGRST204/i.test(upd.error.message)) {
    const { atividade_tipo, atividade_em, ...sem } = patch;
    void atividade_tipo;
    void atividade_em;
    await supabase.from("crm_leads").update(sem).eq("id", leadId);
  }
}

function montarItem(row: any, lead: any, nomes: Record<string, string>) {
  const cancelada = row.cancelada_em || null;
  const status = statusAgenda(row.agendada_em, row.concluida_em, cancelada);
  const respId = row.responsavel_id || row.autor_id;
  return {
    id: row.id,
    tipo: row.tipo_tarefa || "followup",
    tipo_label: TIPO_TAREFA_LABEL[row.tipo_tarefa] || row.tipo_tarefa || "Atividade",
    titulo: row.titulo || TIPO_TAREFA_LABEL[row.tipo_tarefa] || "Atividade",
    observacao: row.conteudo,
    agendada_em: row.agendada_em,
    concluida_em: row.concluida_em || null,
    cancelada_em: cancelada,
    resultado: row.resultado || null,
    status,
    lead_id: lead?.id || row.lead_id,
    lead_nome: lead?.nome || "Lead",
    lead_empresa: lead?.empresa || null,
    lead_status: lead?.status ? normalizarStatusCrmSimplificado(lead.status) : null,
    origem: lead?.origem || null,
    responsavel_id: respId,
    responsavel_nome: (respId && nomes[respId]) || "—",
  };
}

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const { role } = await papel(supabase, userId);
  const sp = req.nextUrl.searchParams;
  const leadId = String(sp.get("lead_id") || "").trim();
  const buscarLead = String(sp.get("buscar_lead") || "").trim();

  if (buscarLead) {
    const ids = await idsLeadsEscopo(supabase, userId, role);
    let q = supabase.from("crm_leads").select("id, nome, empresa, status, telefone").order("updated_at", { ascending: false }).limit(20);
    q = q.or(`nome.ilike.%${buscarLead}%,empresa.ilike.%${buscarLead}%,telefone.ilike.%${buscarLead}%`);
    if (ids) {
      if (!ids.length) return NextResponse.json({ ok: true, leads: [] });
      q = q.in("id", ids.slice(0, 200));
    }
    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, leads: data || [] });
  }

  if (leadId) {
    if (!(await acessoLead(supabase, leadId, userId, role))) {
      return NextResponse.json({ ok: false, error: "Sem acesso a este contato." }, { status: 403 });
    }
    const abertas = await supabase
      .from("crm_atividades")
      .select("id, tipo_tarefa, agendada_em, conteudo, notificacao, created_at")
      .eq("lead_id", leadId)
      .is("concluida_em", null)
      .not("agendada_em", "is", null)
      .order("agendada_em", { ascending: true })
      .limit(8);
    if (abertas.error && /tipo_tarefa|agendada_em|schema cache|PGRST204|does not exist/i.test(abertas.error.message)) {
      return NextResponse.json({ ok: true, abertas: [], aviso: erroColunaTarefa(abertas.error.message) });
    }
    if (abertas.error) return NextResponse.json({ ok: false, error: abertas.error.message }, { status: 500 });
    return NextResponse.json({ ok: true, abertas: abertas.data || [] });
  }

  const aba = String(sp.get("aba") || "minhas");
  const filtroStatus = String(sp.get("status") || "").trim();
  const filtroTipo = String(sp.get("tipo") || "").trim();
  const filtroResp = String(sp.get("responsavel_id") || "").trim();
  const filtroEtapa = String(sp.get("etapa") || "").trim();
  const filtroOrigem = String(sp.get("origem") || "").trim();
  const busca = String(sp.get("q") || "").trim().toLowerCase();
  const periodo = String(sp.get("periodo") || "mes");
  const { de, ate } = periodoAgenda(periodo, sp.get("de"), sp.get("ate"));

  const ids = await idsLeadsEscopo(supabase, userId, role);
  if (ids && !ids.length) {
    return NextResponse.json({
      ok: true,
      atividades: [],
      indicadores: { previstas: 0, concluidas: 0, hoje: 0, atrasadas: 0, percentual: 0 },
      leads: [],
      responsaveis: [],
    });
  }

  if (aba === "sem") {
    const listar = (select: string) =>
      buscarTodasAsPaginas((inicio, fim) => {
        let q = supabase.from("crm_leads").select(select).order("updated_at", { ascending: false });
        if (ids) q = q.in("id", ids);
        if (filtroResp) q = q.eq("responsavel_id", filtroResp);
        if (filtroEtapa) q = q.eq("status", filtroEtapa);
        if (filtroOrigem) q = q.eq("origem", filtroOrigem);
        if (busca) q = q.or(`nome.ilike.%${busca}%,empresa.ilike.%${busca}%,telefone.ilike.%${busca}%`);
        return q.range(inicio, fim);
      });
    let { data, error } = await listar("id, nome, empresa, telefone, status, origem, responsavel_id, atividade_em, data_followup, atividade_tipo");
    if (error && /atividade_em|atividade_tipo|schema cache|PGRST204/i.test(error)) {
      const retry = await listar("id, nome, empresa, telefone, status, origem, responsavel_id, data_followup");
      data = retry.data;
      error = retry.error;
    }
    if (error) return NextResponse.json({ ok: false, error: erroColunaTarefa(error) || error }, { status: 500 });
    const agora = Date.now();
    const sem = (data || []).filter((l: any) => {
      const em = l.atividade_em || (l.data_followup ? `${l.data_followup}T12:00:00` : null);
      if (!em) return true;
      return new Date(em).getTime() < agora;
    });
    const respIds = [...new Set(sem.map((l: any) => l.responsavel_id).filter(Boolean))];
    const nomes: Record<string, string> = {};
    if (respIds.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", respIds);
      (ps || []).forEach((p: any) => { nomes[p.id] = p.full_name; });
    }
    return NextResponse.json({
      ok: true,
      leads: sem.map((l: any) => ({
        ...l,
        status: normalizarStatusCrmSimplificado(l.status),
        responsavel_nome: l.responsavel_id ? nomes[l.responsavel_id] || "—" : "—",
      })),
    });
  }

  const listarAtv = (select: string) =>
    buscarTodasAsPaginas((inicio, fim) => {
      let q = supabase
        .from("crm_atividades")
        .select(select)
        .not("agendada_em", "is", null)
        .gte("agendada_em", de)
        .lte("agendada_em", ate)
        .order("agendada_em", { ascending: true });
      if (ids) q = q.in("lead_id", ids);
      if (filtroTipo) q = q.eq("tipo_tarefa", filtroTipo);
      if (filtroResp) q = q.or(`responsavel_id.eq.${filtroResp},autor_id.eq.${filtroResp}`);
      return q.range(inicio, fim);
    });

  let { data: rows, error } = await listarAtv(SELECT_FULL);
  if (error && /titulo|cancelada_em|resultado|responsavel_id|tipo_tarefa|agendada_em|schema cache|PGRST204/i.test(error)) {
    const retry = await listarAtv(SELECT_BASE);
    rows = retry.data;
    error = retry.error;
  }
  if (error) {
    return NextResponse.json({
      ok: false,
      error: erroColunaTarefa(error) || error,
      aviso: erroColunaTarefa(error),
    }, { status: 500 });
  }

  const leadIds = [...new Set((rows || []).map((r: any) => r.lead_id).filter(Boolean))];
  const leadsMap: Record<string, any> = {};
  for (let i = 0; i < leadIds.length; i += 80) {
    const chunk = leadIds.slice(i, i + 80);
    const { data: ls } = await supabase
      .from("crm_leads")
      .select("id, nome, empresa, status, telefone, origem, responsavel_id")
      .in("id", chunk);
    (ls || []).forEach((l: any) => { leadsMap[l.id] = l; });
  }

  const pessoas = [...new Set((rows || []).flatMap((r: any) => [r.responsavel_id, r.autor_id, leadsMap[r.lead_id]?.responsavel_id]).filter(Boolean))];
  const nomes: Record<string, string> = {};
  if (pessoas.length) {
    const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", pessoas);
    (ps || []).forEach((p: any) => { nomes[p.id] = p.full_name; });
  }

  let atividades = (rows || []).map((r: any) => montarItem(r, leadsMap[r.lead_id], nomes));
  if (filtroEtapa) {
    atividades = atividades.filter((a) => a.lead_status === filtroEtapa || a.lead_status === normalizarStatusCrmSimplificado(filtroEtapa));
  }
  if (busca) {
    atividades = atividades.filter((a) =>
      `${a.lead_nome} ${a.lead_empresa || ""} ${a.titulo} ${a.observacao || ""}`.toLowerCase().includes(busca)
    );
  }
  if (filtroStatus === "hoje") atividades = atividades.filter((a) => a.status === "hoje");
  if (filtroStatus === "planejadas") atividades = atividades.filter((a) => a.status === "planejada" || a.status === "hoje");
  if (filtroStatus === "concluidas") atividades = atividades.filter((a) => a.status === "concluida");
  if (filtroStatus === "atrasadas") atividades = atividades.filter((a) => a.status === "atrasada");

  const previstas = atividades.filter((a) => a.status !== "cancelada");
  const concluidas = previstas.filter((a) => a.status === "concluida").length;
  const hoje = previstas.filter((a) => a.status === "hoje").length;
  const atrasadas = previstas.filter((a) => a.status === "atrasada").length;

  const { data: equipe } = role === "ADMIN"
    ? await supabase.from("profiles").select("id, full_name, role").in("role", ["ADMIN", "DISTRIBUIDOR", "VENDEDOR"]).order("full_name")
    : { data: pessoas.map((id) => ({ id, full_name: nomes[id], role: null })) };

  return NextResponse.json({
    ok: true,
    atividades,
    indicadores: {
      previstas: previstas.length,
      concluidas,
      hoje,
      atrasadas,
      percentual: previstas.length ? Math.round((concluidas / previstas.length) * 100) : 0,
    },
    responsaveis: equipe || [],
  });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const { role, nome } = await papel(supabase, userId);
  const body = await req.json().catch(() => null);
  const leadId = String(body?.lead_id || "").trim();
  const tipo = parseTipoTarefa(body?.tipo);
  const agendada = dataHoraTarefa(String(body?.data || ""), String(body?.hora || ""));
  const observacao = String(body?.observacao || body?.conteudo || "").trim();
  const titulo = String(body?.titulo || "").trim();
  const notificacao = String(body?.notificacao || "na_hora").trim() || "na_hora";
  const forcar = Boolean(body?.forcar);
  const responsavelId = String(body?.responsavel_id || userId).trim() || userId;

  if (!leadId) return NextResponse.json({ ok: false, error: "Informe o lead." }, { status: 400 });
  if (!tipo) return NextResponse.json({ ok: false, error: "Escolha o tipo da atividade." }, { status: 400 });
  if (!agendada) return NextResponse.json({ ok: false, error: "Informe data e hora." }, { status: 400 });
  if (!(await acessoLead(supabase, leadId, userId, role))) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este contato." }, { status: 403 });
  }

  const { data: lead, error: leadErr } = await supabase
    .from("crm_leads")
    .select("id, nome, data_followup, atividade_tipo, atividade_em")
    .eq("id", leadId)
    .maybeSingle();
  if (leadErr || !lead) return NextResponse.json({ ok: false, error: "Lead não encontrado." }, { status: 404 });

  if (!forcar) {
    const abertas = await supabase
      .from("crm_atividades")
      .select("id, tipo_tarefa, agendada_em, conteudo")
      .eq("lead_id", leadId)
      .is("concluida_em", null)
      .not("agendada_em", "is", null)
      .order("agendada_em", { ascending: true })
      .limit(1);
    const existente = !abertas.error ? abertas.data?.[0] : null;
    const legado = lead.atividade_em || lead.data_followup;
    if (existente || (abertas.error && legado)) {
      return NextResponse.json({
        ok: false,
        duplicado: true,
        error: "Já existe uma atividade agendada para este lead.",
        existente: existente || {
          tipo_tarefa: lead.atividade_tipo,
          agendada_em: lead.atividade_em || lead.data_followup,
          conteudo: "Atividade anterior neste contato.",
        },
      }, { status: 409 });
    }
  }

  const rotulo = titulo || TIPO_TAREFA_LABEL[tipo] || tipo;
  const conteudo = observacao || `${rotulo} agendada.`;

  let ins = await supabase
    .from("crm_atividades")
    .insert({
      lead_id: leadId,
      autor_id: userId,
      tipo: "followup",
      conteudo,
      tipo_tarefa: tipo,
      agendada_em: agendada,
      notificacao,
      titulo: rotulo,
      responsavel_id: responsavelId,
    })
    .select("id")
    .single();

  if (ins.error && /tipo_tarefa|agendada_em|notificacao|titulo|responsavel_id|schema cache|PGRST204/i.test(ins.error.message)) {
    ins = await supabase
      .from("crm_atividades")
      .insert({
        lead_id: leadId,
        autor_id: userId,
        tipo: "followup",
        conteudo: `${rotulo} em ${new Date(agendada).toLocaleString("pt-BR")}${observacao ? ` — ${observacao}` : ""}`,
      })
      .select("id")
      .single();
  }
  if (ins.error) {
    return NextResponse.json({ ok: false, error: erroColunaTarefa(ins.error.message) || ins.error.message }, { status: 500 });
  }

  await sincronizarProxima(supabase, leadId);
  const { data: leadAtual } = await supabase.from("crm_leads").select("*").eq("id", leadId).maybeSingle();

  return NextResponse.json({
    ok: true,
    atividade_id: ins.data?.id,
    lead: leadAtual || lead,
    autor: nome,
  });
}

export async function PATCH(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const { role } = await papel(supabase, userId);
  const body = await req.json().catch(() => null);
  const id = String(body?.id || "").trim();
  const acao = String(body?.acao || "editar").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Informe a atividade." }, { status: 400 });

  const { data: atv, error: atvErr } = await supabase.from("crm_atividades").select("*").eq("id", id).maybeSingle();
  if (atvErr || !atv) return NextResponse.json({ ok: false, error: "Atividade não encontrada." }, { status: 404 });
  if (!(await acessoLead(supabase, atv.lead_id, userId, role))) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este contato." }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (acao === "cancelar") {
    patch.cancelada_em = new Date().toISOString();
    patch.conteudo = `${atv.conteudo || ""}\nCancelada.`.trim();
  } else if (acao === "concluir") {
    patch.concluida_em = new Date().toISOString();
    const resultado = String(body?.resultado || "").trim();
    if (resultado) patch.resultado = resultado;
    if (resultado) patch.conteudo = `${atv.conteudo || ""}\nResultado: ${resultado}`.trim();
  } else {
    const tipo = parseTipoTarefa(body?.tipo);
    if (tipo) patch.tipo_tarefa = tipo;
    if (body?.titulo != null) patch.titulo = String(body.titulo).trim();
    if (body?.observacao != null) patch.conteudo = String(body.observacao).trim();
    if (body?.data || body?.hora) {
      const agendada = dataHoraTarefa(String(body?.data || ""), String(body?.hora || "09:00"));
      if (!agendada) return NextResponse.json({ ok: false, error: "Data e hora inválidas." }, { status: 400 });
      patch.agendada_em = agendada;
    }
    if (body?.responsavel_id) patch.responsavel_id = String(body.responsavel_id);
  }

  let upd = await supabase.from("crm_atividades").update(patch).eq("id", id);
  if (upd.error && /cancelada_em|resultado|titulo|tipo_tarefa|agendada_em|responsavel_id|schema cache|PGRST204/i.test(upd.error.message)) {
    const { cancelada_em, resultado, titulo, tipo_tarefa, agendada_em, responsavel_id, ...sem } = patch as any;
    void cancelada_em;
    void resultado;
    void titulo;
    void tipo_tarefa;
    void agendada_em;
    void responsavel_id;
    upd = await supabase.from("crm_atividades").update(sem).eq("id", id);
    if (upd.error) return NextResponse.json({ ok: false, error: erroColunaTarefa(upd.error.message) || upd.error.message }, { status: 500 });
  } else if (upd.error) {
    return NextResponse.json({ ok: false, error: erroColunaTarefa(upd.error.message) || upd.error.message }, { status: 500 });
  }

  await sincronizarProxima(supabase, atv.lead_id);

  if (acao === "concluir" && body?.proxima) {
    const tipo = parseTipoTarefa(body.proxima.tipo) || "followup";
    const agendada = dataHoraTarefa(String(body.proxima.data || ""), String(body.proxima.hora || "09:00"));
    if (agendada) {
      await supabase.from("crm_atividades").insert({
        lead_id: atv.lead_id,
        autor_id: userId,
        tipo: "followup",
        conteudo: String(body.proxima.observacao || "Próximo acompanhamento.").trim(),
        tipo_tarefa: tipo,
        agendada_em: agendada,
        titulo: TIPO_TAREFA_LABEL[tipo] || tipo,
        responsavel_id: atv.responsavel_id || userId,
      });
      await sincronizarProxima(supabase, atv.lead_id);
    }
  }

  return NextResponse.json({ ok: true });
}
