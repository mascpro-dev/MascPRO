import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminContext } from "@/lib/adminServer";
import {
  assertVendedorCrmAccess,
  podeAcessarLeadVendedor,
} from "@/lib/crmVendedorServer";
import { resolveOrderGestor, fetchIndicadorRole } from "@/lib/orderGestor";
import {
  avaliarPedidoVendedor,
  carregarTabelaPrecosDistribuidor,
} from "@/lib/vendedorPrecos";
import { applyOrderCatalogStock } from "@/lib/applyOrderCatalogStock";
import { applyOrderRewards } from "@/lib/applyOrderRewards";
import { calcularPercentualComissaoVendedor } from "@/lib/vendedorPrecos";
import { notificarPedidoAguardandoAprovacao } from "@/lib/notificarCrm";

export const dynamic = "force-dynamic";

const STATUS_PAGO = new Set(["paid", "separacao", "despachado", "entregue"]);

type ItemBody = {
  product_id: string;
  quantidade: number;
  preco_unitario: number;
  bonificado?: boolean;
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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLeadVendedor(supabase, params.id, userId);
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

  const itensLimpos: ItemBody[] = body.items
    .map((i: ItemBody) => ({
      product_id: String(i.product_id),
      quantidade: Math.max(1, Math.floor(Number(i.quantidade) || 1)),
      preco_unitario: Math.max(0, Number(i.preco_unitario) || 0),
      bonificado: Boolean(i.bonificado),
    }))
    .filter((i: ItemBody) => i.product_id);

  const tabela = await carregarTabelaPrecosDistribuidor(supabase, access.distribuidor_id);
  const paymentMethod = String(body.payment_method || "manual").toLowerCase();
  const avaliacao = avaliarPedidoVendedor(itensLimpos, tabela, paymentMethod);

  const subtotal = itensLimpos.reduce(
    (acc, i) => acc + i.quantidade * (i.bonificado ? 0 : i.preco_unitario),
    0
  );
  const frete = Math.max(0, Number(body.shipping_cost) || 0);
  const total = Number((subtotal + frete).toFixed(2));

  const descontoTabela = avaliacao.itens.reduce((acc, item, idx) => {
    const qtd = itensLimpos[idx]?.quantidade || 1;
    if (item.bonificado) return acc + item.preco_tabela * qtd;
    return acc + Math.max(0, (item.preco_tabela - item.preco_praticado) * qtd);
  }, 0);

  let buyer: { id: string; role: string | null; indicado_por: string | null } | null = null;
  const profileId = await resolverProfileId(
    supabase,
    lead,
    body.profile_id ? String(body.profile_id) : null
  );
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
    closingUserRole: "VENDEDOR",
    leadResponsavelId: access.distribuidor_id,
  });

  const confirmarPagamento = Boolean(body.confirmar_pagamento) && !avaliacao.precisa_aprovacao;
  let statusInicial = confirmarPagamento ? "paid" : "pending";
  let aprovacaoStatus: string | null = null;

  if (avaliacao.precisa_aprovacao) {
    statusInicial = "pending";
    aprovacaoStatus = "pendente";
  }

  const orderInsert: Record<string, unknown> = {
    profile_id: profileId,
    total,
    payment_method: paymentMethod,
    status: statusInicial,
    shipping_cost: Number(frete.toFixed(2)),
    shipping_cep: body.cep ? String(body.cep).trim() : null,
    shipping_address: montarEnderecoCompleto(body) || body.shipping_address || null,
    gestor_tipo: gestor.gestor_tipo,
    distribuidor_gestor_id: access.distribuidor_id,
    crm_lead_id: lead.id,
    vendedor_id: userId,
    aprovacao_status: aprovacaoStatus,
    aprovacao_motivo: avaliacao.precisa_aprovacao ? avaliacao.motivos.join(", ") : null,
    excluir_meta: avaliacao.excluir_meta,
    excluir_comissao: avaliacao.excluir_comissao,
    desconto_total: Number(descontoTabela.toFixed(2)),
  };

  const { data: order, error: errOrder } = await supabase
    .from("orders")
    .insert(orderInsert)
    .select("id, status, aprovacao_status")
    .single();

  if (errOrder || !order) {
    return NextResponse.json(
      {
        ok: false,
        error:
          errOrder?.message ||
          "Falha ao criar pedido. Rode supabase/crm_vendedor_equipe.sql no Supabase.",
      },
      { status: 500 }
    );
  }

  const { error: errItems } = await supabase.from("order_items").insert(
    itensLimpos.map((i, idx) => ({
      order_id: order.id,
      product_id: i.product_id,
      quantidade: i.quantidade,
      preco_unitario: i.bonificado ? 0 : Number(i.preco_unitario.toFixed(2)),
      preco_tabela: avaliacao.itens[idx]?.preco_tabela ?? i.preco_unitario,
      bonificado: Boolean(i.bonificado),
    }))
  );

  if (errItems) {
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ ok: false, error: errItems.message }, { status: 500 });
  }

  await supabase
    .from("crm_leads")
    .update({
      status: "fechado",
      order_id: order.id,
      ...(profileId ? { profile_id: profileId, convertido_em: new Date().toISOString() } : {}),
    })
    .eq("id", lead.id);

  const msgAprov =
    avaliacao.precisa_aprovacao
      ? ` Aguardando aprovação do distribuidor (${avaliacao.motivos.join(", ")}).`
      : "";
  const msgConsignado = avaliacao.excluir_meta ? " Pagamento consignado — não entra em meta/comissão." : "";

  await supabase.from("crm_atividades").insert({
    lead_id: lead.id,
    autor_id: userId,
    tipo: "status_change",
    conteudo: `Pedido #${String(order.id).slice(0, 8)} — R$ ${total.toFixed(2)}.${msgAprov}${msgConsignado}`,
    status_novo: "fechado",
  });

  if (avaliacao.precisa_aprovacao) {
    await notificarPedidoAguardandoAprovacao(supabase, {
      distribuidor_id: access.distribuidor_id,
      vendedor_id: userId,
      vendedor_nome: access.full_name,
      order_id: order.id,
      total,
      motivo: avaliacao.motivos.join(", ") || "desconto/bonificação",
    });
  }

  if (STATUS_PAGO.has(statusInicial) && !avaliacao.excluir_comissao) {
    const periodo = new Date().toISOString().slice(0, 7);
    const pct = await calcularPercentualComissaoVendedor(
      supabase,
      access.distribuidor_id,
      userId,
      periodo
    );
    const valorComissao = Number(((total * pct) / 100).toFixed(2));
    if (valorComissao > 0) {
      await supabase.from("vendedor_comissoes").insert({
        vendedor_id: userId,
        distribuidor_id: access.distribuidor_id,
        order_id: order.id,
        valor_pedido: total,
        percentual: pct,
        valor_comissao: valorComissao,
        status: "disponivel",
      });
    }
  }

  let recompensas = null;
  let estoque = null;
  if (STATUS_PAGO.has(statusInicial)) {
    if (!avaliacao.excluir_comissao) {
      recompensas = await applyOrderRewards(supabase, order.id);
    }
    estoque = await applyOrderCatalogStock(supabase, order.id);
  }

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    total,
    status: statusInicial,
    aprovacao_status: order.aprovacao_status,
    precisa_aprovacao: avaliacao.precisa_aprovacao,
    excluir_meta: avaliacao.excluir_meta,
    recompensas,
    estoque,
  });
}
