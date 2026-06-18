import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  assertEmbaixadoraCrmAccess,
  filtroLeadsEmbaixadoraOr,
  idsEscopoEmbaixadora,
} from "@/lib/crmEmbaixadoraServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertEmbaixadoraCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const busca = searchParams.get("q");
  const filterStatus = searchParams.get("status");
  const escopo = await idsEscopoEmbaixadora(supabase, userId);

  let query = supabase
    .from("crm_leads")
    .select(`
      id, created_at, updated_at,
      nome, empresa, telefone, email, instagram, cidade, estado,
      status, origem, valor_estimado, data_followup, notas,
      responsavel_id, created_by, profile_id, order_id,
      responsavel:profiles!crm_leads_responsavel_id_fkey(id, full_name, avatar_url)
    `)
    .or(filtroLeadsEmbaixadoraOr(escopo))
    .order("updated_at", { ascending: false });

  if (filterStatus) query = query.eq("status", filterStatus);
  if (busca) {
    query = query.or(
      `nome.ilike.%${busca}%,empresa.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, leads: data || [] });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertEmbaixadoraCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.nome?.trim()) {
    return NextResponse.json({ ok: false, error: "Nome é obrigatório." }, { status: 400 });
  }

  const novo = {
    nome: body.nome.trim(),
    empresa: body.empresa?.trim() || null,
    telefone: body.telefone?.trim() || null,
    email: body.email?.trim() || null,
    instagram: body.instagram?.trim() || null,
    cidade: body.cidade?.trim() || null,
    estado: body.estado?.trim() || null,
    status: body.status || "novo",
    origem: body.origem || "indicacao",
    valor_estimado: body.valor_estimado ? Number(body.valor_estimado) : null,
    data_followup: body.data_followup || null,
    notas: body.notas?.trim() || null,
    responsavel_id: userId,
    created_by: userId,
  };

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .insert(novo)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await supabase.from("crm_atividades").insert({
    lead_id: lead.id,
    autor_id: userId,
    tipo: "criacao",
    conteudo: `Lead cadastrado por ${access.full_name} (CRM Embaixadora).`,
  });

  return NextResponse.json({ ok: true, lead });
}
