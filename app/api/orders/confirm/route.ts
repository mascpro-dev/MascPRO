import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { applyOrderCatalogStock } from "@/lib/applyOrderCatalogStock";
import { applyOrderRewards } from "@/lib/applyOrderRewards";
import { atualizarComoPago, statusPedidoPago } from "@/lib/pedidoAtivo";

function getSupabase() {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

const STATUS_PAGO = new Set(["paid", "separacao", "despachado", "entregue"]);

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

    const jaEstavaPago = statusPedidoPago(orderAtual?.status);

    // Se já foi pago/cancelado, tenta aplicar recompensas pendentes e retorna
    if (orderAtual?.status && ["paid", "separacao", "despachado", "entregue", "cancelled"].includes(orderAtual.status)) {
      if (STATUS_PAGO.has(orderAtual.status)) {
        try {
          await applyOrderRewards(supabase, orderId);
        } catch (rewardErr: unknown) {
          const msg = rewardErr instanceof Error ? rewardErr.message : "erro recompensas";
          console.error("[confirm] recompensas (pedido já pago):", msg);
        }
      }

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
    } catch (mpErr: unknown) {
      const msg = mpErr instanceof Error ? mpErr.message : "erro MP";
      console.error("[confirm] Erro ao consultar MP:", msg);
    }

    const novoStatus = mpCheck.status;

    // Só atualiza no banco se o status realmente mudou
    if (novoStatus !== orderAtual?.status) {
      const { error: updateError } = statusPedidoPago(novoStatus)
        ? await atualizarComoPago(supabase, orderId, { status: novoStatus }, jaEstavaPago)
        : await supabase
            .from("orders")
            .update({ status: novoStatus })
            .eq("id", orderId);

      if (updateError) {
        console.error("[confirm] Erro ao atualizar order:", updateError.message);
        return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
      }
    }

    if (STATUS_PAGO.has(novoStatus) && !jaEstavaPago) {
      try {
        const rewards = await applyOrderRewards(supabase, orderId);
        if (!rewards.ok) {
          console.error("[confirm] recompensas:", rewards.error);
        }
      } catch (rewardErr: unknown) {
        const msg = rewardErr instanceof Error ? rewardErr.message : "erro recompensas";
        console.error("[confirm] Erro ao aplicar recompensas:", msg);
      }

      try {
        const baixa = await applyOrderCatalogStock(supabase, orderId);
        if (!baixa.ok) {
          console.error("[confirm] Erro na baixa de estoque catálogo:", baixa.error);
        }
      } catch (stErr: unknown) {
        const msg = stErr instanceof Error ? stErr.message : "erro estoque";
        console.error("[confirm] Exceção na baixa de estoque catálogo:", msg);
      }
    }

    const { data: order } = await supabase
      .from("orders")
      .select("id, total, status, created_at, shipping_address, shipping_cost")
      .eq("id", orderId)
      .single();

    return NextResponse.json({ ok: true, order, status: novoStatus });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("[confirm] Erro geral:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
