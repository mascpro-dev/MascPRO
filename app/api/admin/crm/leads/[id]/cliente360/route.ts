import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function assertCrmAccess(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  const role = String(data?.role || "").toUpperCase();
  if (!["ADMIN", "DISTRIBUIDOR"].includes(role)) {
    return { ok: false as const, error: "Acesso restrito ao CRM." };
  }
  return { ok: true as const, role };
}

// GET /api/admin/crm/leads/[id]/cliente360
// Retorna a jornada completa pós-venda do cliente vinculado ao lead
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId)
    return NextResponse.json({ ok: false, error: authErr }, { status });

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok)
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  // Busca o lead para obter o profile_id
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, profile_id, convertido_em")
    .eq("id", params.id)
    .maybeSingle();

  if (!lead?.profile_id)
    return NextResponse.json({ ok: false, error: "Lead não vinculado a um perfil." }, { status: 404 });

  const profileId = lead.profile_id;

  // Busca dados em paralelo
  const [perfilRes, pedidosRes, agendamentosRes, redeRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, whatsapp, instagram, role, nivel, city, state, avatar_url, created_at, pro_total, personal_coins, network_coins, indicado_por")
      .eq("id", profileId)
      .maybeSingle(),

    supabase
      .from("orders")
      .select("id, total, status, created_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("appointments")
      .select("id, client_name, service, appointment_time, appointment_date, status, price")
      .eq("professional_id", profileId)
      .order("appointment_date", { ascending: false })
      .limit(10),

    supabase
      .from("profiles")
      .select("id, full_name, email, whatsapp, role, created_at")
      .eq("indicado_por", profileId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const perfil = perfilRes.data;
  const pedidos = pedidosRes.data || [];
  const agendamentos = agendamentosRes.data || [];
  const rede = redeRes.data || [];

  // Busca itens dos pedidos
  const pedidoIds = pedidos.map((p: { id: string }) => p.id);
  let itensPedidos: any[] = [];
  if (pedidoIds.length > 0) {
    const { data: itens } = await supabase
      .from("order_items")
      .select("order_id, quantidade, preco_unitario, product_id")
      .in("order_id", pedidoIds);

    const prodIds = [...new Set((itens || []).map((i: any) => i.product_id).filter(Boolean))];
    let nomeProd = new Map<string, string>();
    if (prodIds.length > 0) {
      const { data: prods } = await supabase
        .from("products")
        .select("id, title")
        .in("id", prodIds);
      nomeProd = new Map((prods || []).map((p: any) => [p.id, p.title]));
    }
    itensPedidos = (itens || []).map((i: any) => ({
      ...i,
      titulo: nomeProd.get(i.product_id) || "Produto",
    }));
  }

  // Cálculos de resumo
  const STATUS_PAGOS = ["paid", "separacao", "despachado", "entregue"];
  const pedidosPagos = pedidos.filter((p: any) => STATUS_PAGOS.includes(p.status));
  const totalComprado = pedidosPagos.reduce((s: number, p: any) => s + Number(p.total || 0), 0);
  const ultimaCompra = pedidosPagos[0]?.created_at || null;
  const diasSemComprar = ultimaCompra
    ? Math.floor((Date.now() - new Date(ultimaCompra).getTime()) / 86_400_000)
    : null;

  return NextResponse.json({
    ok: true,
    perfil,
    pedidos: pedidos.map((p: any) => ({
      ...p,
      itens: itensPedidos.filter((i) => i.order_id === p.id),
    })),
    agendamentos,
    rede,
    resumo: {
      total_pedidos: pedidos.length,
      total_comprado: totalComprado,
      ultima_compra: ultimaCompra,
      dias_sem_comprar: diasSemComprar,
      total_indicados: rede.length,
      pro_total: perfil?.pro_total || 0,
    },
  });
}
