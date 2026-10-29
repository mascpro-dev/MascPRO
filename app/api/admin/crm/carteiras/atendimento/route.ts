import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertCrmAccess, podeAcessarLead } from "@/lib/crmServer";
import {
  parsePerfilComercial,
  parseProximaAcao,
  parseRelacionamento,
  parseResultadoAtendimento,
  parseTipoAtendimento,
  erroColunaCarteira,
} from "@/lib/crmCarteira";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }
  const leadId = req.nextUrl.searchParams.get("lead_id") || "";
  if (!leadId) return NextResponse.json({ ok: false, error: "Lead obrigatório." }, { status: 400 });
  const okLead = await podeAcessarLead(supabase, leadId, userId, access.role);
  if (!okLead) return NextResponse.json({ ok: false, error: "Sem acesso a este contato." }, { status: 403 });

  const { data, error } = await supabase
    .from("crm_atendimentos")
    .select("id, created_at, autor_id, tipo, resultado, observacoes, proxima_acao, previsto_em, concluido_em, order_id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ ok: true, itens: [], aviso: erroColunaCarteira(error.message) });
  }
  return NextResponse.json({ ok: true, itens: data || [] });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const leadId = String(body?.lead_id || "").trim();
  if (!leadId) return NextResponse.json({ ok: false, error: "Lead obrigatório." }, { status: 400 });
  const okLead = await podeAcessarLead(supabase, leadId, userId, access.role);
  if (!okLead) return NextResponse.json({ ok: false, error: "Sem acesso a este contato." }, { status: 403 });

  const tipo = parseTipoAtendimento(body?.tipo);
  if (!tipo.ok) return NextResponse.json({ ok: false, error: tipo.error }, { status: 400 });
  if (!tipo.value) return NextResponse.json({ ok: false, error: "Tipo de atividade obrigatório." }, { status: 400 });
  const resultado = parseResultadoAtendimento(body?.resultado);
  if (!resultado.ok) return NextResponse.json({ ok: false, error: resultado.error }, { status: 400 });
  const acao = parseProximaAcao(body?.proxima_acao);
  if (!acao.ok) return NextResponse.json({ ok: false, error: acao.error }, { status: 400 });
  if (acao.value === "nenhuma" && !String(body?.justificativa || "").trim()) {
    return NextResponse.json({ ok: false, error: "Justificativa obrigatória quando não há próxima ação." }, { status: 400 });
  }
  const perfil = parsePerfilComercial(body?.perfil_comercial);
  if (!perfil.ok) return NextResponse.json({ ok: false, error: perfil.error }, { status: 400 });
  const rel = parseRelacionamento(body?.relacionamento);
  if (!rel.ok) return NextResponse.json({ ok: false, error: rel.error }, { status: 400 });

  const previsto = String(body?.previsto_em || "").trim() || null;
  const obs = String(body?.observacoes || "").trim() || null;
  const justificativa = String(body?.justificativa || "").trim() || null;

  const { error: errAt } = await supabase.from("crm_atendimentos").insert({
    lead_id: leadId,
    autor_id: userId,
    tipo: tipo.value,
    resultado: resultado.value,
    observacoes: obs,
    proxima_acao: acao.value,
    previsto_em: previsto,
  });
  if (errAt && !/column|does not exist|schema cache|PGRST204|crm_atendimentos/i.test(errAt.message)) {
    return NextResponse.json({ ok: false, error: errAt.message }, { status: 500 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (resultado.value) patch.resultado_atendimento = resultado.value;
  if (acao.value) patch.proxima_acao = acao.value;
  if (previsto) {
    patch.proxima_acao_em = previsto;
    patch.data_followup = previsto;
  }
  if (justificativa) patch.proxima_acao_justificativa = justificativa;
  if (perfil.value) patch.perfil_comercial = perfil.value;
  if (rel.value) patch.relacionamento = rel.value;
  patch.ultimo_atendimento_em = new Date().toISOString();
  patch.ultimo_atendimento_por = userId;

  const { error: errLead } = await supabase.from("crm_leads").update(patch).eq("id", leadId);
  if (errLead && /column|schema cache|PGRST204/i.test(errLead.message)) {
    await supabase
      .from("crm_leads")
      .update({
        data_followup: previsto,
        notas: obs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);
  } else if (errLead) {
    return NextResponse.json({ ok: false, error: erroColunaCarteira(errLead.message) }, { status: 500 });
  }

  await supabase.from("crm_atividades").insert({
    lead_id: leadId,
    autor_id: userId,
    tipo: "contato",
    conteudo: `${tipo.value}${resultado.value ? ` · ${resultado.value}` : ""}${obs ? ` — ${obs}` : ""}`,
  });

  return NextResponse.json({ ok: true });
}
