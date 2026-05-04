import { NextRequest, NextResponse } from "next/server";
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
    return { ok: false as const, error: "Acesso restrito ao CRM." };
  }
  return { ok: true as const, role, full_name: data?.full_name };
}

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

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .select(`
      *,
      responsavel:profiles!crm_leads_responsavel_id_fkey(id, full_name, avatar_url),
      criador:profiles!crm_leads_created_by_fkey(id, full_name)
    `)
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
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

  return NextResponse.json({ ok: true, lead, atividades: atividades || [] });
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

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Body inválido." }, { status: 400 });

  // Busca o lead atual para registrar mudança de status
  const { data: leadAtual } = await supabase
    .from("crm_leads")
    .select("status, nome")
    .eq("id", params.id)
    .maybeSingle();

  const campos: Record<string, any> = {};
  const permitidos = [
    "nome","empresa","telefone","email","instagram","cidade","estado",
    "status","origem","valor_estimado","data_followup","notas","responsavel_id",
  ];
  for (const k of permitidos) {
    if (k in body) campos[k] = body[k] === "" ? null : body[k];
  }

  if (Object.keys(campos).length === 0) {
    return NextResponse.json({ ok: false, error: "Nenhum campo para atualizar." }, { status: 400 });
  }

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .update(campos)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Registra atividade se houve mudança de status
  if (campos.status && leadAtual && campos.status !== leadAtual.status) {
    const LABELS: Record<string, string> = {
      novo: "Novo",
      contato_feito: "Contato Feito",
      proposta: "Proposta Enviada",
      negociacao: "Em Negociação",
      fechado: "Fechado",
      perdido: "Perdido",
    };
    await supabase.from("crm_atividades").insert({
      lead_id: params.id,
      autor_id: userId,
      tipo: "status_change",
      conteudo: `Status alterado de "${LABELS[leadAtual.status] || leadAtual.status}" para "${LABELS[campos.status] || campos.status}".`,
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

  const { error } = await supabase.from("crm_leads").delete().eq("id", params.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
