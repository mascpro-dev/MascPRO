import { NextResponse } from "next/server";
import { getAdminServiceClient } from "@/lib/adminServer";

export async function GET() {
  try {
    const { supabase, error, status } = await getAdminServiceClient();
    if (!supabase) return NextResponse.json({ ok: false, error }, { status });

    const [{ data: profiles }, { data: pedidos }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, whatsapp, instagram, role, nivel, city, state, created_at, indicado_por, moedas_pro_acumuladas, network_coins, total_compras_rede, avatar_url")
        .order("moedas_pro_acumuladas", { ascending: false }),
      supabase
        .from("orders")
        .select("profile_id")
        .in("status", ["paid", "separacao", "despachado", "entregue"]),
    ]);

    if (!profiles) return NextResponse.json({ ok: false, error: "Erro ao buscar perfis" }, { status: 500 });

    // IDs com compra confirmada
    const idsComCompra = new Set((pedidos || []).map((p: any) => p.profile_id).filter(Boolean));

    // Mapa de perfis para lookup de indicador
    const perfilMap = new Map(profiles.map((p: any) => [p.id, p]));

    const membros = profiles.map((m: any) => ({
      ...m,
      tem_compra: idsComCompra.has(m.id),
      indicador: m.indicado_por ? (perfilMap.get(m.indicado_por) ? { full_name: perfilMap.get(m.indicado_por).full_name } : null) : null,
    }));

    return NextResponse.json({ ok: true, membros });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
