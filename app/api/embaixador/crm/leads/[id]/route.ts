import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  assertEmbaixadoraCrmAccess,
  podeAcessarLeadEmbaixadora,
} from "@/lib/crmEmbaixadoraServer";
import {
  CAMPOS_PATCH_LEAD,
  parseOrigemLead,
  parseStatusLead,
  pickClassificacaoLead,
  STATUS_LEAD_LABEL,
  validarAvancoComercial,
  erroColunaFase2,
} from "@/lib/comercialClassificacao";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertEmbaixadoraCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLeadEmbaixadora(supabase, params.id, userId);
  if (!permitido) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .select(`
      *,
      responsavel:profiles!crm_leads_responsavel_id_fkey(id, full_name, avatar_url)
    `)
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: erroColunaFase2(error.message) }, { status: 500 });
  if (!lead) return NextResponse.json({ ok: false, error: "Lead não encontrado." }, { status: 404 });

  const { data: atividades } = await supabase
    .from("crm_atividades")
    .select(`
      *,
      autor:profiles!crm_atividades_autor_id_fkey(id, full_name, avatar_url)
    `)
    .eq("lead_id", params.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    ok: true,
    lead,
    atividades: atividades || [],
    viewer_role: access.role,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertEmbaixadoraCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLeadEmbaixadora(supabase, params.id, userId);
  if (!permitido) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Body inválido." }, { status: 400 });

  const { data: leadAtual } = await supabase
    .from("crm_leads")
    .select("status, nome, data_followup, proximo_passo")
    .eq("id", params.id)
    .maybeSingle();

  if ("status" in body) {
    const status = parseStatusLead(body.status, leadAtual?.status || "novo");
    if (!status.ok) return NextResponse.json({ ok: false, error: status.error }, { status: 400 });
    body.status = status.value;
  }
  if ("origem" in body) {
    const origem = parseOrigemLead(body.origem, "indicacao");
    if (!origem.ok) return NextResponse.json({ ok: false, error: origem.error }, { status: 400 });
    body.origem = origem.value;
  }

  const classif = pickClassificacaoLead(body);
  if (classif.error) return NextResponse.json({ ok: false, error: classif.error }, { status: 400 });

  const campos: Record<string, unknown> = { ...classif.campos };
  for (const k of CAMPOS_PATCH_LEAD) {
    if (k === "responsavel_id") continue;
    if (k in classif.campos) continue;
    if (k in body) campos[k] = body[k] === "" ? null : body[k];
  }

  if (Object.keys(campos).length === 0) {
    return NextResponse.json({ ok: false, error: "Nenhum campo para atualizar." }, { status: 400 });
  }

  const avancao = validarAvancoComercial(leadAtual || {}, campos);
  if (avancao) return NextResponse.json({ ok: false, error: avancao }, { status: 400 });

  if (campos.status === "fechado") {
    const { data: leadCheck } = await supabase
      .from("crm_leads")
      .select("order_id")
      .eq("id", params.id)
      .maybeSingle();
    if (!leadCheck?.order_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Para fechar, registre o pedido da rede pelo pipeline.",
        },
        { status: 400 }
      );
    }
  }

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .update(campos)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: erroColunaFase2(error.message) }, { status: 500 });

  if (campos.status && leadAtual && campos.status !== leadAtual.status) {
    await supabase.from("crm_atividades").insert({
      lead_id: params.id,
      autor_id: userId,
      tipo: "status_change",
      conteudo: `Status alterado para ${STATUS_LEAD_LABEL[String(campos.status)] || campos.status}.`,
      status_anterior: leadAtual.status,
      status_novo: campos.status,
    });
  }

  return NextResponse.json({ ok: true, lead });
}
