import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { deleteOrderCascade } from "@/lib/orderCleanup";

function getServiceSupabase(): { supabase: SupabaseClient | null; error: string | null } {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    return { supabase: null, error: "SUPABASE_SERVICE_ROLE_KEY não configurada." };
  }
  return {
    supabase: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key),
    error: null,
  };
}

/**
 * Apaga TODOS os pedidos (teste / limpeza). Exige segredo em ADMIN_ORDERS_SECRET.
 * POST { "secret": "..." }
 */
export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json().catch(() => ({}));
    const expected = (process.env.ADMIN_ORDERS_SECRET ?? "").trim();

    console.log("[admin/orders/clear] expected_len:", expected.length, "received_len:", String(secret ?? "").trim().length);

    if (!expected || String(secret ?? "").trim() !== expected) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }

    const { supabase, error: cfgErr } = getServiceSupabase();
    if (cfgErr || !supabase) {
      return NextResponse.json({ ok: false, error: cfgErr || "Supabase inválido." }, { status: 500 });
    }

    const { data: orders, error: listErr } = await supabase.from("orders").select("id");
    if (listErr) {
      return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
    }

    let removed = 0;
    for (const row of orders || []) {
      const { error } = await deleteOrderCascade(supabase, row.id);
      if (error) {
        return NextResponse.json({ ok: false, error, removed }, { status: 500 });
      }
      removed += 1;
    }

    return NextResponse.json({ ok: true, removed });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}
