import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  assertDistribuidorEquipeAccess,
  getVendedoresDoDistribuidor,
} from "@/lib/crmVendedorServer";
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

  const access = await assertDistribuidorEquipeAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const distId =
    access.role === "ADMIN"
      ? req.nextUrl.searchParams.get("distribuidor_id") || userId
      : userId;

  const periodo = req.nextUrl.searchParams.get("periodo") || new Date().toISOString().slice(0, 7);
  const vendedores = await getVendedoresDoDistribuidor(supabase, distId);

  const { data: metasRows } = await supabase
    .from("vendedor_metas")
    .select("*")
    .eq("distribuidor_id", distId)
    .eq("periodo", periodo);

  const metaMap = new Map((metasRows || []).map((m) => [m.vendedor_id, m]));

  const equipe = await Promise.all(
    vendedores.map(async (v) => {
      const metaRow = metaMap.get(v.id);
      const meta = {
        meta_leads: Number(metaRow?.meta_leads || 0),
        meta_visitas: Number(metaRow?.meta_visitas || 0),
        meta_conversoes: Number(metaRow?.meta_conversoes || 0),
        meta_receita: Number(metaRow?.meta_receita || 0),
      };
      let realizado = { leads: 0, visitas: 0, conversoes: 0, receita: 0 };
      try {
        realizado = await calcularRealizadoVendedor(supabase, v.id, periodo);
      } catch {
        /* tabela ainda não criada */
      }
      return {
        vendedor_id: v.id,
        full_name: v.full_name,
        email: v.email,
        meta,
        realizado,
        progresso: calcularProgresso(meta, realizado),
      };
    })
  );

  return NextResponse.json({ ok: true, periodo, equipe, vendedores });
}

export async function POST(req: NextRequest) {
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
  const vendedorId = body?.vendedor_id;
  const periodo = body?.periodo || new Date().toISOString().slice(0, 7);

  if (!vendedorId) {
    return NextResponse.json({ ok: false, error: "vendedor_id obrigatório." }, { status: 400 });
  }

  const vendedores = await getVendedoresDoDistribuidor(supabase, distId);
  if (!vendedores.some((v) => v.id === vendedorId)) {
    return NextResponse.json({ ok: false, error: "Vendedor não pertence à equipe." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("vendedor_metas")
    .upsert(
      {
        vendedor_id: vendedorId,
        distribuidor_id: distId,
        periodo,
        meta_leads: Number(body.meta_leads || 0),
        meta_visitas: Number(body.meta_visitas || 0),
        meta_conversoes: Number(body.meta_conversoes || 0),
        meta_receita: Number(body.meta_receita || 0),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "vendedor_id,periodo" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message.includes("vendedor_metas") ? "Rode supabase/crm_vendedor_visitas_metas.sql" : error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, meta: data });
}
