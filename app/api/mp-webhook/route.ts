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

const STATUS_PAGO = new Set(["paid", "separacao", "despachado", "entregue"]);

async function creditarCompraPropria(supabase: any, orderId: string) {
  // Verifica flag de idempotência — evita dupla contagem
  const { data: order } = await supabase
    .from("orders")
    .select("id, profile_id, total, pro_aplicado")
    .eq("id", orderId)
    .single();
  if (!order?.profile_id || order?.pro_aplicado) return;

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

  // Marca como aplicado para evitar duplicação em chamadas futuras
  await supabase
    .from("orders")
    .update({ pro_aplicado: true })
    .eq("id", orderId);
}

async function garantirComissao(supabase: any, orderId: string) {
  // Dupla proteção: flag no pedido + unicidade na tabela commissions
  const { data: order } = await supabase
    .from("orders")
    .select("id, profile_id, total, comissao_aplicada")
    .eq("id", orderId)
    .single();
  if (!order?.profile_id || order?.comissao_aplicada) return;

  // Verifica também se já existe comissão para este pedido
  const { data: existente } = await supabase
    .from("commissions")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existente) {
    // Sincroniza a flag se já havia registro
    await supabase.from("orders").update({ comissao_aplicada: true }).eq("id", orderId);
    return;
  }

  const { data: comprador } = await supabase
    .from("profiles")
    .select("id, indicado_por")
    .eq("id", order.profile_id)
    .single();
  if (!comprador?.indicado_por) return;

  // Busca percentual configurável
  const { data: cfg } = await supabase
    .from("system_config")
    .select("valor")
    .eq("chave", "percentual_comissao")
    .maybeSingle();
  const percentual = Number(cfg?.valor || 15);

  const valorPedido = Number(order.total || 0);
  const valorComissao = Number((valorPedido * (percentual / 100)).toFixed(2));
  if (valorComissao <= 0) return;

  await supabase.from("commissions").insert({
    embaixador_id:    comprador.indicado_por,
    cabeleireiro_id:  comprador.id,
    order_id:         order.id,
    valor_pedido:     valorPedido,
    percentual,
    valor_comissao:   valorComissao,
    status:           "disponivel",
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

  // Marca pedido com flag de comissão aplicada
  await supabase.from("orders").update({ comissao_aplicada: true }).eq("id", orderId);
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
    const { data: orderAtual } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();
    const jaEstavaPago = STATUS_PAGO.has(String(orderAtual?.status || "").toLowerCase());

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

    if (STATUS_PAGO.has(newStatus) && !jaEstavaPago) {
      await creditarCompraPropria(supabase, String(orderId));
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
