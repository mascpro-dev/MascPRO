import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";

export const dynamic = "force-dynamic";

async function assertAccess(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = String(data?.role || "").toUpperCase();
  if (!["ADMIN", "DISTRIBUIDOR"].includes(role)) return { ok: false as const, error: "Sem acesso." };
  return { ok: true as const, role };
}

// GET /api/admin/crm/metas?periodo=2026-05&distribuidor_id=xxx
export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const access = await assertAccess(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const periodo = params.get("periodo") || new Date().toISOString().slice(0, 7);
  const distribuidorId = access.role === "ADMIN"
    ? (params.get("distribuidor_id") || userId)
    : userId;

  const { data: meta } = await supabase
    .from("distribuidor_metas")
    .select("*")
    .eq("distribuidor_id", distribuidorId)
    .eq("periodo", periodo)
    .maybeSingle();

  // Calcula realizado do período
  const iniMes = `${periodo}-01`;
  const fimMes = new Date(new Date(`${periodo}-01`).getFullYear(), new Date(`${periodo}-01`).getMonth() + 1, 0)
    .toISOString().slice(0, 10);

  const { data: rede } = await supabase.from("profiles").select("id").eq("indicado_por", distribuidorId);
  const redeIds = (rede || []).map((p: any) => p.id);
  const todosIds = [distribuidorId, ...redeIds];

  const [leadsRes, pedidosRes] = await Promise.all([
    supabase.from("crm_leads")
      .select("status")
      .or(todosIds.map((id: string) => `created_by.eq.${id},responsavel_id.eq.${id}`).join(","))
      .gte("created_at", iniMes).lte("created_at", `${fimMes}T23:59:59`),

    supabase.from("orders")
      .select("total")
      .in("profile_id", todosIds)
      .in("status", ["paid","separacao","despachado","entregue"])
      .gte("created_at", iniMes).lte("created_at", `${fimMes}T23:59:59`),
  ]);

  const leads = leadsRes.data || [];
  const pedidos = pedidosRes.data || [];

  const realizado = {
    leads:      leads.length,
    conversoes: leads.filter((l: any) => l.status === "fechado").length,
    receita:    pedidos.reduce((s: number, p: any) => s + Number(p.total || 0), 0),
  };

  const meta_obj = meta || { meta_leads: 0, meta_conversoes: 0, meta_receita: 0 };

  return NextResponse.json({
    ok: true, periodo, distribuidor_id: distribuidorId,
    meta: meta_obj,
    realizado,
    progresso: {
      leads:      meta_obj.meta_leads > 0 ? Math.round((realizado.leads / meta_obj.meta_leads) * 100) : 0,
      conversoes: meta_obj.meta_conversoes > 0 ? Math.round((realizado.conversoes / meta_obj.meta_conversoes) * 100) : 0,
      receita:    meta_obj.meta_receita > 0 ? Math.round((realizado.receita / meta_obj.meta_receita) * 100) : 0,
    },
  });
}

// POST /api/admin/crm/metas — cria/atualiza meta
export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const access = await assertAccess(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.periodo) return NextResponse.json({ ok: false, error: "periodo obrigatório" }, { status: 400 });

  const distribuidorId = access.role === "ADMIN" ? (body.distribuidor_id || userId) : userId;

  const { data, error } = await supabase
    .from("distribuidor_metas")
    .upsert({
      distribuidor_id: distribuidorId,
      periodo: body.periodo,
      meta_leads:      Number(body.meta_leads || 0),
      meta_conversoes: Number(body.meta_conversoes || 0),
      meta_receita:    Number(body.meta_receita || 0),
    }, { onConflict: "distribuidor_id,periodo" })
    .select().single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, meta: data });
}
