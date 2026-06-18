import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminContext } from "@/lib/adminServer";
import { assertCrmAccess, podeAcessarLead } from "@/lib/crmServer";
import {
  fetchIndicadorRole,
  resolveOrderGestor,
} from "@/lib/orderGestor";
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
  lead: { profile_id: string | null; email: string | null; telefone: string | null },
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

// POST — cria pedido ao fechar lead no pipeline
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLead(supabase, params.id, userId, access.role);
  if (!permitido) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Adicione pelo menos um produto." },
      { status: 400 }
    );
  }

  const { data: lead, error: errLead } = await supabase
    .from("crm_leads")
    .select("id, nome, email, telefone, status, profile_id, order_id, responsavel_id")
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

  if (itensLimpos.length === 0) {
    return NextResponse.json({ ok: false, error: "Itens inválidos." }, { status: 400 });
  }

  const profileId = await resolverProfileId(
    supabase,
    lead,
    body.profile_id ? String(body.profile_id) : null
  );

  if (profileId) {
    await salvarEnderecoProfile(supabase, profileId, body);
  }

  let buyer: { id: string; role: string | null; indicado_por: string | null } | null = null;
  if (profileId) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("id, role, indicado_por")
      .eq("id", profileId)
      .maybeSingle();
    if (perfil) buyer = perfil;
  }

  const indicadorRole = buyer?.indicado_por
    ? await fetchIndicadorRole(supabase, buyer.indicado_por)
    : null;

  const gestor = resolveOrderGestor({
    buyer,
    indicadorRole,
    closingUserId: userId,
    closingUserRole: access.role,
    leadResponsavelId: lead.responsavel_id,
  });

  const subtotal = itensLimpos.reduce(
    (acc, i) => acc + i.quantidade * i.preco_unitario,
    0
  );
  const frete = Math.max(0, Number(body.shipping_cost) || 0);
  const total = Number((subtotal + frete).toFixed(2));
  const enderecoCompleto = montarEnderecoCompleto(body);
  const confirmarPagamento = Boolean(body.confirmar_pagamento);
  const statusInicial = confirmarPagamento ? "paid" : "pending";

  const orderInsert: Record<string, unknown> = {
    profile_id: profileId,
    total,
    payment_method: body.payment_method || "manual",
    status: statusInicial,
    shipping_cost: Number(frete.toFixed(2)),
    shipping_cep: body.cep ? String(body.cep).trim() : null,
    shipping_address: enderecoCompleto || body.shipping_address || null,
    gestor_tipo: gestor.gestor_tipo,
    distribuidor_gestor_id: gestor.distribuidor_gestor_id,
    crm_lead_id: lead.id,
  };

  const { data: order, error: errOrder } = await supabase
    .from("orders")
    .insert(orderInsert)
    .select("id, status, gestor_tipo, distribuidor_gestor_id")
    .single();

  if (errOrder || !order) {
    return NextResponse.json(
      {
        ok: false,
        error:
          errOrder?.message ||
          "Falha ao criar pedido. Rode supabase/crm_pedido_fechamento.sql no Supabase.",
      },
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
    return NextResponse.json(
      { ok: false, error: `Falha ao salvar itens: ${errItems.message}` },
      { status: 500 }
    );
  }

  const statusAnterior = lead.status;
  const leadUpdate: Record<string, unknown> = {
    status: "fechado",
    order_id: order.id,
  };
  if (profileId) {
    leadUpdate.profile_id = profileId;
    leadUpdate.convertido_em = new Date().toISOString();
  }

  const { error: errUpLead } = await supabase
    .from("crm_leads")
    .update(leadUpdate)
    .eq("id", lead.id);

  if (errUpLead) {
    return NextResponse.json({ ok: false, error: errUpLead.message }, { status: 500 });
  }

  const msgPedido = pedidoAnteriorId
    ? `Novo pedido #${String(order.id).slice(0, 8)} criado (pedido anterior: #${String(pedidoAnteriorId).slice(0, 8)}). Total: R$ ${total.toFixed(2)}.`
    : `Pedido #${String(order.id).slice(0, 8)} criado (${gestor.gestor_tipo === "empresa" ? "MascPRO" : "distribuidor"}). Total: R$ ${total.toFixed(2)}.`;

  await supabase.from("crm_atividades").insert({
    lead_id: lead.id,
    autor_id: userId,
    tipo: pedidoAnteriorId ? "nota" : "status_change",
    conteudo: msgPedido,
    status_anterior: pedidoAnteriorId ? undefined : statusAnterior,
    status_novo: pedidoAnteriorId ? undefined : "fechado",
  });

  let recompensas = null;
  let estoque = null;
  if (STATUS_PAGO.has(statusInicial)) {
    recompensas = await applyOrderRewards(supabase, order.id);
    estoque = await applyOrderCatalogStock(supabase, order.id);
  }

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    total,
    status: statusInicial,
    gestor_tipo: order.gestor_tipo,
    distribuidor_gestor_id: order.distribuidor_gestor_id,
    recompensas,
    estoque,
  });
}

// PATCH — confirmar pagamento do pedido do lead
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLead(supabase, params.id, userId, access.role);
  if (!permitido) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const acao = String(body?.acao || "confirmar_pagamento");

  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, order_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!lead?.order_id) {
    return NextResponse.json({ ok: false, error: "Lead sem pedido vinculado." }, { status: 404 });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, gestor_tipo, distribuidor_gestor_id")
    .eq("id", lead.order_id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
  }

  const { assertCanChangeOrderStatus } = await import("@/lib/orderGestor");
  const perm = await assertCanChangeOrderStatus(supabase, userId, order);
  if (!perm.ok) {
    return NextResponse.json({ ok: false, error: perm.error }, { status: 403 });
  }

  if (acao === "confirmar_pagamento") {
    const jaPago = STATUS_PAGO.has(String(order.status).toLowerCase());
    if (jaPago) {
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
    const estoque = await applyOrderCatalogStock(supabase, order.id);

    await supabase.from("crm_atividades").insert({
      lead_id: lead.id,
      autor_id: userId,
      tipo: "nota",
      conteudo: "Pagamento confirmado. Pedido liberado para separação.",
    });

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      status: "paid",
      recompensas,
      estoque,
    });
  }

  const novoStatus = String(body?.novo_status || "").toLowerCase();
  const ALLOWED = new Set([
    "separacao",
    "despachado",
    "entregue",
    "cancelled",
  ]);
  if (!ALLOWED.has(novoStatus)) {
    return NextResponse.json({ ok: false, error: "Status inválido." }, { status: 400 });
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: novoStatus })
    .eq("id", order.id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (novoStatus === "entregue") {
    const { applyOrderToProInventory } = await import("@/lib/applyOrderToProInventory");
    await applyOrderToProInventory(supabase, order.id);
  }

  return NextResponse.json({ ok: true, order_id: order.id, status: novoStatus });
}
