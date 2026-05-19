import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { calcularFretePedido } from "@/lib/fretePedido";
import { rateLimit, LIMITS } from "@/lib/rateLimit";

function getAppUrl(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, LIMITS.checkout);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde um momento antes de tentar novamente." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const APP_URL = getAppUrl(req);
    const {
      items,
      userId,
      userEmail,
      userName,
      accessToken,
      shippingCost,
      shippingCep,
      shippingAddress,
      shippingCity,
      shippingState,
    } = await req.json();

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

    const subtotal = items.reduce(
      (acc: number, i: any) => acc + Number(i.displayPrice || i.price || 0) * Number(i.quantity || 1),
      0
    );

    const cepDestino = String(shippingCep || "").replace(/\D/g, "");
    let frete = 0;
    let freteGratis = false;

    try {
      const freteCalc = await calcularFretePedido({
        subtotal,
        cepDestino,
        cidade: shippingCity,
        estado: shippingState,
        items: items.map((i: { id: string; quantity?: number }) => ({
          id: i.id,
          quantity: Number(i.quantity || 1),
        })),
        supabase,
      });
      frete = freteCalc.frete;
      freteGratis = freteCalc.freteGratis;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao calcular frete.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const freteCliente = Number(shippingCost);
    if (Number.isFinite(freteCliente) && Math.abs(freteCliente - frete) > 0.02) {
      return NextResponse.json(
        {
          error: freteGratis
            ? "O frete grátis não foi aplicado corretamente. Feche o carrinho e abra de novo."
            : "O valor do frete mudou. Aguarde o cálculo e tente pagar novamente.",
        },
        { status: 409 }
      );
    }

    const total = subtotal + frete;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        profile_id: userId,
        total: Number(total.toFixed(2)),
        payment_method: "mercadopago",
        status: "pending",
        shipping_cost: frete,
        shipping_cep: shippingCep || null,
        shipping_address: shippingAddress || null,
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

    const mpItems: any[] = items.map((i: any) => ({
      id: String(i.id),
      title: i.title || i.name || "Produto MascPRO",
      description: i.category || "Produto MascPRO",
      picture_url: i.image_url || undefined,
      quantity: Number(i.quantity || 1),
      unit_price: Number(Number(i.displayPrice || i.price || 0).toFixed(2)),
      currency_id: "BRL",
    }));

    // Adiciona frete como item separado no MP (se houver)
    if (frete > 0) {
      mpItems.push({
        id: "frete",
        title: "Frete — PAC Correios",
        description: shippingCep ? `CEP ${shippingCep}` : "Entrega",
        quantity: 1,
        unit_price: Number(frete.toFixed(2)),
        currency_id: "BRL",
      });
    }

    const payer: Record<string, string> = {};
    if (userName) payer.name = String(userName);
    if (userEmail) payer.email = String(userEmail);

    const backUrls = {
      success: `${APP_URL}/loja/sucesso?order_id=${order.id}`,
      failure: `${APP_URL}/loja/falha?order_id=${order.id}`,
      pending: `${APP_URL}/loja/pendente?order_id=${order.id}`,
    };
    const podeAutoReturn = APP_URL.startsWith("https://");

    const result = await preference.create({
      body: {
        items: mpItems,
        ...(Object.keys(payer).length > 0 ? { payer } : {}),
        back_urls: backUrls,
        ...(podeAutoReturn ? { auto_return: "approved" as const } : {}),
        notification_url: `${APP_URL}/api/mp-webhook`,
        external_reference: order.id,
        payment_methods: { installments: 12, default_installments: 1 },
        statement_descriptor: "MASCPRO",
      },
    });

    const checkoutUrl = result.init_point || (result as any).sandbox_init_point;
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Mercado Pago não retornou URL de pagamento. Verifique se o token é de produção/teste correto." },
        { status: 502 }
      );
    }

    await supabase
      .from("orders")
      .update({ mp_preference_id: result.id })
      .eq("id", order.id);

    return NextResponse.json({
      init_point: checkoutUrl,
      preference_id: result.id,
      order_id: order.id,
    });
  } catch (err: any) {
    console.error("Checkout erro:", err);
    const detalhe =
      err?.cause?.[0]?.description ||
      err?.cause?.[0]?.message ||
      err?.message ||
      "Falha ao criar pagamento no Mercado Pago.";
    return NextResponse.json({ error: detalhe }, { status: 500 });
  }
}
