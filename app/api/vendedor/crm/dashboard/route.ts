import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertVendedorCrmAccess } from "@/lib/crmVendedorServer";
import { calcularPercentualComissaoVendedor } from "@/lib/vendedorPrecos";
import { calcularProgresso, calcularRealizadoVendedor } from "@/lib/vendedorMetas";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const periodo = new Date().toISOString().slice(0, 7);
  const iniMes = `${periodo}-01`;

  const { data: leads } = await supabase
    .from("crm_leads")
    .select("status, valor_estimado")
    .or(`created_by.eq.${userId},responsavel_id.eq.${userId}`);

  const lista = leads || [];
  const pipeline = {
    total: lista.length,
    fechado: lista.filter((l) => l.status === "fechado").length,
    em_aberto: lista.filter((l) => !["fechado", "perdido"].includes(l.status)).length,
  };

  const { data: pedidos } = await supabase
    .from("orders")
    .select("id, total, status, payment_method, aprovacao_status, excluir_meta, created_at")
    .eq("vendedor_id", userId)
    .gte("created_at", iniMes)
    .order("created_at", { ascending: false });

  const pedidosLista = pedidos || [];
  const vendasMes = pedidosLista
    .filter(
      (p) =>
        !p.excluir_meta &&
        ["paid", "separacao", "despachado", "entregue"].includes(String(p.status)) &&
        p.aprovacao_status !== "pendente" &&
        p.aprovacao_status !== "rejeitado"
    )
    .reduce((s, p) => s + Number(p.total || 0), 0);

  const pct = await calcularPercentualComissaoVendedor(
    supabase,
    access.distribuidor_id,
    userId,
    periodo
  );

  const pendentes = pedidosLista.filter((p) => p.aprovacao_status === "pendente").length;

  const { data: metaRow } = await supabase
    .from("vendedor_metas")
    .select("*")
    .eq("vendedor_id", userId)
    .eq("periodo", periodo)
    .maybeSingle();

  const meta = {
    meta_leads: Number(metaRow?.meta_leads || 0),
    meta_visitas: Number(metaRow?.meta_visitas || 0),
    meta_conversoes: Number(metaRow?.meta_conversoes || 0),
    meta_receita: Number(metaRow?.meta_receita || 0),
  };

  let realizado = { leads: pipeline.total, visitas: 0, conversoes: pipeline.fechado, receita: vendasMes };
  try {
    realizado = await calcularRealizadoVendedor(supabase, userId, periodo);
  } catch {
    /* tabela visitas ainda não criada */
  }

  const progresso = calcularProgresso(meta, realizado);

  return NextResponse.json({
    ok: true,
    usuario: { full_name: access.full_name },
    pipeline,
    vendas_mes: vendasMes,
    visitas_mes: realizado.visitas,
    comissao_percentual_atual: pct,
    pedidos_pendentes_aprovacao: pendentes,
    ultimos_pedidos: pedidosLista.slice(0, 8),
    meta,
    realizado,
    progresso,
  });
}
