import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

async function garantirComissao(supabase: any, orderId: string) {
  const { data: existente } = await supabase
    .from("commissions")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existente) return;

  const { data: order } = await supabase
    .from("orders")
    .select("id, profile_id, total")
    .eq("id", orderId)
    .single();
  if (!order?.profile_id) return;

  const { data: comprador } = await supabase
    .from("profiles")
    .select("id, indicado_por")
    .eq("id", order.profile_id)
    .single();
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
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, paymentId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "orderId obrigatório" }, { status: 400 });
    }

    const supabase = getSupabase();
    let novoStatus = "paid";

    // Se vier paymentId, valida no MP
    if (paymentId) {
      const mpToken = process.env.MP_ACCESS_TOKEN;
      if (mpToken) {
        const mp = new MercadoPagoConfig({ accessToken: mpToken });
        const paymentClient = new Payment(mp);
        const payment = await paymentClient.get({ id: paymentId });
        const statusMap: Record<string, string> = {
          approved: "paid",
          rejected: "cancelled",
          pending: "pending",
          in_process: "pending",
        };
        novoStatus = statusMap[payment.status || ""] || "pending";
      }
    }

    const { error } = await supabase
      .from("orders")
      .update({
        status: novoStatus,
        ...(paymentId ? { mp_payment_id: String(paymentId) } : {}),
      })
      .eq("id", orderId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (novoStatus === "paid") {
      await garantirComissao(supabase, orderId);
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, total, status, created_at, shipping_address, shipping_cost")
      .eq("id", orderId)
      .single();

    return NextResponse.json({ ok: true, order });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

