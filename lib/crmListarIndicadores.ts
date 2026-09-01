import type { SupabaseClient } from "@supabase/supabase-js";
import { getVendedoresDoDistribuidor } from "@/lib/crmVendedorServer";
import { idsEscopoEmbaixadora } from "@/lib/crmEmbaixadoraServer";
import { ROLES_INDICADOR } from "@/lib/crmIndicadorLead";

export type IndicadorOpcao = {
  id: string;
  full_name: string;
  role: string;
  email: string | null;
};

const ROLES_LISTA = [...ROLES_INDICADOR];

export async function listarIndicadoresCrm(
  supabase: SupabaseClient,
  params: {
    viewerRole: string;
    viewerId: string;
    q?: string;
    distribuidorId?: string | null;
    limit?: number;
  }
): Promise<IndicadorOpcao[]> {
  const limit = params.limit ?? 40;
  const q = String(params.q || "").trim();
  const role = String(params.viewerRole || "").toUpperCase();

  let idsEscopo: string[] | null = null;

  if (role === "ADMIN") {
    idsEscopo = null;
  } else if (role === "DISTRIBUIDOR") {
    idsEscopo = await idsRedeDistribuidorLista(supabase, params.viewerId);
  } else if (role === "EMBAIXADOR") {
    idsEscopo = await idsEscopoEmbaixadora(supabase, params.viewerId);
  } else if (role === "VENDEDOR" && params.distribuidorId) {
    idsEscopo = await idsRedeDistribuidorLista(supabase, params.distribuidorId);
  } else {
    idsEscopo = [params.viewerId];
  }

  let query = supabase
    .from("profiles")
    .select("id, full_name, role, email")
    .in("role", ROLES_LISTA)
    .order("full_name")
    .limit(limit);

  if (idsEscopo) {
    query = query.in("id", idsEscopo);
  }

  if (q.length >= 2) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data } = await query;
  return (data || []).map((p) => ({
    id: p.id,
    full_name: String(p.full_name || "Sem nome"),
    role: String(p.role || "").toUpperCase(),
    email: p.email ? String(p.email) : null,
  }));
}

async function idsRedeDistribuidorLista(
  supabase: SupabaseClient,
  distribuidorId: string
): Promise<string[]> {
  const vendedores = await getVendedoresDoDistribuidor(supabase, distribuidorId);
  const vendedorIds = vendedores.map((v) => v.id);
  const pais = [distribuidorId, ...vendedorIds];

  const { data: rede } = await supabase
    .from("profiles")
    .select("id")
    .in("indicado_por", pais);

  const todos = new Set<string>(pais);
  (rede || []).forEach((p: { id: string }) => todos.add(p.id));
  return [...todos];
}

export async function resolverIndicadorSugeridoLead(
  supabase: SupabaseClient,
  leadId: string
): Promise<{
  indicador_id: string | null;
  responsavel_id: string | null;
  profile_indicado_por: string | null;
  pode_alterar_indicador: boolean;
}> {
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("indicador_id, responsavel_id, profile_id")
    .eq("id", leadId)
    .maybeSingle();

  let profileIndicadoPor: string | null = null;
  let podeAlterar = true;

  if (lead?.profile_id) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("indicado_por")
      .eq("id", lead.profile_id)
      .maybeSingle();
    profileIndicadoPor = perfil?.indicado_por ? String(perfil.indicado_por) : null;

    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", lead.profile_id)
      .in("status", ["paid", "separacao", "despachado", "entregue"]);

    podeAlterar = (count || 0) === 0;
  }

  const indicador_id =
    lead?.indicador_id ?? profileIndicadoPor ?? lead?.responsavel_id ?? null;

  return {
    indicador_id: indicador_id ? String(indicador_id) : null,
    responsavel_id: lead?.responsavel_id ? String(lead.responsavel_id) : null,
    profile_indicado_por: profileIndicadoPor,
    pode_alterar_indicador: podeAlterar,
  };
}
