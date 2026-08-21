import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  assertDistribuidorEquipeAccess,
  getVendedoresDoDistribuidor,
} from "@/lib/crmVendedorServer";

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

  const mes = req.nextUrl.searchParams.get("periodo") || new Date().toISOString().slice(0, 7);
  const ini = `${mes}-01`;
  const fimDate = new Date(
    new Date(`${mes}-01`).getFullYear(),
    new Date(`${mes}-01`).getMonth() + 1,
    0
  );
  const fim = `${fimDate.toISOString().slice(0, 10)}T23:59:59`;

  const vendedores = await getVendedoresDoDistribuidor(supabase, distId);
  const vendedorIds = vendedores.map((v) => v.id);

  let query = supabase
    .from("crm_visitas")
    .select("*")
    .eq("distribuidor_id", distId)
    .gte("data_visita", ini)
    .lte("data_visita", fim)
    .order("data_visita", { ascending: false })
    .limit(200);

  const vendedorFiltro = req.nextUrl.searchParams.get("vendedor_id");
  if (vendedorFiltro) query = query.eq("vendedor_id", vendedorFiltro);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message.includes("crm_visitas") ? "Rode supabase/crm_vendedor_visitas_metas.sql" : error.message },
      { status: 500 }
    );
  }

  const vendedorMap = new Map(vendedores.map((v) => [v.id, v.full_name]));
  const visitas = (data || []).map((v) => ({
    ...v,
    vendedor_nome: vendedorMap.get(v.vendedor_id) || "—",
  }));

  const resumo = {
    total: visitas.length,
    demo: visitas.filter((v) => v.tipo === "demo").length,
    amostra: visitas.filter((v) => v.tipo === "amostra").length,
    visita: visitas.filter((v) => v.tipo === "visita").length,
    followup: visitas.filter((v) => v.tipo === "followup").length,
    vendedores_ativos: new Set(visitas.map((v) => v.vendedor_id)).size,
  };

  return NextResponse.json({
    ok: true,
    visitas,
    resumo,
    vendedores,
    vendedor_ids: vendedorIds,
  });
}
