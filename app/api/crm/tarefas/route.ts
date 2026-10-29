import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { podeAcessarLead } from "@/lib/crmServer";
import { podeAcessarLeadVendedor } from "@/lib/crmVendedorServer";
import {
  dataHoraTarefa,
  erroColunaTarefa,
  parseTipoTarefa,
  TIPO_TAREFA_LABEL,
} from "@/lib/crmTarefas";

export const dynamic = "force-dynamic";

async function papel(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("role, full_name").eq("id", userId).maybeSingle();
  return { role: String(data?.role || "").toUpperCase(), nome: String(data?.full_name || "") };
}

async function acessoLead(supabase: any, leadId: string, userId: string, role: string) {
  if (role === "VENDEDOR") return podeAcessarLeadVendedor(supabase, leadId, userId);
  if (role === "EMBAIXADOR") return podeAcessarLeadVendedor(supabase, leadId, userId);
  return podeAcessarLead(supabase, leadId, userId, role || "ADMIN");
}

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const leadId = String(req.nextUrl.searchParams.get("lead_id") || "").trim();
  if (!leadId) return NextResponse.json({ ok: false, error: "Informe o lead." }, { status: 400 });

  const { role } = await papel(supabase, userId);
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
    .limit(5);

  if (abertas.error && /tipo_tarefa|agendada_em|schema cache|PGRST204|does not exist/i.test(abertas.error.message)) {
    return NextResponse.json({ ok: true, abertas: [], aviso: erroColunaTarefa(abertas.error.message) });
  }
  if (abertas.error) return NextResponse.json({ ok: false, error: abertas.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, abertas: abertas.data || [] });
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
  const notificacao = String(body?.notificacao || "na_hora").trim() || "na_hora";
  const forcar = Boolean(body?.forcar);

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

  const rotulo = TIPO_TAREFA_LABEL[tipo] || tipo;
  const conteudo = observacao || `${rotulo} agendada.`;
  const dataFollow = String(body?.data || "").slice(0, 10);

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
    })
    .select("id")
    .single();

  if (ins.error && /tipo_tarefa|agendada_em|notificacao|schema cache|PGRST204/i.test(ins.error.message)) {
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
    return NextResponse.json({
      ok: false,
      error: erroColunaTarefa(ins.error.message) || ins.error.message,
    }, { status: 500 });
  }

  const patchLead: Record<string, unknown> = {
    data_followup: dataFollow || null,
    updated_at: new Date().toISOString(),
    atividade_tipo: tipo,
    atividade_em: agendada,
  };
  let upd = await supabase.from("crm_leads").update(patchLead).eq("id", leadId).select("*").single();
  if (upd.error && /atividade_tipo|atividade_em|schema cache|PGRST204/i.test(upd.error.message)) {
    const { atividade_tipo, atividade_em, ...sem } = patchLead;
    void atividade_tipo;
    void atividade_em;
    upd = await supabase.from("crm_leads").update(sem).eq("id", leadId).select("*").single();
  }

  return NextResponse.json({
    ok: true,
    atividade_id: ins.data?.id,
    lead: upd.data || { ...lead, ...patchLead },
    autor: nome,
  });
}
