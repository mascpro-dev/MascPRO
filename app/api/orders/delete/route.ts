import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { deleteOrderCascade } from "@/lib/orderCleanup";

const ALLOWED_USER_DELETE: Set<string> = new Set(["pending", "novo", "cancelled"]);

/**
 * Usuário logado pode excluir apenas pedidos próprios em status de teste/rascunho/pendente/cancelado.
 * POST { "orderId": "uuid" }
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Faça login." }, { status: 401 });
    }

    const { orderId } = await req.json().catch(() => ({}));
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ ok: false, error: "orderId obrigatório." }, { status: 400 });
    }

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      return NextResponse.json(
        { ok: false, error: "Servidor sem SUPABASE_SERVICE_ROLE_KEY (necessário para exclusão segura)." },
        { status: 500 }
      );
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);

    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("id, profile_id, status")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
    }
    if (order.profile_id !== session.user.id) {
      return NextResponse.json({ ok: false, error: "Sem permissão." }, { status: 403 });
    }
    if (!ALLOWED_USER_DELETE.has(String(order.status || "").toLowerCase())) {
      return NextResponse.json(
        { ok: false, error: "Só é possível excluir pedidos pendentes, rascunho ou cancelados." },
        { status: 400 }
      );
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
