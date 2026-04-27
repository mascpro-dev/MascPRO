import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();

    // Pedidos confirmados este mês
    const { data: pedidos, error: errPedidos } = await supabase
      .from("orders")
      .select("profile_id")
      .in("status", ["paid", "separacao", "despachado", "entregue"])
      .gte("created_at", inicioMes);

    if (errPedidos) return NextResponse.json({ ok: false, error: errPedidos.message }, { status: 500 });

    const idsAtivos = [...new Set((pedidos || []).map((p: any) => p.profile_id).filter(Boolean))];

    if (idsAtivos.length === 0) {
      return NextResponse.json({ ok: true, membros: [] });
    }

    const { data: profiles, error: errProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, whatsapp, role, created_at, personal_coins, network_coins, total_compras_proprias, total_compras_rede, pro_total, avatar_url")
      .in("id", idsAtivos)
      .order("full_name");

    if (errProfiles) return NextResponse.json({ ok: false, error: errProfiles.message }, { status: 500 });

    return NextResponse.json({ ok: true, membros: profiles || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
