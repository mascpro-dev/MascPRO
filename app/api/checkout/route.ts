import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

// Cliente Supabase com service_role para operações server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Taxas de parcelamento repassadas ao comprador (MercadoPago Brasil)
const INSTALLMENT_RATES: Record<number, number> = {
  1: 0,     // à vista — absorvido pela loja
  2: 0.0199,
  3: 0.0299,
  4: 0.0399,
  6: 0.0599,
  10: 0.0999,
  12: 0.1199,
};

export async function POST(req: NextRequest) {
  try {
    const { items, userId, userEmail, userName } = await req.json();

    if (!items?.length || !userId) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    // Cria o pedido no Supabase com status 'pending'
    const total = items.reduce(
      (acc: number, i: any) => acc + i.displayPrice * i.quantity,
      0
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        profile_id: userId,
        total: Number(total.toFixed(2)),
        payment_method: "mercadopago",
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Erro ao criar pedido:", orderError);
      return NextResponse.json({ error: "Erro ao registrar pedido." }, { status: 500 });
    }

    // Salva os itens do pedido
    await supabase.from("order_items").insert(
      items.map((i: any) => ({
        order_id: order.id,
        product_id: i.id,
        quantidade: i.quantity,
        preco_unitario: i.displayPrice,
      }))
    );

    // Monta os itens para o MercadoPago
    const mpItems = items.map((i: any) => ({
      id: i.id,
      title: i.title || i.name || "Produto MascPRO",
      description: i.category || "Produto",
      picture_url: i.image_url || undefined,
      quantity: Number(i.quantity),
      unit_price: Number(Number(i.displayPrice).toFixed(2)),
      currency_id: "BRL",
    }));

    const preference = new Preference(mp);
    const result = await preference.create({
      body: {
        items: mpItems,
        payer: {
          name: userName || "",
          email: userEmail || "",
        },
        back_urls: {
          success: `${APP_URL}/loja/sucesso?order_id=${order.id}`,
          failure: `${APP_URL}/loja/falha?order_id=${order.id}`,
          pending: `${APP_URL}/loja/pendente?order_id=${order.id}`,
        },
        auto_return: "approved",
        notification_url: `${APP_URL}/api/mp-webhook`,
        external_reference: order.id,
        // Parcelamento: comprador assume as taxas a partir de 2x
        payment_methods: {
          installments: 12,
          default_installments: 1,
        },
        statement_descriptor: "MASCPRO",
      },
    });

    // Salva o preference_id no pedido
    await supabase
      .from("orders")
      .update({ mp_preference_id: result.id })
      .eq("id", order.id);

    return NextResponse.json({
      init_point: result.init_point,
      preference_id: result.id,
      order_id: order.id,
    });
  } catch (err: any) {
    console.error("Erro no checkout MP:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
