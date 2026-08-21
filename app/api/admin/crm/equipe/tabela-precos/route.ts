import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertDistribuidorEquipeAccess } from "@/lib/crmVendedorServer";
import { carregarTabelaPrecosDistribuidor } from "@/lib/vendedorPrecos";

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

  const map = await carregarTabelaPrecosDistribuidor(supabase, distId);
  const produtos = Array.from(map.values()).map((p) => ({
    product_id: p.product_id,
    title: p.title,
    preco_cabeleireiro: p.preco_cabeleireiro,
    preco_final: p.preco_final,
    preco_minimo: p.preco_minimo,
    customizado: p.preco_final !== p.preco_cabeleireiro || p.preco_minimo !== p.preco_cabeleireiro,
  }));

  return NextResponse.json({ ok: true, produtos, distribuidor_id: distId });
}

export async function PUT(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertDistribuidorEquipeAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const distId =
    access.role === "ADMIN" && body?.distribuidor_id ? body.distribuidor_id : userId;

  if (access.role === "DISTRIBUIDOR" && distId !== userId) {
    return NextResponse.json({ ok: false, error: "Sem permissão." }, { status: 403 });
  }

  const itens: { product_id: string; preco_final: number; preco_minimo: number }[] =
    body?.itens || [];

  if (!Array.isArray(itens)) {
    return NextResponse.json({ ok: false, error: "Lista inválida." }, { status: 400 });
  }

  for (const item of itens) {
    const final = Number(item.preco_final);
    const minimo = Number(item.preco_minimo);
    if (minimo > final) {
      return NextResponse.json(
        { ok: false, error: "Preço mínimo não pode ser maior que o preço final." },
        { status: 400 }
      );
    }

    await supabase.from("distribuidor_tabela_precos").upsert(
      {
        distribuidor_id: distId,
        product_id: item.product_id,
        preco_final: final,
        preco_minimo: minimo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "distribuidor_id,product_id" }
    );
  }

  return NextResponse.json({ ok: true, salvos: itens.length });
}
