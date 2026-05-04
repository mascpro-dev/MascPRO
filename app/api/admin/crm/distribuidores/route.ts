import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/admin/crm/distribuidores
// Somente ADMIN pode chamar — retorna lista de distribuidores para o filtro do Kanban
export async function GET() {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  // Verifica se é ADMIN
  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = String(perfil?.role || "").toUpperCase();
  if (role !== "ADMIN") {
    return NextResponse.json({ ok: true, distribuidores: [] });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("role", ["DISTRIBUIDOR", "ADMIN"])
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, distribuidores: data || [] });
}
