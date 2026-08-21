import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertVendedorCrmAccess } from "@/lib/crmVendedorServer";
import {
  calcularProgresso,
  calcularRealizadoVendedor,
} from "@/lib/vendedorMetas";

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

  const periodo = req.nextUrl.searchParams.get("periodo") || new Date().toISOString().slice(0, 7);

  const { data: metaRow } = await supabase
    .from("vendedor_metas")
    .select("*")
    .eq("vendedor_id", userId)
    .eq("periodo", periodo)
    .maybeSingle();

  const meta = metaRow || {
    meta_leads: 0,
    meta_visitas: 0,
    meta_conversoes: 0,
    meta_receita: 0,
  };

  let realizado;
  try {
    realizado = await calcularRealizadoVendedor(supabase, userId, periodo);
  } catch {
    realizado = { leads: 0, visitas: 0, conversoes: 0, receita: 0 };
  }

  const progresso = calcularProgresso(
    {
      meta_leads: Number(meta.meta_leads || 0),
      meta_visitas: Number(meta.meta_visitas || 0),
      meta_conversoes: Number(meta.meta_conversoes || 0),
      meta_receita: Number(meta.meta_receita || 0),
    },
    realizado
  );

  return NextResponse.json({
    ok: true,
    periodo,
    meta: {
      meta_leads: Number(meta.meta_leads || 0),
      meta_visitas: Number(meta.meta_visitas || 0),
      meta_conversoes: Number(meta.meta_conversoes || 0),
      meta_receita: Number(meta.meta_receita || 0),
    },
    realizado,
    progresso,
  });
}
