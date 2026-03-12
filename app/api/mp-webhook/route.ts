import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  // Usa service_role se disponível (bypassa RLS), senão anon key com grants manuais
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("MP Webhook recebido:", JSON.stringify(body));

    // MP envia vários tipos de notificação; só processa pagamentos
    if (body.type !== "payment") {
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) {
      console.error("MP_ACCESS_TOKEN não configurado");
      return NextResponse.json({ ok: false, error: "MP token missing" });
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
      return NextResponse.json({ ok: false, error: error.message });
    }

    console.log(`Pedido ${orderId} atualizado para ${newStatus}`);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Webhook MP erro:", err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
