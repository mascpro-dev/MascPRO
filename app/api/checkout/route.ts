import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { calcularFretePedido } from "@/lib/fretePedido";
import { rateLimit, LIMITS } from "@/lib/rateLimit";

export const maxDuration = 10;
export const dynamic = "force-dynamic";

function sbService() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

async function verifyUser(accessToken: string | undefined, userId: string) {
  if (!accessToken) return { ok: false as const, error: "Sessão expirada. Faça login novamente." };
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return { ok: false as const, error: "Sessão inválida. Faça login novamente." };
  if (user.id !== userId) return { ok: false as const, error: "Usuário não confere com a sessão." };
  return { ok: true as const, user };
}

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

    const auth = await verifyUser(accessToken, userId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const db = sbService();
    if (!db) {
      return NextResponse.json(
        { error: "Servidor sem permissão para registrar pedidos. Configure SUPABASE_SERVICE_ROLE_KEY." },
        { status: 500 }
      );
    }

    // Verifica se a chave MP está configurada
    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken || mpToken === "COLE_SEU_ACCESS_TOKEN_AQUI") {
      return NextResponse.json(
        { error: "MercadoPago não configurado. Adicione MP_ACCESS_TOKEN nas variáveis de ambiente do Vercel." },
        { status: 500 }
      );
    }

    const subtotal = items.reduce(
      (acc: number, i: any) => acc + Number(i.displayPrice || i.price || 0) * Number(i.quantity || 1),
      0
    );

    const cepDestino = String(shippingCep || "").replace(/\D/g, "");
    const freteCliente = Number(shippingCost);
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
        supabase: db,
        correiosTimeoutMs: 6_000,
      });
      frete = freteCalc.frete;
      freteGratis = freteCalc.freteGratis;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao calcular frete.";
      const podeUsarFreteCarrinho =
        Number.isFinite(freteCliente) &&
        freteCliente > 0 &&
        cepDestino.length === 8;

      if (podeUsarFreteCarrinho) {
        frete = Number(freteCliente.toFixed(2));
        console.warn("[checkout] Correios indisponível — usando frete do carrinho:", frete);
      } else {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    const total = subtotal + frete;

    const { data: order, error: orderError } = await db
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
    const { error: itemsError } = await db.from("order_items").insert(
      items.map((i: any) => ({
        order_id: order.id,
        product_id: i.id,
        quantidade: Number(i.quantity || 1),
        preco_unitario: Number(i.displayPrice || i.price || 0),
      }))
    );
    if (itemsError) console.error("order_items error:", itemsError);

    const mp = new MercadoPagoConfig({ accessToken: mpToken });
    const preference = new Preference(mp);

    const mpItems: Array<{
      id: string;
      title: string;
      quantity: number;
      unit_price: number;
      currency_id: string;
    }> = [];

    for (const i of items) {
      const unit = Number(Number(i.displayPrice || i.price || 0).toFixed(2));
      if (!Number.isFinite(unit) || unit < 0.01) {
        return NextResponse.json(
          { error: `Preço inválido para o produto "${i.title || i.name || i.id}".` },
          { status: 400 }
        );
      }
      const title = String(i.title || i.name || "Produto MascPRO").slice(0, 256);
      mpItems.push({
        id: String(i.id).slice(0, 256),
        title,
        quantity: Math.max(1, Number(i.quantity || 1)),
        unit_price: unit,
        currency_id: "BRL",
      });
    }

    // Adiciona frete como item separado no MP (se houver)
    if (frete >= 0.01) {
      mpItems.push({
        id: "frete",
        title: "Frete PAC Correios",
        quantity: 1,
        unit_price: Number(frete.toFixed(2)),
        currency_id: "BRL",
      });
    }

    const payer: { email?: string; name?: string } = {};
    const email = String(userEmail || auth.user.email || "").trim();
    if (email) payer.email = email;
    const nome = String(userName || "").trim();
    if (nome) payer.name = nome.slice(0, 256);

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

    await db
      .from("orders")
      .update({ mp_preference_id: result.id })
      .eq("id", order.id);

    return NextResponse.json({
      init_point: checkoutUrl,
      preference_id: result.id,
      order_id: order.id,
      frete: Number(frete.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      total: Number(total.toFixed(2)),
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
