import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import {
  calcularFretePAC,
  getDimensoesPadraoEm,
  getPesoDefaultProdutoGramas,
  getPesoEmbalagemGramas,
  pesoTotalGramasItens,
} from "@/lib/correiosFrete";
import { isCepMariliaSp } from "@/lib/freteMarilia";

const FRETE_GRATIS_ACIMA = 1500;

function getAppUrl(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

export async function POST(req: NextRequest) {
  try {
    const APP_URL = getAppUrl(req);
    const { items, userId, userEmail, userName, accessToken, shippingCep, shippingAddress } = await req.json();

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
    const isentoSubtotal = subtotal >= FRETE_GRATIS_ACIMA;
    const isentoMarilia = cepDestino.length === 8 && isCepMariliaSp(cepDestino);
    const freteGratis = isentoSubtotal || isentoMarilia;
    let frete = 0;

    if (!freteGratis) {
      if (cepDestino.length !== 8) {
        return NextResponse.json({ error: "CEP de entrega inválido ou ausente." }, { status: 400 });
      }
      const cepOrigem = String(process.env.CORREIOS_CEP_ORIGEM || "").replace(/\D/g, "");
      if (cepOrigem.length !== 8) {
        return NextResponse.json(
          { error: "Loja sem CEP de postagem: configure CORREIOS_CEP_ORIGEM no servidor (8 dígitos)." },
          { status: 500 }
        );
      }
      const cartIds = items.map((i: { id: string }) => i.id);
      const { data: productRows, error: perr } = await supabase
        .from("products")
        .select("id, peso_gramas")
        .in("id", cartIds);
      if (perr || !productRows?.length) {
        return NextResponse.json(
          { error: "Não foi possível validar o peso dos produtos. Tente novamente." },
          { status: 500 }
        );
      }
      const cartIt = items.map((i: { id: string; quantity?: number }) => ({
        id: i.id,
        quantity: Number(i.quantity || 1),
      }));
      const pesoBase = pesoTotalGramasItens(
        productRows,
        cartIt,
        getPesoDefaultProdutoGramas()
      );
      const pesoGramas = pesoBase + getPesoEmbalagemGramas();
      const r = await calcularFretePAC({
        cepOrigem,
        cepDestino,
        pesoGramas,
        dim: getDimensoesPadraoEm(),
      });
      if (!r.ok) {
        return NextResponse.json(
          { error: `Não foi possível calcular o frete: ${r.mensagem}` },
          { status: 502 }
        );
      }
      frete = Number(r.valor.toFixed(2));
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
