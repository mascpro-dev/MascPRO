import { NextRequest, NextResponse } from "next/server";
import { requireAdminMaster } from "@/lib/adminMasterAuth";
import { ultimoDiaMes } from "@/lib/proGestaoDb";

export const dynamic = "force-dynamic";

function safeSum(rows: { amount?: number | null }[] | null | undefined) {
  return (rows || []).reduce((s, r) => s + Number(r.amount || 0), 0);
}

export async function GET(req: NextRequest) {
  const g = await requireAdminMaster();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { searchParams } = new URL(req.url);
  const profissionalId = searchParams.get("profissionalId");
  const dia = searchParams.get("dia") || new Date().toISOString().slice(0, 10);
  const mes = dia.slice(0, 7);
  const iniMes = `${mes}-01`;
  const fimMes = ultimoDiaMes(mes);

  const { data: todosPerfis, error: e0 } = await g.supabase
    .from("profiles")
    .select("id, full_name, email, whatsapp, role, avatar_url")
    .order("full_name", { ascending: true });

  if (e0) {
    return NextResponse.json({ ok: false, error: e0.message }, { status: 500 });
  }

  const profissionais = (todosPerfis || []).filter((p: { role?: string | null }) => String(p.role || "").toUpperCase() !== "ADMIN");

  if (!profissionalId) {
    return NextResponse.json({ ok: true, dia, profissionais });
  }

  const { data: profissional, error: e1 } = await g.supabase
    .from("profiles")
    .select("id, full_name, email, whatsapp, instagram, role, city, state, avatar_url")
    .eq("id", profissionalId)
    .maybeSingle();

  if (e1 || !profissional) {
    return NextResponse.json({ ok: false, error: "Profissional não encontrado." }, { status: 404 });
  }

  const [
    aptsRes,
    clientsRes,
    svcRes,
    expRes,
    chRes,
    ordRes,
    prodRes,
    invRes,
    movRes,
  ] = await Promise.all([
    g.supabase
      .from("appointments")
      .select("id, client_name, client_phone, service, appointment_time, duration_min, status, price, client_id")
      .eq("professional_id", profissionalId)
      .eq("appointment_date", dia)
      .order("appointment_time", { ascending: true }),
    g.supabase
      .from("pro_clients")
      .select("id, name, phone, birthday", { count: "exact" })
      .eq("professional_id", profissionalId)
      .order("name", { ascending: true })
      .limit(120),
    g.supabase
      .from("pro_services")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", profissionalId),
    g.supabase
      .from("pro_expenses")
      .select("amount")
      .eq("professional_id", profissionalId)
      .gte("expense_date", iniMes)
      .lte("expense_date", fimMes),
    g.supabase
      .from("pro_charges")
      .select("amount")
      .eq("professional_id", profissionalId)
      .eq("paid", false),
    g.supabase
      .from("orders")
      .select("id, total, status, created_at")
      .eq("profile_id", profissionalId)
      .order("created_at", { ascending: false })
      .limit(12),
    g.supabase.from("products").select("id, title, stock, ativo").eq("ativo", true).order("title", { ascending: true }).limit(80),
    g.supabase
      .from("pro_inventory")
      .select("id, name, category, quantity, unit, min_quantity, product_id, notes, updated_at")
      .eq("professional_id", profissionalId)
      .order("category", { ascending: true })
      .order("name", { ascending: true })
      .limit(300),
    g.supabase
      .from("pro_inventory_movements")
      .select("id, order_id, product_id, inventory_id, quantity_delta, reason, created_at")
      .eq("professional_id", profissionalId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  let receitaMes = 0;
  const pagosRes = await g.supabase
    .from("appointments")
    .select("price, status, paid, paid_at")
    .eq("professional_id", profissionalId)
    .eq("paid", true)
    .gte("paid_at", iniMes)
    .lte("paid_at", fimMes);

  if (!pagosRes.error && pagosRes.data) {
    for (const a of pagosRes.data) {
      if (String(a.status || "").toLowerCase() === "cancelado") continue;
      receitaMes += Number(a.price || 0);
    }
  } else if (pagosRes.error && (pagosRes.error.code === "42703" || String(pagosRes.error.message || "").toLowerCase().includes("paid"))) {
    const leg = await g.supabase
      .from("appointments")
      .select("price, status, appointment_date")
      .eq("professional_id", profissionalId)
      .gte("appointment_date", iniMes)
      .lte("appointment_date", fimMes);
    for (const a of leg.data || []) {
      if (String(a.status || "").toLowerCase() !== "concluido") continue;
      receitaMes += Number(a.price || 0);
    }
  }

  const despesasMes = expRes.error ? 0 : safeSum(expRes.data);
  const cobrancasAberto = chRes.error ? 0 : safeSum(chRes.data);
  const servicosCount = svcRes.error ? 0 : svcRes.count ?? 0;

  const orders = ordRes.error ? [] : ordRes.data || [];
  const orderIds = orders.map((o: { id: string }) => o.id);
  let itensCompras: { order_id: string; quantidade: number; preco_unitario: number; titulo: string }[] = [];

  if (orderIds.length > 0 && !ordRes.error) {
    const { data: oi } = await g.supabase
      .from("order_items")
      .select("order_id, quantidade, preco_unitario, product_id")
      .in("order_id", orderIds);
    const pids = [...new Set((oi || []).map((x: { product_id?: string }) => x.product_id).filter(Boolean))] as string[];
    let titleMap = new Map<string, string>();
    if (pids.length > 0) {
      const { data: pr } = await g.supabase.from("products").select("id, title").in("id", pids);
      titleMap = new Map((pr || []).map((p: { id: string; title: string }) => [p.id, p.title]));
    }
    itensCompras = (oi || []).map((row: { order_id: string; quantidade: number; preco_unitario: number; product_id?: string }) => ({
      order_id: row.order_id,
      quantidade: Number(row.quantidade || 0),
      preco_unitario: Number(row.preco_unitario || 0),
      titulo: titleMap.get(row.product_id || "") || "Produto",
    }));
  }

  const catalogoStock = prodRes.error ? [] : prodRes.data || [];
  const estoqueSalao = invRes.error ? [] : invRes.data || [];

  const movRaw = movRes.error ? [] : movRes.data || [];
  const pidsM = [...new Set((movRaw as { product_id?: string }[]).map((m) => m.product_id).filter(Boolean))] as string[];
  const iidsM = [...new Set((movRaw as { inventory_id?: string }[]).map((m) => m.inventory_id).filter(Boolean))] as string[];
  let titleByPid = new Map<string, string>();
  let nameByInv = new Map<string, string>();
  if (pidsM.length > 0) {
    const { data: prm } = await g.supabase.from("products").select("id, title").in("id", pidsM);
    titleByPid = new Map((prm || []).map((p: { id: string; title: string }) => [p.id, p.title]));
  }
  if (iidsM.length > 0) {
    const { data: invm } = await g.supabase.from("pro_inventory").select("id, name").in("id", iidsM);
    nameByInv = new Map((invm || []).map((p: { id: string; name: string }) => [p.id, p.name]));
  }
  const estoqueOrigemPedidos = (movRaw as { id: string; order_id: string | null; product_id: string | null; inventory_id: string | null; quantity_delta: number; reason: string; created_at: string }[]).map((m) => ({
    id: m.id,
    order_id: m.order_id,
    order_ref: m.order_id ? `${String(m.order_id).slice(0, 8)}…` : null,
    product_title: (m.product_id && titleByPid.get(m.product_id)) || "—",
    item_name: (m.inventory_id && nameByInv.get(m.inventory_id)) || "—",
    quantity_delta: Number(m.quantity_delta),
    reason: m.reason,
    created_at: m.created_at,
  }));

  return NextResponse.json({
    ok: true,
    dia,
    mes,
    profissional,
    agenda: aptsRes.error ? [] : aptsRes.data || [],
    clientes: {
      total: clientsRes.count ?? (clientsRes.data || []).length,
      lista: clientsRes.error ? [] : clientsRes.data || [],
    },
    servicosCadastrados: servicosCount,
    financeiro: {
      receitaMes,
      despesasMes,
      lucroMes: receitaMes - despesasMes,
      cobrancasAberto,
    },
    comprasLoja: orders,
    itensCompras,
    catalogoPlataforma: catalogoStock,
    estoqueSalao,
    estoqueOrigemPedidos,
  });
}
