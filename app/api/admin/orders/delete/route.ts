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
 * Apaga um pedido por ID (admin). POST { "orderId": "uuid", "secret": "..." }
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, secret } = await req.json().catch(() => ({}));
    const expected = (process.env.ADMIN_ORDERS_SECRET ?? "").trim();

    // Debug: ajuda a identificar divergência de segredo em produção
    console.log("[admin/orders/delete] expected_len:", expected.length, "received_len:", String(secret ?? "").trim().length);

    if (!expected || String(secret ?? "").trim() !== expected) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
    }
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ ok: false, error: "orderId obrigatório." }, { status: 400 });
    }

    const { supabase, error: cfgErr } = getServiceSupabase();
    if (cfgErr || !supabase) {
      return NextResponse.json({ ok: false, error: cfgErr || "Supabase inválido." }, { status: 500 });
    }

    const { error } = await deleteOrderCascade(supabase, orderId);
    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro" }, { status: 500 });
  }
}
