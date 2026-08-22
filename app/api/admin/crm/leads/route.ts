import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  CRM_LEADS_LIST_SELECT,
  parseOrigemLead,
  parseStatusLead,
  pickClassificacaoLead,
  validarProximoPassoProposta,
  erroColunaFase2,
} from "@/lib/comercialClassificacao";

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
  return { ok: true as const, role, full_name: data?.full_name as string };
}

/** Retorna os IDs da rede direta de um distribuidor (quem ele indicou) */
async function getRedeIds(supabase: any, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("indicado_por", userId);
  return (data || []).map((p: { id: string }) => p.id);
}

// GET /api/admin/crm/leads — lista leads (todos ou por status)
export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const filterStatus    = searchParams.get("status");
  const busca           = searchParams.get("q");
  const distribuidorId  = searchParams.get("distribuidor_id"); // filtro exclusivo do ADMIN

  let query = supabase
    .from("crm_leads")
    .select(CRM_LEADS_LIST_SELECT)
    .order("updated_at", { ascending: false });

  if (access.role === "ADMIN") {
    if (distribuidorId) {
      const { data: filtroPerfil } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", distribuidorId)
        .maybeSingle();
      const roleFiltro = String(filtroPerfil?.role || "").toUpperCase();

      if (roleFiltro === "EMBAIXADOR") {
        query = query.or(
          `created_by.eq.${distribuidorId},responsavel_id.eq.${distribuidorId}`
        );
      } else {
        const redeIds = await getRedeIds(supabase, distribuidorId);
        const todosIds = [distribuidorId, ...redeIds];
        query = query.or(
          todosIds.map((id) => `created_by.eq.${id},responsavel_id.eq.${id}`).join(",")
        );
      }
    }
  } else {
    // DISTRIBUIDOR: sempre filtrado pela própria rede
    const redeIds = await getRedeIds(supabase, userId);
    const todosIds = [userId, ...redeIds];
    query = query.or(
      todosIds.map((id) => `created_by.eq.${id},responsavel_id.eq.${id}`).join(",")
    );
  }

  if (filterStatus) query = query.eq("status", filterStatus);
  if (busca) {
    query = query.or(
      `nome.ilike.%${busca}%,empresa.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: erroColunaFase2(error.message) }, { status: 500 });

  return NextResponse.json({ ok: true, leads: data || [] });
}

// POST /api/admin/crm/leads — cria novo lead
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
  if (!body?.nome?.trim()) {
    return NextResponse.json({ ok: false, error: "Nome é obrigatório." }, { status: 400 });
  }

  const statusLead = parseStatusLead(body.status, "novo");
  if (!statusLead.ok) return NextResponse.json({ ok: false, error: statusLead.error }, { status: 400 });
  const origem = parseOrigemLead(body.origem, "manual");
  if (!origem.ok) return NextResponse.json({ ok: false, error: origem.error }, { status: 400 });
  const classif = pickClassificacaoLead(body);
  if (classif.error) return NextResponse.json({ ok: false, error: classif.error }, { status: 400 });

  const dataFollowup = body.data_followup || null;
  const proximoPasso = classif.campos.proximo_passo ?? (body.proximo_passo?.trim() || null);
  const avancao = validarProximoPassoProposta({
    status: statusLead.value,
    data_followup: dataFollowup,
    proximo_passo: proximoPasso,
  });
  if (avancao) return NextResponse.json({ ok: false, error: avancao }, { status: 400 });

  const novo = {
    nome: body.nome.trim(),
    empresa: body.empresa?.trim() || null,
    telefone: body.telefone?.trim() || null,
    email: body.email?.trim() || null,
    instagram: body.instagram?.trim() || null,
    cidade: body.cidade?.trim() || null,
    estado: body.estado?.trim() || null,
    status: statusLead.value,
    origem: origem.value,
    valor_estimado: body.valor_estimado ? Number(body.valor_estimado) : null,
    data_followup: dataFollowup,
    notas: body.notas?.trim() || null,
    responsavel_id: body.responsavel_id || userId,
    created_by: userId,
    ...classif.campos,
  };

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .insert(novo)
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: erroColunaFase2(error.message) }, { status: 500 });

  // Registra atividade de criação
  await supabase.from("crm_atividades").insert({
    lead_id: lead.id,
    autor_id: userId,
    tipo: "criacao",
    conteudo: `Lead criado por ${access.full_name || "Admin"}.`,
  });

  return NextResponse.json({ ok: true, lead });
}
