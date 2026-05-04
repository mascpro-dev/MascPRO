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
  return { ok: true as const, full_name: data?.full_name };
}

// POST /api/admin/crm/leads/[id]/atividades — adiciona nota/contato
export async function POST(
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
  if (!body?.conteudo?.trim()) {
    return NextResponse.json({ ok: false, error: "Conteúdo obrigatório." }, { status: 400 });
  }

  const tiposValidos = ["nota", "contato", "followup"];
  const tipo = tiposValidos.includes(body.tipo) ? body.tipo : "nota";

  const { data, error } = await supabase
    .from("crm_atividades")
    .insert({
      lead_id: params.id,
      autor_id: userId,
      tipo,
      conteudo: body.conteudo.trim(),
    })
    .select(`*, autor:profiles!crm_atividades_autor_id_fkey(id, full_name, avatar_url)`)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Atualiza updated_at do lead
  await supabase
    .from("crm_leads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.id);

  return NextResponse.json({ ok: true, atividade: data });
}
