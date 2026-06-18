import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertEmbaixadoraCrmAccess(
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
  if (role !== "EMBAIXADOR") {
    return { ok: false, error: "Área exclusiva para embaixadoras MascPRO." };
  }
  return { ok: true, role, full_name: String(data?.full_name || "") };
}

export async function getRedeEmbaixadoraIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("indicado_por", userId);
  return (data || []).map((p: { id: string }) => p.id);
}

/** IDs que podem ver/criar leads: a própria embaixadora + indicados diretos */
export async function idsEscopoEmbaixadora(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const rede = await getRedeEmbaixadoraIds(supabase, userId);
  return [userId, ...rede];
}

export async function podeAcessarLeadEmbaixadora(
  supabase: SupabaseClient,
  leadId: string,
  userId: string
): Promise<boolean> {
  const todosIds = await idsEscopoEmbaixadora(supabase, userId);
  const { data } = await supabase
    .from("crm_leads")
    .select("id, created_by, responsavel_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!data) return false;
  return (
    todosIds.includes(data.created_by) ||
    todosIds.includes(data.responsavel_id)
  );
}

export function filtroLeadsEmbaixadoraOr(ids: string[]): string {
  return ids.map((id) => `created_by.eq.${id},responsavel_id.eq.${id}`).join(",");
}
