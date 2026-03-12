import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://appcerto-xi.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const { items, userId, userEmail, userName, accessToken } = await req.json();

    if (!items?.length || !userId) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    // Verifica se a chave MP está configurada
    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken || mpToken === "COLE_SEU_ACCESS_TOKEN_AQUI") {
      return NextResponse.json(
        { error: "MercadoPago não configurado. Adicione MP_ACCESS_TOKEN nas variáveis de ambiente do Vercel." },
        { status: 500 }
      );
    }

    // Supabase com o token do usuário logado (RLS funciona corretamente)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      accessToken
        ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
        : {}
    );

    const total = items.reduce(
      (acc: number, i: any) => acc + Number(i.displayPrice || i.price || 0) * Number(i.quantity || 1),
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
      console.error("Supabase order error:", JSON.stringify(orderError));
      return NextResponse.json(
        { error: `Erro ao registrar pedido: ${orderError?.message || "Tabela orders não encontrada. Execute o SQL no Supabase."}` },
        { status: 500 }
      );
    }

    // Itens do pedido
    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((i: any) => ({
        order_id: order.id,
        product_id: i.id,
        quantidade: Number(i.quantity || 1),
        preco_unitario: Number(i.displayPrice || i.price || 0),
      }))
    );
    if (itemsError) console.error("order_items error:", itemsError);

    // Cria preferência no MercadoPago
    const mp = new MercadoPagoConfig({ accessToken: mpToken });
    const preference = new Preference(mp);

    const mpItems = items.map((i: any) => ({
      id: String(i.id),
      title: i.title || i.name || "Produto MascPRO",
      description: i.category || "Produto MascPRO",
      picture_url: i.image_url || undefined,
      quantity: Number(i.quantity || 1),
      unit_price: Number(Number(i.displayPrice || i.price || 0).toFixed(2)),
      currency_id: "BRL",
    }));

    const result = await preference.create({
      body: {
        items: mpItems,
        payer: { name: userName || "", email: userEmail || "" },
        back_urls: {
          success: `${APP_URL}/loja/sucesso?order_id=${order.id}`,
          failure: `${APP_URL}/loja/falha?order_id=${order.id}`,
          pending: `${APP_URL}/loja/pendente?order_id=${order.id}`,
        },
        auto_return: "approved",
        notification_url: `${APP_URL}/api/mp-webhook`,
        external_reference: order.id,
        payment_methods: { installments: 12, default_installments: 1 },
        statement_descriptor: "MASCPRO",
      },
    });

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
    console.error("Checkout erro:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
