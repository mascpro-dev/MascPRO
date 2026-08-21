import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertDistribuidorEquipeAccess } from "@/lib/crmVendedorServer";

export const dynamic = "force-dynamic";

const FAIXAS_PADRAO = [
  { ordem: 0, venda_de: 0, venda_ate: 5000, percentual: 15 },
  { ordem: 1, venda_de: 5500, venda_ate: 15000, percentual: 20 },
  { ordem: 2, venda_de: 15500, venda_ate: 35000, percentual: 25 },
  { ordem: 3, venda_de: 35500, venda_ate: null, percentual: 30 },
];

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

  const { data } = await supabase
    .from("distribuidor_comissao_faixas")
    .select("ordem, venda_de, venda_ate, percentual")
    .eq("distribuidor_id", distId)
    .order("ordem");

  return NextResponse.json({
    ok: true,
    faixas: data?.length ? data : FAIXAS_PADRAO,
    distribuidor_id: distId,
  });
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

  const faixas: { ordem: number; venda_de: number; venda_ate: number | null; percentual: number }[] =
    body?.faixas || [];

  await supabase.from("distribuidor_comissao_faixas").delete().eq("distribuidor_id", distId);

  for (const f of faixas) {
    await supabase.from("distribuidor_comissao_faixas").insert({
      distribuidor_id: distId,
      ordem: f.ordem,
      venda_de: f.venda_de,
      venda_ate: f.venda_ate,
      percentual: f.percentual,
    });
  }

  return NextResponse.json({ ok: true, faixas: faixas.length });
}
