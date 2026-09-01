import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { applyOrderCatalogStock } from "@/lib/applyOrderCatalogStock";
import { applyOrderRewards } from "@/lib/applyOrderRewards";
import { rateLimit, LIMITS } from "@/lib/rateLimit";
import { atualizarComoPago } from "@/lib/pedidoAtivo";

function getSupabase() {
  // Usa service_role se disponível (bypassa RLS), senão anon key com grants manuais
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

const STATUS_PAGO = new Set(["paid", "separacao", "despachado", "entregue"]);

/** Verifica assinatura HMAC-SHA256 do Mercado Pago */
async function verificarAssinaturaMP(req: NextRequest, body: any): Promise<boolean> {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // Se não configurou o secret, permite passar (retrocompatibilidade)
    // Para produção: adicione MP_WEBHOOK_SECRET no .env
    console.warn("[mp-webhook] MP_WEBHOOK_SECRET não configurado — assinatura não verificada");
    return true;
  }

  const xSignature  = req.headers.get("x-signature") || "";
  const xRequestId  = req.headers.get("x-request-id") || "";
  const url         = new URL(req.url);
  const dataId      = url.searchParams.get("data.id") || url.searchParams.get("id") || body?.data?.id || "";

  if (!xSignature) {
    console.warn("[mp-webhook] Header x-signature ausente");
    return false;
  }

  // Extrai ts e v1 do header: "ts=TIMESTAMP,v1=HASH"
  const parts = Object.fromEntries(xSignature.split(",").map((p) => p.split("=")));
  const ts = parts["ts"];
  const v1 = parts["v1"];

  if (!ts || !v1) return false;

  // Manifesto a assinar: id:PAYMENT_ID;request-id:REQUEST_ID;ts:TIMESTAMP
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts}`;

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(manifest);

    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const sigHex = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (sigHex !== v1) {
      console.error("[mp-webhook] Assinatura inválida — possível requisição forjada");
      return false;
    }
    return true;
  } catch (e) {
    console.error("[mp-webhook] Erro ao verificar assinatura:", e);
    return false;
  }
}

// Suporta GET para validação inicial do MP
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, LIMITS.webhook);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit." }, { status: 429 });
  }

  try {
    const url = new URL(req.url);
    // Formato IPN: ?topic=payment&id=PAYMENT_ID
    // Formato novo: body { type: "payment", data: { id: "PAYMENT_ID" } }
    const queryTopic = url.searchParams.get("topic") || url.searchParams.get("type");
    const queryId    = url.searchParams.get("id") || url.searchParams.get("data.id");

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    // ── Verifica assinatura do MP ─────────────────────────
    const assinaturaValida = await verificarAssinaturaMP(req, body);
    if (!assinaturaValida) {
      return NextResponse.json({ ok: false, error: "Assinatura inválida." }, { status: 401 });
    }

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

    const { error } = STATUS_PAGO.has(newStatus)
      ? await atualizarComoPago(
          supabase,
          String(orderId),
          { status: newStatus, mp_payment_id: String(paymentId) },
          jaEstavaPago
        )
      : await supabase
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
      const rewards = await applyOrderRewards(supabase, String(orderId));
      if (!rewards.ok) {
        console.error("[mp-webhook] recompensas:", rewards.error);
      }
    }

    if (STATUS_PAGO.has(newStatus)) {
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
