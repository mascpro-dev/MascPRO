import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { equipeIds } = await req.json();
  if (!equipeIds?.length) return NextResponse.json({ ativos: {} });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Config error" }, { status: 500 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  // Usa updated_at para pegar pedidos que foram confirmados/atualizados este mês
  const { data: pedidos } = await supabase
    .from("orders")
    .select("profile_id")
    .in("profile_id", equipeIds)
    .in("status", ["paid", "separacao", "despachado", "entregue"])
    .gte("updated_at", inicioMes.toISOString());

  const ativos: Record<string, boolean> = {};
  for (const p of pedidos || []) {
    if (p.profile_id) ativos[p.profile_id] = true;
  }

  return NextResponse.json({ ativos });
}
