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

  // ATIVO = tem qualquer pedido confirmado/pago (sem filtro de data)
  const { data: pedidos, error } = await supabase
    .from("orders")
    .select("profile_id")
    .in("profile_id", equipeIds)
    .in("status", ["paid", "separacao", "despachado", "entregue"]);

  if (error) {
    console.error("[api/rede/status] erro:", error.message);
    return NextResponse.json({ ativos: {}, error: error.message }, { status: 500 });
  }

  const ativos: Record<string, boolean> = {};
  for (const p of pedidos || []) {
    if (p.profile_id) ativos[p.profile_id] = true;
  }

  return NextResponse.json({ ativos });
}
