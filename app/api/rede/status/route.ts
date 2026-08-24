import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { boundsMesBrasil, ymSaoPaulo } from "@/lib/comercialRegua";
import { pedidosAtivosDosPerfis } from "@/lib/pedidoAtivo";

export async function POST(req: NextRequest) {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { equipeIds } = await req.json();
  if (!equipeIds?.length) return NextResponse.json({ ativos: {}, periodo: ymSaoPaulo() });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Config error" }, { status: 500 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const periodo = ymSaoPaulo();
  const { ini, fim } = boundsMesBrasil(periodo);

  const ids = (equipeIds as unknown[]).map((id) => String(id)).filter(Boolean);
  const pedidos = await pedidosAtivosDosPerfis(supabase, ids, ini, fim);
  if (pedidos.error) {
    console.error("[api/rede/status] erro:", pedidos.error);
    return NextResponse.json({ ativos: {}, error: pedidos.error, periodo }, { status: 500 });
  }

  const ativos: Record<string, boolean> = {};
  for (const p of pedidos.rows) {
    if (p.profile_id) ativos[p.profile_id] = true;
  }

  return NextResponse.json({ ativos, periodo });
}
