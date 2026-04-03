import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function getProDb(): Promise<
  | { ok: true; db: SupabaseClient; userId: string }
  | { ok: false; status: number; error: string }
> {
  const auth = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await auth.auth.getSession();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Nao autenticado" };
  }
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
  return { ok: true, db, userId: session.user.id };
}

export function ultimoDiaMes(mesISO: string): string {
  const [y, m] = mesISO.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${mesISO}-${String(lastDay).padStart(2, "0")}`;
}

/** Mes anterior no formato yyyy-mm */
export function mesAnteriorISO(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
