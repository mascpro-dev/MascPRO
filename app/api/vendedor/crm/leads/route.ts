import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertVendedorCrmAccess } from "@/lib/crmVendedorServer";
import {
  parseOrigemLead,
  pickClassificacaoLead,
  validarProximoPassoProposta,
  erroColunaFase2,
} from "@/lib/comercialClassificacao";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const busca = req.nextUrl.searchParams.get("q");
  let query = supabase
    .from("crm_leads")
    .select("*")
    .or(`created_by.eq.${userId},responsavel_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (busca) {
    query = query.or(
      `nome.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: erroColunaFase2(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true, leads: data || [] });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.nome?.trim()) {
    return NextResponse.json({ ok: false, error: "Nome é obrigatório." }, { status: 400 });
  }

  const origem = parseOrigemLead(body.origem, "manual");
  if (!origem.ok) return NextResponse.json({ ok: false, error: origem.error }, { status: 400 });
  const classif = pickClassificacaoLead(body);
  if (classif.error) return NextResponse.json({ ok: false, error: classif.error }, { status: 400 });

  const avancao = validarProximoPassoProposta({
    status: "novo",
    data_followup: body.data_followup || null,
    proximo_passo: classif.campos.proximo_passo ?? null,
  });
  if (avancao) return NextResponse.json({ ok: false, error: avancao }, { status: 400 });

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .insert({
      nome: body.nome.trim(),
      telefone: body.telefone?.trim() || null,
      email: body.email?.trim() || null,
      cidade: body.cidade?.trim() || null,
      estado: body.estado?.trim() || null,
      status: "novo",
      origem: origem.value,
      notas: body.notas?.trim() || null,
      data_followup: body.data_followup || null,
      valor_estimado: body.valor_estimado ? Number(body.valor_estimado) : null,
      empresa: body.empresa?.trim() || null,
      instagram: body.instagram?.trim() || null,
      responsavel_id: userId,
      created_by: userId,
      ...classif.campos,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: erroColunaFase2(error.message) }, { status: 500 });

  await supabase.from("crm_atividades").insert({
    lead_id: lead.id,
    autor_id: userId,
    tipo: "criacao",
    conteudo: `Lead criado por vendedor ${access.full_name}.`,
  });

  return NextResponse.json({ ok: true, lead });
}
