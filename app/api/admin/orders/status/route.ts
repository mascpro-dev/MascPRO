import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyOrderToProInventory } from "@/lib/applyOrderToProInventory";

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

function normalizeOrderStatus(raw: unknown): string {
  return String(raw || "").trim().toLowerCase();
}

const ALLOWED_STATUS = new Set([
  "novo",
  "pending",
  "paid",
  "separacao",
  "despachado",
  "entregue",
  "cancelled",
]);

async function processarComissao(supabase: any, orderId: string) {
  const { data: existente } = await supabase
    .from("commissions").select("id").eq("order_id", orderId).maybeSingle();
  if (existente) return;

  const { data: order } = await supabase
    .from("orders").select("id, profile_id, total").eq("id", orderId).single();
  if (!order?.profile_id) return;

  const { data: comprador } = await supabase
    .from("profiles").select("id, indicado_por").eq("id", order.profile_id).single();
  if (!comprador?.indicado_por) return;

  const valorPedido = Number(order.total || 0);
  const valorComissao = Number((valorPedido * 0.15).toFixed(2));
  if (valorComissao <= 0) return;

  await supabase.from("commissions").insert({
    embaixador_id: comprador.indicado_por,
    cabeleireiro_id: comprador.id,
    order_id: order.id,
    valor_pedido: valorPedido,
    percentual: 15,
    valor_comissao: valorComissao,
    status: "disponivel",
  });

  const proBonus = Math.round(valorPedido);
  if (proBonus > 0) {
    const { data: emb } = await supabase
      .from("profiles").select("total_compras_rede").eq("id", comprador.indicado_por).single();
    await supabase.from("profiles")
      .update({ total_compras_rede: (emb?.total_compras_rede || 0) + proBonus })
      .eq("id", comprador.indicado_por);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, novoStatus } = await req.json();
    if (!orderId || !novoStatus) {
      return NextResponse.json({ ok: false, error: "orderId e novoStatus obrigatórios" }, { status: 400 });
    }
    const statusNormalizado = normalizeOrderStatus(novoStatus);
    if (!ALLOWED_STATUS.has(statusNormalizado)) {
      return NextResponse.json({ ok: false, error: "Status invalido." }, { status: 400 });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from("orders")
      .update({ status: statusNormalizado })
      .eq("id", orderId);

    if (error) {
      console.error("[admin/orders/status] erro update:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (statusNormalizado === "paid") {
      try {
        await processarComissao(supabase, orderId);
      } catch (e: any) {
        console.error("[admin/orders/status] erro comissão:", e.message);
      }
    }

    if (statusNormalizado === "entregue") {
      try {
        const inv = await applyOrderToProInventory(supabase, orderId);
        if (!inv.ok) {
          console.error("[admin/orders/status] estoque:", inv.error);
          return NextResponse.json({ ok: true, estoqueErro: inv.error });
        }
        return NextResponse.json({ ok: true, estoque: inv });
      } catch (e: any) {
        console.error("[admin/orders/status] estoque exceção:", e.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/orders/status] erro geral:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
