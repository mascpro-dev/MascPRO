import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyOrderCatalogStock } from "@/lib/applyOrderCatalogStock";

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

// Chamado pelo admin ao marcar pedido como "paid" manualmente.
// Garante comissão em R$ e incrementa total_compras_rede (PRO) do embaixador.
export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ ok: false, error: "orderId obrigatório" }, { status: 400 });

    const supabase = getSupabase();

    // Checa se comissão já existe
    const { data: existente } = await supabase
      .from("commissions")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existente) return NextResponse.json({ ok: true, msg: "comissão já existia" });

    // Busca pedido
    const { data: order } = await supabase
      .from("orders")
      .select("id, profile_id, total")
      .eq("id", orderId)
      .single();

    if (!order?.profile_id) return NextResponse.json({ ok: false, error: "pedido não encontrado" }, { status: 404 });

    // Busca comprador e embaixador
    const { data: comprador } = await supabase
      .from("profiles")
      .select("id, indicado_por")
      .eq("id", order.profile_id)
      .single();

    if (!comprador?.indicado_por) return NextResponse.json({ ok: true, msg: "sem embaixador indicador" });

    const valorPedido = Number(order.total || 0);
    const valorComissao = Number((valorPedido * 0.15).toFixed(2));

    // Cria comissão em R$
    if (valorComissao > 0) {
      await supabase.from("commissions").insert({
        embaixador_id: comprador.indicado_por,
        cabeleireiro_id: comprador.id,
        order_id: order.id,
        valor_pedido: valorPedido,
        percentual: 15,
        valor_comissao: valorComissao,
        status: "disponivel",
      });
    }

    // Incrementa total_compras_rede (PRO = valor do pedido)
    const proBonus = Math.round(valorPedido);
    if (proBonus > 0) {
      const { data: embaixador } = await supabase
        .from("profiles")
        .select("total_compras_rede")
        .eq("id", comprador.indicado_por)
        .single();

      await supabase
        .from("profiles")
        .update({ total_compras_rede: (embaixador?.total_compras_rede || 0) + proBonus })
        .eq("id", comprador.indicado_por);
    }

    const baixa = await applyOrderCatalogStock(supabase, orderId);
    if (!baixa.ok) {
      return NextResponse.json({ ok: true, valorComissao, proBonus, estoqueCatalogoErro: baixa.error });
    }

    return NextResponse.json({ ok: true, valorComissao, proBonus, estoqueCatalogo: baixa });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
