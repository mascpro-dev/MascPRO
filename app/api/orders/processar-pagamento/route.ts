import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyOrderCatalogStock } from "@/lib/applyOrderCatalogStock";
import { applyOrderRewards } from "@/lib/applyOrderRewards";

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

// Chamado pelo admin ao marcar pedido como "paid" manualmente.
// Garante comissão em R$ e incrementa total_compras_rede (PRO) do indicador.
export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ ok: false, error: "orderId obrigatório" }, { status: 400 });

    const supabase = getSupabase();

    const rewards = await applyOrderRewards(supabase, orderId);
    if (!rewards.ok) {
      return NextResponse.json({ ok: false, error: rewards.error }, { status: 500 });
    }

    const baixa = await applyOrderCatalogStock(supabase, orderId);
    if (!baixa.ok) {
      return NextResponse.json({
        ok: true,
        valorComissao: rewards.valorComissao,
        proBonus: rewards.proPropria,
        proRede: rewards.proRede,
        estoqueCatalogoErro: baixa.error,
      });
    }

    return NextResponse.json({
      ok: true,
      valorComissao: rewards.valorComissao,
      proBonus: rewards.proPropria,
      proRede: rewards.proRede,
      estoqueCatalogo: baixa,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
