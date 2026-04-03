import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { applyOrderToProInventory } from "@/lib/applyOrderToProInventory";

function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUser = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "orderId obrigatório" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Verifica se o pedido pertence ao usuário e está no status correto
    const { data: order } = await supabase
      .from("orders")
      .select("id, profile_id, status")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ ok: false, error: "Pedido não encontrado" }, { status: 404 });
    }
    if (order.profile_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Pedido não pertence a você" }, { status: 403 });
    }
    if (order.status !== "despachado") {
      return NextResponse.json({ ok: false, error: "Só é possível confirmar recebimento de pedidos despachados" }, { status: 400 });
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: "entregue" })
      .eq("id", orderId);

    if (error) {
      console.error("[confirmar-recebimento] erro:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const inv = await applyOrderToProInventory(supabase, orderId);
    if (!inv.ok) {
      console.error("[confirmar-recebimento] estoque:", inv.error);
      return NextResponse.json({
        ok: true,
        estoqueErro: inv.error,
        aviso: "Recebimento confirmado, mas o estoque do salão não foi atualizado automaticamente. Verifique o SQL (product_id / estoque_recebimento_aplicado) ou atualize na Gestão PRO.",
      });
    }

    return NextResponse.json({
      ok: true,
      estoque: { linhas: inv.appliedLines, observacao: inv.skipped },
    });
  } catch (err: any) {
    console.error("[confirmar-recebimento] erro geral:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
