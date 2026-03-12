import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MercadoPago envia notificações de vários tipos; só processa pagamentos
    if (body.type !== "payment") {
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    // Busca detalhes do pagamento na API do MercadoPago
    const paymentClient = new Payment(mp);
    const payment = await paymentClient.get({ id: paymentId });

    const orderId = payment.external_reference;
    const mpStatus = payment.status; // approved | rejected | pending

    if (!orderId) return NextResponse.json({ ok: true });

    // Mapeia status MP → status interno
    const statusMap: Record<string, string> = {
      approved: "paid",
      rejected: "cancelled",
      pending: "pending",
      in_process: "pending",
    };
    const newStatus = statusMap[mpStatus || ""] || "pending";

    // Atualiza o pedido — o trigger fn_gera_comissao dispara automaticamente quando status = 'paid'
    await supabase
      .from("orders")
      .update({
        status: newStatus,
        mp_payment_id: String(paymentId),
      })
      .eq("id", orderId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Webhook MP erro:", err);
    // Sempre retorna 200 para o MP não retentar em erros de lógica
    return NextResponse.json({ ok: false, error: err.message });
  }
}
