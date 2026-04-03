import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminServiceClient } from "@/lib/adminServer";

export type AdminMasterResult =
  | { ok: true; userId: string; supabase: SupabaseClient }
  | { ok: false; status: number; error: string };

/** Só perfis com role ADMIN (painel master). */
export async function requireAdminMaster(): Promise<AdminMasterResult> {
  const { supabase, error, status } = await getAdminServiceClient();
  if (!supabase) {
    return { ok: false, status: status || 500, error: error || "Servidor indisponível." };
  }

  const auth = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await auth.auth.getSession();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Não autenticado." };
  }

  const { data: p } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
  const role = String(p?.role || "").toUpperCase();
  if (role !== "ADMIN") {
    return { ok: false, status: 403, error: "Acesso restrito a administradores." };
  }

  return { ok: true, userId: session.user.id, supabase };
}
