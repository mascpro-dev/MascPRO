import { NextRequest, NextResponse } from "next/server";
import { getProDb, ultimoDiaMes } from "@/lib/proGestaoDb";

export const dynamic = "force-dynamic";

function isReceitaStatus(s: string) {
  const x = (s || "").toLowerCase();
  return x !== "cancelado";
}

export async function GET(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes") || new Date().toISOString().slice(0, 7);
  const ini = `${mes}-01`;
  const fim = ultimoDiaMes(mes);

  const [aptsRes, expRes, chRes] = await Promise.all([
    g.db
      .from("appointments")
      .select("id, appointment_date, appointment_time, client_name, service, price, status")
      .eq("professional_id", g.userId)
      .gte("appointment_date", ini)
      .lte("appointment_date", fim),
    g.db
      .from("pro_expenses")
      .select("id, expense_date, amount, category, description")
      .eq("professional_id", g.userId)
      .gte("expense_date", ini)
      .lte("expense_date", fim),
    g.db
      .from("pro_charges")
      .select("id, client_name, amount, paid, charge_date")
      .eq("professional_id", g.userId)
      .eq("paid", false),
  ]);

  const apts = aptsRes.error?.code === "42P01" ? [] : aptsRes.data || [];
  const expenses = expRes.error?.code === "42P01" ? [] : expRes.data || [];
  const chargesOpen = chRes.error?.code === "42P01" ? [] : chRes.data || [];

  if (aptsRes.error && aptsRes.error.code !== "42P01") {
    return NextResponse.json({ ok: false, error: aptsRes.error.message }, { status: 500 });
  }

  let receita = 0;
  const byService: Record<string, { total: number; count: number }> = {};
  const byClient: Record<string, number> = {};
  const byDayRev: Record<string, number> = {};
  const byDayExp: Record<string, number> = {};

  for (const a of apts) {
    if (!isReceitaStatus(String(a.status))) continue;
    const p = Number(a.price || 0);
    receita += p;
    const day = String(a.appointment_date);
    byDayRev[day] = (byDayRev[day] || 0) + p;
    const svc = (a.service || "Servico").trim() || "Servico";
    if (!byService[svc]) byService[svc] = { total: 0, count: 0 };
    byService[svc].total += p;
    byService[svc].count += 1;
    const cn = (a.client_name || "Cliente").trim();
    byClient[cn] = (byClient[cn] || 0) + p;
  }

  let totalDespesas = 0;
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const amt = Number(e.amount || 0);
    totalDespesas += amt;
    const cat = e.category || "diversos";
    byCategory[cat] = (byCategory[cat] || 0) + amt;
    const day = String(e.expense_date);
    byDayExp[day] = (byDayExp[day] || 0) + amt;
  }

  const daysSet = new Set([...Object.keys(byDayRev), ...Object.keys(byDayExp)]);
  const fluxoDiario = [...daysSet]
    .sort()
    .map((dia) => {
      const r = byDayRev[dia] || 0;
      const d = byDayExp[dia] || 0;
      return { dia, receita: r, despesa: d, resultado: r - d };
    });

  const topServicos = Object.entries(byService)
    .map(([name, v]) => ({ name, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const topClientes = Object.entries(byClient)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const aReceber = chargesOpen.reduce((s, c) => s + Number(c.amount || 0), 0);

  return NextResponse.json({
    ok: true,
    mes,
    resumo: {
      receita,
      despesas: totalDespesas,
      lucro: receita - totalDespesas,
      a_receber: aReceber,
    },
    porCategoria: byCategory,
    topServicos,
    topClientes,
    fluxoDiario,
  });
}
