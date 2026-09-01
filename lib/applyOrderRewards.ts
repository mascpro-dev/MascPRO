import type { SupabaseClient } from "@supabase/supabase-js";
import { percentualComissaoDoIndicador, calcularValorComissao } from "@/lib/comissaoIndicacao";

type OrderRewardsRow = {
  id: string;
  profile_id: string | null;
  total: number | null;
  comissao_aplicada: boolean | null;
  pro_aplicado: boolean | null;
  pro_rede_aplicado?: boolean | null;
  excluir_comissao: boolean | null;
};

/**
 * Aplica comissão em R$ + bônus PRO (próprio e da rede) para um pedido.
 * Idempotente: orders.pro_aplicado, orders.pro_rede_aplicado, orders.comissao_aplicada.
 *
 * Use sempre que o pedido entrar em status pago (manual, MP webhook, admin).
 */
export async function applyOrderRewards(
  supabase: SupabaseClient,
  orderId: string
): Promise<
  | {
      ok: true;
      valorComissao: number;
      proPropria: number;
      proRede: number;
      skipped?: string;
    }
  | { ok: false; error: string }
> {
  const { data: orderRaw, error: eOrder } = await supabase
    .from("orders")
    .select(
      "id, profile_id, total, comissao_aplicada, pro_aplicado, pro_rede_aplicado, excluir_comissao"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (eOrder) {
    // Compat: ambiente sem coluna pro_rede_aplicado ainda
    if (eOrder.message?.includes("pro_rede_aplicado")) {
      const { data: orderFallback, error: eFallback } = await supabase
        .from("orders")
        .select("id, profile_id, total, comissao_aplicada, pro_aplicado, excluir_comissao")
        .eq("id", orderId)
        .maybeSingle();
      if (eFallback) return { ok: false, error: eFallback.message };
      if (!orderFallback) return { ok: false, error: "Pedido não encontrado." };
      return applyOrderRewardsInner(supabase, orderId, {
        ...orderFallback,
        pro_rede_aplicado: orderFallback.comissao_aplicada,
      });
    }
    return { ok: false, error: eOrder.message };
  }

  if (!orderRaw) return { ok: false, error: "Pedido não encontrado." };
  return applyOrderRewardsInner(supabase, orderId, orderRaw as OrderRewardsRow);
}

async function applyOrderRewardsInner(
  supabase: SupabaseClient,
  orderId: string,
  order: OrderRewardsRow
): Promise<
  | {
      ok: true;
      valorComissao: number;
      proPropria: number;
      proRede: number;
      skipped?: string;
    }
  | { ok: false; error: string }
> {
  if (order.excluir_comissao) {
    return { ok: true, valorComissao: 0, proPropria: 0, proRede: 0, skipped: "excluir_comissao" };
  }
  if (!order.profile_id) {
    return { ok: false, error: "Pedido sem comprador (profile_id)." };
  }

  const valorPedido = Number(order.total || 0);
  const proBonus = Math.max(0, Math.round(valorPedido));
  let valorComissao = 0;
  let proPropriaAplicado = 0;
  let proRedeAplicado = 0;

  // 1) PRO do comprador (compras próprias)
  if (!order.pro_aplicado && proBonus > 0) {
    const { data: comp, error: eComp } = await supabase
      .from("profiles")
      .select("total_compras_proprias")
      .eq("id", order.profile_id)
      .single();
    if (eComp) return { ok: false, error: eComp.message };

    const { error: eUpPro } = await supabase
      .from("profiles")
      .update({
        total_compras_proprias: Number(comp?.total_compras_proprias || 0) + proBonus,
      })
      .eq("id", order.profile_id);
    if (eUpPro) return { ok: false, error: eUpPro.message };

    const { error: eFlagPro } = await supabase
      .from("orders")
      .update({ pro_aplicado: true })
      .eq("id", orderId);
    if (eFlagPro) return { ok: false, error: eFlagPro.message };

    proPropriaAplicado = proBonus;
  }

  // 2) PRO da rede (compras dos indicados) — independente da comissão em R$
  if (!order.pro_rede_aplicado && proBonus > 0) {
    const { data: comprador, error: eComprador } = await supabase
      .from("profiles")
      .select("id, indicado_por")
      .eq("id", order.profile_id)
      .single();
    if (eComprador) return { ok: false, error: eComprador.message };

    if (comprador?.indicado_por) {
      const { data: emb, error: eEmb } = await supabase
        .from("profiles")
        .select("total_compras_rede")
        .eq("id", comprador.indicado_por)
        .single();
      if (eEmb) return { ok: false, error: eEmb.message };

      const { error: eUpRede } = await supabase
        .from("profiles")
        .update({
          total_compras_rede: Number(emb?.total_compras_rede || 0) + proBonus,
        })
        .eq("id", comprador.indicado_por);
      if (eUpRede) return { ok: false, error: eUpRede.message };

      const { error: eFlagRede } = await supabase
        .from("orders")
        .update({ pro_rede_aplicado: true })
        .eq("id", orderId);
      if (eFlagRede && !eFlagRede.message?.includes("pro_rede_aplicado")) {
        return { ok: false, error: eFlagRede.message };
      }

      proRedeAplicado = proBonus;
    } else {
      // Sem indicador: marca como processado para não reprocessar
      await supabase.from("orders").update({ pro_rede_aplicado: true }).eq("id", orderId);
    }
  }

  // 3) Comissão em R$ para o indicador
  if (!order.comissao_aplicada) {
    const { data: existente } = await supabase
      .from("commissions")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (!existente) {
      const { data: comprador, error: eComprador } = await supabase
        .from("profiles")
        .select("id, indicado_por")
        .eq("id", order.profile_id)
        .single();
      if (eComprador) return { ok: false, error: eComprador.message };

      if (comprador?.indicado_por) {
        const { data: indicador, error: eInd } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", comprador.indicado_por)
          .maybeSingle();
        if (eInd) return { ok: false, error: eInd.message };

        const percentual = await percentualComissaoDoIndicador(
          String(indicador?.role || "")
        );
        if (percentual != null) {
          valorComissao = calcularValorComissao(valorPedido, percentual);
          if (valorComissao > 0) {
            const { error: eIns } = await supabase.from("commissions").insert({
              embaixador_id: comprador.indicado_por,
              cabeleireiro_id: comprador.id,
              order_id: order.id,
              valor_pedido: valorPedido,
              percentual,
              valor_comissao: valorComissao,
              status: "disponivel",
            });
            if (eIns) return { ok: false, error: eIns.message };
          }
        }
      }
    }

    const { error: eFlagCom } = await supabase
      .from("orders")
      .update({ comissao_aplicada: true })
      .eq("id", orderId);
    if (eFlagCom) return { ok: false, error: eFlagCom.message };
  }

  return {
    ok: true,
    valorComissao,
    proPropria: proPropriaAplicado,
    proRede: proRedeAplicado,
  };
}
