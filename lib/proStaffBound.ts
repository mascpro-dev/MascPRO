import type { SupabaseClient } from "@supabase/supabase-js";

/** Valida se staffId pertence ao owner (conta logada). null = dono da agenda. */
export async function assertStaffOwnedBy(
  db: SupabaseClient,
  ownerId: string,
  staffId: string | null | undefined
): Promise<{ ok: true; staffId: string | null } | { ok: false; error: string }> {
  if (staffId == null || staffId === "") {
    return { ok: true, staffId: null };
  }
  if (typeof staffId !== "string") {
    return { ok: false, error: "Profissional invalido." };
  }
  const { data, error } = await db
    .from("pro_staff")
    .select("id")
    .eq("id", staffId)
    .eq("owner_id", ownerId)
    .eq("active", true)
    .maybeSingle();

  if (error?.code === "42P01") {
    return { ok: false, error: "Equipe nao configurada (tabela pro_staff)." };
  }
  if (error) return { ok: false, error: error.message };
  if (!data?.id) return { ok: false, error: "Profissional nao encontrado ou inativo." };
  return { ok: true, staffId };
}
