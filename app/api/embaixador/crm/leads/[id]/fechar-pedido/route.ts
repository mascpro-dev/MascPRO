import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminContext } from "@/lib/adminServer";
import {
  assertEmbaixadoraCrmAccess,
  podeAcessarLeadEmbaixadora,
} from "@/lib/crmEmbaixadoraServer";
import { applyOrderCatalogStock } from "@/lib/applyOrderCatalogStock";
import { applyOrderRewards } from "@/lib/applyOrderRewards";

export const dynamic = "force-dynamic";

const STATUS_PAGO = new Set(["paid", "separacao", "despachado", "entregue"]);

type ItemBody = {
  product_id: string;
  quantidade: number;
  preco_unitario: number;
};

function montarEnderecoCompleto(body: Record<string, unknown>): string {
  const partes = [
    body.logradouro,
    body.numero ? `nº ${body.numero}` : null,
    body.complemento,
    body.bairro,
    body.municipio && body.uf ? `${body.municipio}/${body.uf}` : body.municipio || body.uf,
  ]
    .map((p) => (p ? String(p).trim() : ""))
    .filter(Boolean);
  return partes.join(", ");
}

async function resolverProfileId(
  supabase: SupabaseClient,
  lead: { profile_id: string | null; email: string | null },
  bodyProfileId: string | null
): Promise<string | null> {
  if (bodyProfileId) return bodyProfileId;
  if (lead.profile_id) return lead.profile_id;
  if (lead.email) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", lead.email.trim())
      .maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

async function salvarEnderecoProfile(
  supabase: SupabaseClient,
  profileId: string,
  body: Record<string, unknown>
) {
  const update: Record<string, string | null> = {};
  const map: Record<string, string> = {
    cep: "cep",
    logradouro: "logradouro",
    numero: "numero",
    complemento: "complemento",
    bairro: "bairro",
    municipio: "municipio",
    uf: "uf",
  };
  for (const [k, col] of Object.entries(map)) {
    if (body[k] !== undefined && body[k] !== null && String(body[k]).trim() !== "") {
      update[col] = String(body[k]).trim();
    }
  }
  if (Object.keys(update).length === 0) return;
  await supabase.from("profiles").update(update).eq("id", profileId);
}

/** Pedido da rede embaixadora — sempre gerido pela MascPRO (empresa). */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertEmbaixadoraCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLeadEmbaixadora(supabase, params.id, userId);
  if (!permitido) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.items?.length) {
    return NextResponse.json(
      { ok: false, error: "Adicione pelo menos um produto." },
      { status: 400 }
    );
  }

  const { data: lead, error: errLead } = await supabase
    .from("crm_leads")
    .select("id, nome, email, status, profile_id, order_id")
    .eq("id", params.id)
    .maybeSingle();

  if (errLead || !lead) {
    return NextResponse.json(
      { ok: false, error: errLead?.message || "Lead não encontrado." },
      { status: 404 }
    );
  }

  const pedidoAnteriorId = lead.order_id || null;
  const itensLimpos: ItemBody[] = body.items
    .map((i: ItemBody) => ({
      product_id: String(i.product_id),
      quantidade: Math.max(1, Math.floor(Number(i.quantidade) || 1)),
      preco_unitario: Math.max(0, Number(i.preco_unitario) || 0),
    }))
    .filter((i: ItemBody) => i.product_id);

  const profileId = await resolverProfileId(
    supabase,
    lead,
    body.profile_id ? String(body.profile_id) : null
  );

  if (!profileId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Vincule ou crie o cadastro da pessoa antes de registrar o pedido.",
      },
      { status: 400 }
    );
  }

  await salvarEnderecoProfile(supabase, profileId, body);

  const subtotal = itensLimpos.reduce(
    (acc, i) => acc + i.quantidade * i.preco_unitario,
    0
  );
  const frete = Math.max(0, Number(body.shipping_cost) || 0);
  const total = Number((subtotal + frete).toFixed(2));
  const confirmarPagamento = Boolean(body.confirmar_pagamento);
  const statusInicial = confirmarPagamento ? "paid" : "pending";

  const orderInsert: Record<string, unknown> = {
    profile_id: profileId,
    total,
    payment_method: body.payment_method || "rede_embaixadora",
    status: statusInicial,
    shipping_cost: Number(frete.toFixed(2)),
    shipping_cep: body.cep ? String(body.cep).trim() : null,
    shipping_address: montarEnderecoCompleto(body) || body.shipping_address || null,
    gestor_tipo: "empresa",
    distribuidor_gestor_id: null,
    crm_lead_id: lead.id,
  };

  const { data: order, error: errOrder } = await supabase
    .from("orders")
    .insert(orderInsert)
    .select("id, status")
    .single();

  if (errOrder || !order) {
    return NextResponse.json(
      { ok: false, error: errOrder?.message || "Falha ao registrar pedido." },
      { status: 500 }
    );
  }

  const { error: errItems } = await supabase.from("order_items").insert(
    itensLimpos.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      quantidade: i.quantidade,
      preco_unitario: Number(i.preco_unitario.toFixed(2)),
    }))
  );

  if (errItems) {
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ ok: false, error: errItems.message }, { status: 500 });
  }

  const leadUpdate: Record<string, unknown> = {
    status: "fechado",
    order_id: order.id,
    profile_id: profileId,
    convertido_em: new Date().toISOString(),
  };

  await supabase.from("crm_leads").update(leadUpdate).eq("id", lead.id);

  const msg = pedidoAnteriorId
    ? `Novo pedido da rede #${String(order.id).slice(0, 8)} (anterior #${String(pedidoAnteriorId).slice(0, 8)}). Total R$ ${total.toFixed(2)}. Envio pela MascPRO.`
    : `Pedido da rede #${String(order.id).slice(0, 8)} registrado. Total R$ ${total.toFixed(2)}. A MascPRO fará separação e envio.`;

  await supabase.from("crm_atividades").insert({
    lead_id: lead.id,
    autor_id: userId,
    tipo: "nota",
    conteudo: msg,
  });

  let recompensas = null;
  if (STATUS_PAGO.has(statusInicial)) {
    recompensas = await applyOrderRewards(supabase, order.id);
    await applyOrderCatalogStock(supabase, order.id);
  }

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    total,
    status: statusInicial,
    gestor_tipo: "empresa",
    recompensas,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertEmbaixadoraCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLeadEmbaixadora(supabase, params.id, userId);
  if (!permitido) {
    return NextResponse.json({ ok: false, error: "Sem acesso." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (String(body?.acao) !== "confirmar_pagamento") {
    return NextResponse.json(
      {
        ok: false,
        error: "Separação e envio são feitos pela equipe MascPRO após o pagamento.",
      },
      { status: 403 }
    );
  }

  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, order_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!lead?.order_id) {
    return NextResponse.json({ ok: false, error: "Sem pedido vinculado." }, { status: 404 });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", lead.order_id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
  }

  if (STATUS_PAGO.has(String(order.status).toLowerCase())) {
    return NextResponse.json({ ok: true, order_id: order.id, status: order.status });
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("id", order.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const recompensas = await applyOrderRewards(supabase, order.id);
  await applyOrderCatalogStock(supabase, order.id);

  await supabase.from("crm_atividades").insert({
    lead_id: lead.id,
    autor_id: userId,
    tipo: "nota",
    conteudo: "Pagamento confirmado. A MascPRO seguirá com separação e envio.",
  });

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    status: "paid",
    recompensas,
  });
}
