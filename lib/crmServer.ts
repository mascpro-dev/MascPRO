import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertCrmAccess(
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
    return { ok: false, error: "Acesso restrito ao CRM." };
  }
  return { ok: true, role, full_name: String(data?.full_name || "") };
}

export async function podeAcessarLead(
  supabase: SupabaseClient,
  leadId: string,
  userId: string,
  role: string
): Promise<boolean> {
  if (role === "ADMIN") return true;

  const { data: rede } = await supabase
    .from("profiles")
    .select("id")
    .eq("indicado_por", userId);
  const redeIds = (rede || []).map((p: { id: string }) => p.id);
  const todosIds = [userId, ...redeIds];

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
