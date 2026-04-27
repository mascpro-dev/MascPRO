import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyOrderToProInventory } from "@/lib/applyOrderToProInventory";
import { applyOrderCatalogStock } from "@/lib/applyOrderCatalogStock";

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

const STATUS_PAGO = new Set(["paid", "separacao", "despachado", "entregue"]);

async function creditarCompraPropria(supabase: any, orderId: string) {
  const { data: order } = await supabase
    .from("orders")
    .select("id, profile_id, total")
    .eq("id", orderId)
    .single();
  if (!order?.profile_id) return;

  const proBonus = Math.round(Number(order.total || 0));
  if (proBonus <= 0) return;

  const { data: comprador } = await supabase
    .from("profiles")
    .select("total_compras_proprias")
    .eq("id", order.profile_id)
    .single();

  await supabase
    .from("profiles")
    .update({ total_compras_proprias: Number(comprador?.total_compras_proprias || 0) + proBonus })
    .eq("id", order.profile_id);
}

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

  const { error: eIns } = await supabase.from("commissions").insert({
    embaixador_id: comprador.indicado_por,
    cabeleireiro_id: comprador.id,
    order_id: order.id,
    valor_pedido: valorPedido,
    percentual: 15,
    valor_comissao: valorComissao,
    status: "disponivel",
  });
  if (eIns) throw new Error(eIns.message);

  const proBonus = Math.round(valorPedido);
  if (proBonus > 0) {
    const { data: emb } = await supabase
      .from("profiles").select("total_compras_rede").eq("id", comprador.indicado_por).single();
    const { error: eUp } = await supabase.from("profiles")
      .update({ total_compras_rede: (emb?.total_compras_rede || 0) + proBonus })
      .eq("id", comprador.indicado_por);
    if (eUp) throw new Error(eUp.message);
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
    const { data: orderAtual } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();
    const jaEstavaPago = STATUS_PAGO.has(normalizeOrderStatus(orderAtual?.status));

    const { error } = await supabase
      .from("orders")
      .update({ status: statusNormalizado })
      .eq("id", orderId);

    if (error) {
      console.error("[admin/orders/status] erro update:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (STATUS_PAGO.has(statusNormalizado) && !jaEstavaPago) {
      try {
        await creditarCompraPropria(supabase, orderId);
      } catch (e: any) {
        console.error("[admin/orders/status] erro compra própria:", e.message);
      }
    }

    if (STATUS_PAGO.has(statusNormalizado)) {
      try {
        await processarComissao(supabase, orderId);
      } catch (e: any) {
        console.error("[admin/orders/status] erro comissão:", e.message);
      }
    }

    if (STATUS_PAGO.has(statusNormalizado)) {
      try {
        const baixa = await applyOrderCatalogStock(supabase, orderId);
        if (!baixa.ok) {
          console.error("[admin/orders/status] estoque catálogo:", baixa.error);
          return NextResponse.json({ ok: true, estoqueCatalogoErro: baixa.error });
        }
      } catch (e: any) {
        console.error("[admin/orders/status] estoque catálogo exceção:", e.message);
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
