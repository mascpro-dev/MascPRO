import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";

export const dynamic = "force-dynamic";

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

// POST /api/admin/crm/leads/[id]/converter
// Body: { profile_id: string } — vincula o lead a um membro do MascPRO
// GET sem body — busca membros para autocomplete
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId)
    return NextResponse.json({ ok: false, error: authErr }, { status });

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok)
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const q = new URL(req.url).searchParams.get("q") || "";

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, whatsapp, avatar_url, role")
    .order("full_name", { ascending: true })
    .limit(20);

  if (q.trim()) {
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,whatsapp.ilike.%${q}%`
    );
  }

  // DISTRIBUIDOR só busca dentro da sua rede
  if (access.role !== "ADMIN") {
    query = query.or(`id.eq.${userId},indicado_por.eq.${userId}`);
  }

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, perfis: data || [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId)
    return NextResponse.json({ ok: false, error: authErr }, { status });

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok)
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.profile_id)
    return NextResponse.json({ ok: false, error: "profile_id obrigatório." }, { status: 400 });

  // Verifica se o perfil existe
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", body.profile_id)
    .maybeSingle();

  if (!perfil)
    return NextResponse.json({ ok: false, error: "Perfil não encontrado." }, { status: 404 });

  const { data: lead, error } = await supabase
    .from("crm_leads")
    .update({
      profile_id: body.profile_id,
      convertido_em: new Date().toISOString(),
      status: "fechado",
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Registra atividade
  await supabase.from("crm_atividades").insert({
    lead_id: params.id,
    autor_id: userId,
    tipo: "status_change",
    conteudo: `Lead convertido e vinculado ao perfil de ${perfil.full_name}. Jornada pós-venda iniciada.`,
    status_anterior: "negociacao",
    status_novo: "fechado",
  });

  return NextResponse.json({ ok: true, lead });
}
