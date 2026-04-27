import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { applyOrderCatalogStock } from "@/lib/applyOrderCatalogStock";

function getSupabase() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

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
    .select("store_coins")
    .eq("id", order.profile_id)
    .single();

  await supabase
    .from("profiles")
    .update({ store_coins: Number(comprador?.store_coins || 0) + proBonus })
    .eq("id", order.profile_id);
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

  // Credita PRO coins ao embaixador na coluna total_compras_rede
  const proBonus = Math.round(valorPedido);
  const { data: embaixadorProfile } = await supabase
    .from("profiles")
    .select("total_compras_rede")
    .eq("id", comprador.indicado_por)
    .single();

  if (embaixadorProfile !== null) {
    await supabase
      .from("profiles")
      .update({ total_compras_rede: (embaixadorProfile?.total_compras_rede || 0) + proBonus })
      .eq("id", comprador.indicado_por);
  }
}

async function obterStatusNoMercadoPago(orderId: string, paymentId?: string) {
  const mpToken = process.env.MP_ACCESS_TOKEN;
  if (!mpToken) return { status: "pending", paymentId: paymentId || null };

  const statusMap: Record<string, string> = {
    approved: "paid",
    rejected: "cancelled",
    pending: "pending",
    in_process: "pending",
  };

  // 1) Se veio paymentId, consulta direta
  if (paymentId) {
    const mp = new MercadoPagoConfig({ accessToken: mpToken });
    const paymentClient = new Payment(mp);
    const payment = await paymentClient.get({ id: paymentId });
    return {
      status: statusMap[payment.status || ""] || "pending",
      paymentId: String(payment.id || paymentId),
    };
  }

  // 2) Sem paymentId, busca por external_reference
  const url = `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc&limit=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${mpToken}` },
    cache: "no-store",
  });
  const json = await res.json();
  const first = json?.results?.[0];
  if (!first) return { status: "pending", paymentId: null };

  return {
    status: statusMap[first.status || ""] || "pending",
    paymentId: first.id ? String(first.id) : null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, paymentId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "orderId obrigatório" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Busca status atual do pedido
    const { data: orderAtual } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .single();

    // Se já foi pago/cancelado, não consulta MP nem atualiza
    if (orderAtual?.status && ["paid", "separacao", "despachado", "entregue", "cancelled"].includes(orderAtual.status)) {
      const { data: order } = await supabase
        .from("orders")
        .select("id, total, status, created_at, shipping_address, shipping_cost")
        .eq("id", orderId)
        .single();
      return NextResponse.json({ ok: true, order, status: orderAtual.status });
    }

    // Consulta MP para obter status atual
    let mpCheck = { status: "pending", paymentId: paymentId || null };
    try {
      mpCheck = await obterStatusNoMercadoPago(orderId, paymentId || undefined);
    } catch (mpErr: any) {
      console.error("[confirm] Erro ao consultar MP:", mpErr.message);
      // Continua com status atual — não quebra o fluxo
    }

    const novoStatus = mpCheck.status;
    const paymentIdFinal = mpCheck.paymentId;

    // Só atualiza no banco se o status realmente mudou (evita acionar triggers desnecessariamente)
    if (novoStatus !== orderAtual?.status) {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: novoStatus })
        .eq("id", orderId);

      if (updateError) {
        console.error("[confirm] Erro ao atualizar order:", updateError.message);
        return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
      }
    }

    // Processa comissão e baixa de estoque catálogo para estados já pagos
    if (STATUS_PAGO.has(novoStatus)) {
      try {
        await creditarCompraPropria(supabase, orderId);
      } catch (ownErr: any) {
        console.error("[confirm] Erro ao creditar compra própria:", ownErr.message);
      }
    }

    if (STATUS_PAGO.has(novoStatus)) {
      try {
        await garantirComissao(supabase, orderId);
      } catch (comErr: any) {
        console.error("[confirm] Erro ao processar comissão:", comErr.message);
        // Não bloqueia — status já foi atualizado
      }
      try {
        const baixa = await applyOrderCatalogStock(supabase, orderId);
        if (!baixa.ok) {
          console.error("[confirm] Erro na baixa de estoque catálogo:", baixa.error);
        }
      } catch (stErr: any) {
        console.error("[confirm] Exceção na baixa de estoque catálogo:", stErr.message);
      }
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, total, status, created_at, shipping_address, shipping_cost")
      .eq("id", orderId)
      .single();

    return NextResponse.json({ ok: true, order, status: novoStatus });
  } catch (err: any) {
    console.error("[confirm] Erro geral:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

