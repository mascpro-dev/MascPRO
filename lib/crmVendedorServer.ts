import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertVendedorCrmAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<
  | { ok: true; role: string; full_name: string; distribuidor_id: string }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, full_name, indicado_por")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  const role = String(data?.role || "").toUpperCase();
  if (role !== "VENDEDOR") {
    return { ok: false, error: "Área exclusiva para vendedores." };
  }
  const distribuidor_id = String(data?.indicado_por || "");
  if (!distribuidor_id) {
    return { ok: false, error: "Vendedor sem distribuidor vinculado." };
  }
  return {
    ok: true,
    role,
    full_name: String(data?.full_name || ""),
    distribuidor_id,
  };
}

export async function assertDistribuidorEquipeAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<
  | { ok: true; role: string; full_name: string }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  const role = String(data?.role || "").toUpperCase();
  if (!["ADMIN", "DISTRIBUIDOR"].includes(role)) {
    return { ok: false, error: "Sem acesso à gestão de equipe." };
  }
  return { ok: true, role, full_name: String(data?.full_name || "") };
}

export async function getVendedoresDoDistribuidor(
  supabase: SupabaseClient,
  distribuidorId: string
): Promise<{ id: string; full_name: string; email: string | null; whatsapp: string | null; created_at: string }[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, whatsapp, created_at")
    .eq("indicado_por", distribuidorId)
    .eq("role", "VENDEDOR")
    .order("full_name");
  return data || [];
}

export async function getDistribuidorIdDoVendedor(
  supabase: SupabaseClient,
  vendedorId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("indicado_por, role")
    .eq("id", vendedorId)
    .maybeSingle();
  if (String(data?.role || "").toUpperCase() !== "VENDEDOR") return null;
  return data?.indicado_por ? String(data.indicado_por) : null;
}

export async function podeAcessarLeadVendedor(
  supabase: SupabaseClient,
  leadId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("crm_leads")
    .select("id, created_by, responsavel_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!data) return false;
  return data.created_by === userId || data.responsavel_id === userId;
}

export async function podeAcessarLeadDistribuidorEquipe(
  supabase: SupabaseClient,
  leadId: string,
  distribuidorId: string
): Promise<boolean> {
  const vendedores = await getVendedoresDoDistribuidor(supabase, distribuidorId);
  const ids = [distribuidorId, ...vendedores.map((v) => v.id)];
  const { data } = await supabase
    .from("crm_leads")
    .select("id, created_by, responsavel_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!data) return false;
  return ids.includes(data.created_by) || ids.includes(data.responsavel_id);
}

export function filtroLeadsIdsOr(ids: string[]): string {
  return ids.map((id) => `created_by.eq.${id},responsavel_id.eq.${id}`).join(",");
}
