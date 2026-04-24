import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { applyOrderCatalogStock } from "@/lib/applyOrderCatalogStock";

function getSupabase() {
  // Usa service_role se disponível (bypassa RLS), senão anon key com grants manuais
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

  // Credita PRO coins (total_compras_rede) ao embaixador
  const proBonus = Math.round(valorPedido);
  if (proBonus > 0) {
    const { data: emb } = await supabase
      .from("profiles")
      .select("total_compras_rede")
      .eq("id", comprador.indicado_por)
      .single();
    await supabase
      .from("profiles")
      .update({ total_compras_rede: (emb?.total_compras_rede || 0) + proBonus })
      .eq("id", comprador.indicado_por);
  }
}

// Suporta GET para validação inicial do MP
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // Formato IPN: ?topic=payment&id=PAYMENT_ID
    // Formato novo: body { type: "payment", data: { id: "PAYMENT_ID" } }
    const queryTopic = url.searchParams.get("topic") || url.searchParams.get("type");
    const queryId    = url.searchParams.get("id") || url.searchParams.get("data.id");

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    const type      = body.type || body.action?.split(".")?.[0] || queryTopic;
    const paymentId = body.data?.id || queryId;

    console.log("[mp-webhook] type:", type, "paymentId:", paymentId, "body:", JSON.stringify(body));

    // Aceita tanto "payment" quanto "payment.updated" / "payment.created"
    if (!String(type || "").includes("payment")) {
      return NextResponse.json({ ok: true });
    }

    if (!paymentId) return NextResponse.json({ ok: true });

    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) {
      console.error("MP_ACCESS_TOKEN não configurado");
      return NextResponse.json({ ok: false, error: "MP token missing" }, { status: 500 });
    }

    const mp = new MercadoPagoConfig({ accessToken: mpToken });
    const paymentClient = new Payment(mp);
    const payment = await paymentClient.get({ id: paymentId });

    console.log("MP payment status:", payment.status, "external_reference:", payment.external_reference);

    const orderId = payment.external_reference;
    if (!orderId) return NextResponse.json({ ok: true });

    const statusMap: Record<string, string> = {
      approved:   "paid",
      rejected:   "cancelled",
      pending:    "pending",
      in_process: "pending",
    };
    const newStatus = statusMap[payment.status || ""] || "pending";

    const supabase = getSupabase();

    const { error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        mp_payment_id: String(paymentId),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (newStatus === "paid") {
      await garantirComissao(supabase, String(orderId));
      const baixa = await applyOrderCatalogStock(supabase, String(orderId));
      if (!baixa.ok) {
        console.error("[mp-webhook] baixa estoque catálogo:", baixa.error);
      }
    }

    console.log(`Pedido ${orderId} atualizado para ${newStatus}`);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Webhook MP erro:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
