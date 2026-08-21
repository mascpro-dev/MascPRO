import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertVendedorCrmAccess } from "@/lib/crmVendedorServer";
import { carregarTabelaPrecosDistribuidor } from "@/lib/vendedorPrecos";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const map = await carregarTabelaPrecosDistribuidor(supabase, access.distribuidor_id);
  let produtos = Array.from(map.values());

  if (q) {
    const lower = q.toLowerCase();
    produtos = produtos.filter((p) => p.title?.toLowerCase().includes(lower));
  }

  return NextResponse.json({
    ok: true,
    produtos: produtos.map((p) => ({
      id: p.product_id,
      title: p.title,
      price: p.preco_cabeleireiro,
      price_hairdresser: p.preco_cabeleireiro,
      preco_final: p.preco_final,
      preco_minimo: p.preco_minimo,
      preco_unitario_padrao: p.preco_final,
    })),
  });
}
