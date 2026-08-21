import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  assertDistribuidorEquipeAccess,
  getVendedoresDoDistribuidor,
} from "@/lib/crmVendedorServer";
import { applyOrderCatalogStock } from "@/lib/applyOrderCatalogStock";
import { calcularPercentualComissaoVendedor } from "@/lib/vendedorPrecos";
import {
  notificarPedidoAprovado,
  notificarPedidoRejeitado,
} from "@/lib/notificarCrm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertDistribuidorEquipeAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const distId =
    access.role === "ADMIN"
      ? req.nextUrl.searchParams.get("distribuidor_id") || userId
      : userId;

  const vendedores = await getVendedoresDoDistribuidor(supabase, distId);
  const vendedorIds = vendedores.map((v) => v.id);

  const { data: pendentes } = await supabase
    .from("orders")
    .select("id, total, status, payment_method, created_at, aprovacao_motivo, vendedor_id, crm_lead_id")
    .eq("distribuidor_gestor_id", distId)
    .eq("aprovacao_status", "pendente")
    .order("created_at", { ascending: false });

  const vendedorMap = new Map(vendedores.map((v) => [v.id, v.full_name]));
  const pendentesComNome = (pendentes || []).map((p) => ({
    ...p,
    vendedor_nome: p.vendedor_id ? vendedorMap.get(p.vendedor_id) || "—" : "—",
  }));

  const { data: recentes } = await supabase
    .from("orders")
    .select("id, total, status, vendedor_id, payment_method, created_at, excluir_meta")
    .eq("distribuidor_gestor_id", distId)
    .not("vendedor_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    ok: true,
    pendentes: pendentesComNome,
    recentes: recentes || [],
    vendedores,
  });
}

export async function PATCH(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertDistribuidorEquipeAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const orderId = body?.order_id;
  const acao = String(body?.acao || "");

  if (!orderId || !["aprovar", "rejeitar"].includes(acao)) {
    return NextResponse.json({ ok: false, error: "Ação inválida." }, { status: 400 });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, distribuidor_gestor_id, vendedor_id, total, excluir_comissao, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
  }

  const distId = access.role === "DISTRIBUIDOR" ? userId : order.distribuidor_gestor_id;
  if (access.role === "DISTRIBUIDOR" && order.distribuidor_gestor_id !== userId) {
    return NextResponse.json({ ok: false, error: "Sem acesso." }, { status: 403 });
  }

  if (acao === "rejeitar") {
    await supabase
      .from("orders")
      .update({
        aprovacao_status: "rejeitado",
        status: "cancelled",
        aprovado_por: userId,
        aprovado_em: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (order.vendedor_id) {
      await notificarPedidoRejeitado(supabase, {
        vendedor_id: order.vendedor_id,
        distribuidor_id: String(distId),
        order_id: orderId,
        total: Number(order.total || 0),
      });
    }

    return NextResponse.json({ ok: true, status: "rejeitado" });
  }

  const novoStatus = body?.confirmar_pagamento ? "paid" : "pending";

  await supabase
    .from("orders")
    .update({
      aprovacao_status: "aprovado",
      aprovado_por: userId,
      aprovado_em: new Date().toISOString(),
      status: novoStatus,
    })
    .eq("id", orderId);

  if (novoStatus === "paid" && !order.excluir_comissao && order.vendedor_id) {
    const periodo = new Date().toISOString().slice(0, 7);
    const pct = await calcularPercentualComissaoVendedor(
      supabase,
      String(distId),
      order.vendedor_id,
      periodo
    );
    const valorComissao = Number(((Number(order.total) * pct) / 100).toFixed(2));
    if (valorComissao > 0) {
      await supabase.from("vendedor_comissoes").upsert(
        {
          vendedor_id: order.vendedor_id,
          distribuidor_id: distId,
          order_id: orderId,
          valor_pedido: order.total,
          percentual: pct,
          valor_comissao: valorComissao,
          status: "disponivel",
        },
        { onConflict: "order_id" }
      );
    }
    await applyOrderCatalogStock(supabase, orderId);
  }

  if (order.vendedor_id) {
    await notificarPedidoAprovado(supabase, {
      vendedor_id: order.vendedor_id,
      distribuidor_id: String(distId),
      order_id: orderId,
      total: Number(order.total || 0),
    });
  }

  return NextResponse.json({ ok: true, status: novoStatus, aprovacao_status: "aprovado" });
}
