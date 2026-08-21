import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  assertVendedorCrmAccess,
  podeAcessarLeadVendedor,
} from "@/lib/crmVendedorServer";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLeadVendedor(supabase, params.id, userId);
  if (!permitido) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
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

  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLeadVendedor(supabase, params.id, userId);
  if (!permitido) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Body inválido." }, { status: 400 });

  const { data: leadAtual } = await supabase
    .from("crm_leads")
    .select("status")
    .eq("id", params.id)
    .maybeSingle();

  const campos: Record<string, unknown> = {};
  const permitidos = [
    "nome", "telefone", "email", "cidade", "estado",
    "status", "origem", "valor_estimado", "data_followup", "notas",
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

  if (campos.status && leadAtual && campos.status !== leadAtual.status) {
    await supabase.from("crm_atividades").insert({
      lead_id: params.id,
      autor_id: userId,
      tipo: "status_change",
      conteudo: `Status alterado para ${campos.status}.`,
      status_anterior: leadAtual.status,
      status_novo: campos.status,
    });
  }

  if (body.nova_atividade?.trim()) {
    await supabase.from("crm_atividades").insert({
      lead_id: params.id,
      autor_id: userId,
      tipo: "nota",
      conteudo: String(body.nova_atividade).trim(),
    });
  }

  return NextResponse.json({ ok: true, lead });
}
