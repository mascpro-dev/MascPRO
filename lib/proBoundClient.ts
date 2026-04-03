import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchProClientIfValid(
  db: SupabaseClient,
  professionalId: string,
  clientId: unknown
): Promise<{ id: string; name: string; phone: string | null } | null> {
  if (!clientId || typeof clientId !== "string") return null;
  const { data, error } = await db
    .from("pro_clients")
    .select("id, name, phone")
    .eq("id", clientId)
    .eq("professional_id", professionalId)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, name: data.name, phone: data.phone };
}
