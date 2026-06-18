import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ResponsavelFiltro = {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  role?: string | null;
};

// GET /api/admin/crm/distribuidores
// ADMIN — distribuidores + embaixadoras com leads cadastrados (filtro do Kanban)
export async function GET() {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = String(perfil?.role || "").toUpperCase();
  if (role !== "ADMIN") {
    return NextResponse.json({ ok: true, distribuidores: [] });
  }

  const { data: distribs, error: errDist } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .in("role", ["DISTRIBUIDOR", "ADMIN"])
    .order("full_name", { ascending: true });

  if (errDist) {
    return NextResponse.json({ ok: false, error: errDist.message }, { status: 500 });
  }

  const { data: leadsVinculos, error: errLeads } = await supabase
    .from("crm_leads")
    .select("responsavel_id, created_by");

  if (errLeads) {
    return NextResponse.json({ ok: false, error: errLeads.message }, { status: 500 });
  }

  const idsComLeads = new Set<string>();
  for (const l of leadsVinculos || []) {
    if (l.responsavel_id) idsComLeads.add(l.responsavel_id);
    if (l.created_by) idsComLeads.add(l.created_by);
  }

  const idsDist = new Set((distribs || []).map((d) => d.id));
  const idsEmbaixadorComLeads = [...idsComLeads].filter((id) => !idsDist.has(id));

  let embaixadoras: ResponsavelFiltro[] = [];
  if (idsEmbaixadorComLeads.length > 0) {
    const { data: emb } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .eq("role", "EMBAIXADOR")
      .in("id", idsEmbaixadorComLeads)
      .order("full_name", { ascending: true });
    embaixadoras = emb || [];
  }

  const mapa = new Map<string, ResponsavelFiltro>();
  for (const d of distribs || []) {
    mapa.set(d.id, d);
  }
  for (const e of embaixadoras) {
    if (!mapa.has(e.id)) mapa.set(e.id, e);
  }

  const distribuidores = [...mapa.values()].sort((a, b) =>
    String(a.full_name || "").localeCompare(String(b.full_name || ""), "pt-BR")
  );

  return NextResponse.json({ ok: true, distribuidores });
}
