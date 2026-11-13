import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertCrmAccess, podeAcessarLead } from "@/lib/crmServer";
import {
  CAMPOS_PATCH_LEAD,
  parseOrigemLead,
  parseStatusLead,
  pickClassificacaoLead,
  STATUS_LEAD_LABEL,
  validarAvancoComercial,
  normalizarStatusCrmSimplificado,
  erroColunaFase2,
} from "@/lib/comercialClassificacao";
import { camposEnderecoCompletoSync } from "@/lib/profileEndereco";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/admin/crm/leads/[id] — detalhe com atividades
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLead(supabase, params.id, userId, access.role);
  if (!permitido) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .select(`
      *,
      responsavel:profiles!crm_leads_responsavel_id_fkey(id, full_name, avatar_url),
      criador:profiles!crm_leads_created_by_fkey(id, full_name)
    `)
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: erroColunaFase2(error.message) }, { status: 500 });
  if (!lead) return NextResponse.json({ ok: false, error: "Lead não encontrado." }, { status: 404 });

  const { data: atividades, error: errAtv } = await supabase
    .from("crm_atividades")
    .select(`
      *,
      autor:profiles!crm_atividades_autor_id_fkey(id, full_name, avatar_url)
    `)
    .eq("lead_id", params.id)
    .order("created_at", { ascending: false });

  if (errAtv) return NextResponse.json({ ok: false, error: errAtv.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    lead: {
      ...lead,
      status: normalizarStatusCrmSimplificado(lead.status),
    },
    atividades: atividades || [],
    viewer_role: access.role,
  });
}

// PATCH /api/admin/crm/leads/[id] — atualiza lead
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitidoPatch = await podeAcessarLead(supabase, params.id, userId, access.role);
  if (!permitidoPatch) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Body inválido." }, { status: 400 });

  // Busca o lead atual para registrar mudança de status
  const { data: leadAtual } = await supabase
    .from("crm_leads")
    .select("status, nome, data_followup, proximo_passo, profile_id")
    .eq("id", params.id)
    .maybeSingle();

  if ("status" in body) {
    const statusLead = parseStatusLead(body.status, leadAtual?.status || "novo");
    if (!statusLead.ok) return NextResponse.json({ ok: false, error: statusLead.error }, { status: 400 });
    body.status = normalizarStatusCrmSimplificado(statusLead.value);
  }
  if ("origem" in body) {
    const origem = parseOrigemLead(body.origem, "manual");
    if (!origem.ok) return NextResponse.json({ ok: false, error: origem.error }, { status: 400 });
    body.origem = origem.value;
  }

  const classif = pickClassificacaoLead(body);
  if (classif.error) return NextResponse.json({ ok: false, error: classif.error }, { status: 400 });

  const campos: Record<string, any> = { ...classif.campos };
  for (const k of CAMPOS_PATCH_LEAD) {
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
          error: "Para fechar o lead, crie o pedido pelo modal (produtos, pagamento e endereço).",
        },
        { status: 400 }
      );
    }
  }

  let { data: lead, error } = await supabase
    .from("crm_leads")
    .update(campos)
    .eq("id", params.id)
    .select()
    .single();

  if (error && /endereco|bairro|cep|schema cache|PGRST204/i.test(error.message)) {
    const { endereco: _e, bairro: _b, cep: _c, ...semEndereco } = campos;
    void _e;
    void _b;
    void _c;
    const retry = await supabase
      .from("crm_leads")
      .update(semEndereco)
      .eq("id", params.id)
      .select()
      .single();
    lead = retry.data;
    error = retry.error;
  }

  if (error || !lead) {
    return NextResponse.json({ ok: false, error: erroColunaFase2(error?.message || "Falha ao salvar.") }, { status: 500 });
  }

  if (leadAtual?.profile_id) {
    const perfil: Record<string, unknown> = {};
    if ("nome" in campos) perfil.full_name = campos.nome;
    if ("telefone" in campos) perfil.whatsapp = campos.telefone;
    if ("email" in campos) perfil.email = campos.email;
    if ("instagram" in campos) perfil.instagram = campos.instagram;
    if ("cidade" in campos || "estado" in campos || "endereco" in campos || "bairro" in campos || "cep" in campos) {
      Object.assign(
        perfil,
        camposEnderecoCompletoSync({
          city: campos.cidade,
          state: campos.estado,
          address: campos.endereco,
          neighborhood: campos.bairro,
          cep: campos.cep,
        })
      );
    }
    if (Object.keys(perfil).length) {
      await supabase.from("profiles").update(perfil).eq("id", leadAtual.profile_id);
    }
  }

  // Registra atividade se houve mudança de status
  if (campos.status && leadAtual && campos.status !== leadAtual.status) {
    await supabase.from("crm_atividades").insert({
      lead_id: params.id,
      autor_id: userId,
      tipo: "status_change",
      conteudo: `Status alterado de "${STATUS_LEAD_LABEL[leadAtual.status] || leadAtual.status}" para "${STATUS_LEAD_LABEL[campos.status] || campos.status}".`,
      status_anterior: leadAtual.status,
      status_novo: campos.status,
    });
  }

  return NextResponse.json({ ok: true, lead });
}

// DELETE /api/admin/crm/leads/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  if (access.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Somente administradores podem excluir leads." },
      { status: 403 }
    );
  }

  const permitidoDel = await podeAcessarLead(supabase, params.id, userId, access.role);
  if (!permitidoDel) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const { error } = await supabase.from("crm_leads").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, error: erroColunaFase2(error.message) }, { status: 500 });

  return NextResponse.json({ ok: true });
}
