import { NextRequest, NextResponse } from "next/server";
import { getProDb, ultimoDiaMes, mesAnteriorISO } from "@/lib/proGestaoDb";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Linha de agendamento pago usada nos agregados financeiros (inclui fallback legado sem colunas de pagamento). */
type RowFinancePago = {
  id?: string;
  appointment_date?: string | null;
  appointment_time?: string | null;
  client_name?: string | null;
  service?: string | null;
  price?: number | null;
  status?: string | null;
  paid?: boolean | null;
  paid_at?: string | null;
  payment_method?: string | null;
};

function diaReceita(a: { paid_at?: string | null; appointment_date?: string | null }) {
  const p = a.paid_at ? String(a.paid_at).slice(0, 10) : "";
  if (p) return p;
  return String(a.appointment_date || "").slice(0, 10);
}

const colErr = (e: { code?: string; message?: string } | null | undefined) =>
  e?.code === "42P01" ||
  e?.code === "42703" ||
  String(e?.message || "").toLowerCase().includes("column");

/** Receita (pagamentos recebidos no mes) e despesas — para comparativo mês a mês */
async function mesReceitaDespesasLucro(db: SupabaseClient, userId: string, mes: string) {
  const ini = `${mes}-01`;
  const fim = ultimoDiaMes(mes);
  const [pagosRes, expRes] = await Promise.all([
    db
      .from("appointments")
      .select("id, appointment_date, service, price, status, paid, paid_at, payment_method")
      .eq("professional_id", userId)
      .eq("paid", true)
      .gte("paid_at", ini)
      .lte("paid_at", fim),
    db
      .from("pro_expenses")
      .select("amount, expense_date")
      .eq("professional_id", userId)
      .gte("expense_date", ini)
      .lte("expense_date", fim),
  ]);

  let aptsPagos: RowFinancePago[] = colErr(pagosRes.error)
    ? []
    : ((pagosRes.data || []) as RowFinancePago[]);

  if (pagosRes.error && !colErr(pagosRes.error)) {
    return { receita: 0, despesas: 0, lucro: 0, erro: pagosRes.error.message };
  }

  if (pagosRes.error && colErr(pagosRes.error) && pagosRes.error.code !== "42P01") {
    const leg = await db
      .from("appointments")
      .select("id, appointment_date, service, price, status")
      .eq("professional_id", userId)
      .gte("appointment_date", ini)
      .lte("appointment_date", fim);
    if (!leg.error && leg.data) {
      aptsPagos = leg.data
        .filter((row: { status?: string }) => String(row.status || "").toLowerCase() === "concluido")
        .map(
          (row: {
            id?: string;
            appointment_date?: string | null;
            service?: string | null;
            price?: number | null;
            status?: string | null;
          }): RowFinancePago => ({
            id: row.id,
            appointment_date: row.appointment_date,
            service: row.service,
            price: row.price,
            status: row.status,
            paid: true,
            paid_at: row.appointment_date != null ? String(row.appointment_date) : null,
            payment_method: null,
          })
        );
    } else {
      aptsPagos = [];
    }
  }

  let receita = 0;
  for (const a of aptsPagos) {
    if (String(a.status || "").toLowerCase() === "cancelado") continue;
    receita += Number(a.price || 0);
  }

  const expenses = expRes.error?.code === "42P01" ? [] : expRes.data || [];
  let totalDespesas = 0;
  for (const e of expenses) {
    totalDespesas += Number((e as { amount?: number }).amount || 0);
  }

  return { receita, despesas: totalDespesas, lucro: receita - totalDespesas, erro: null as string | null };
}

function pctVsAnterior(atual: number, anterior: number): number | null {
  if (anterior === 0 && atual === 0) return null;
  if (anterior === 0) return null;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

export async function GET(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes") || new Date().toISOString().slice(0, 7);
  const ini = `${mes}-01`;
  const fim = ultimoDiaMes(mes);

  const [pagosRes, carteiraRes, expRes, chRes] = await Promise.all([
    g.db
      .from("appointments")
      .select(
        "id, appointment_date, appointment_time, client_name, service, price, status, paid, paid_at, payment_method"
      )
      .eq("professional_id", g.userId)
      .eq("paid", true)
      .gte("paid_at", ini)
      .lte("paid_at", fim),
    g.db
      .from("appointments")
      .select("id, price, payment_due_date, client_name, appointment_date, service")
      .eq("professional_id", g.userId)
      .eq("paid", false)
      .eq("payment_method", "carteira")
      .eq("status", "concluido"),
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

  let aptsPagos: RowFinancePago[] = colErr(pagosRes.error)
    ? []
    : ((pagosRes.data || []) as RowFinancePago[]);
  let carteiraPend = colErr(carteiraRes.error) ? [] : carteiraRes.data || [];

  if (pagosRes.error && !colErr(pagosRes.error)) {
    return NextResponse.json({ ok: false, error: pagosRes.error.message }, { status: 500 });
  }

  if (pagosRes.error && colErr(pagosRes.error) && pagosRes.error.code !== "42P01") {
    const leg = await g.db
      .from("appointments")
      .select("id, appointment_date, appointment_time, client_name, service, price, status")
      .eq("professional_id", g.userId)
      .gte("appointment_date", ini)
      .lte("appointment_date", fim);
    if (!leg.error && leg.data) {
      aptsPagos = leg.data
        .filter((row: { status?: string }) => String(row.status || "").toLowerCase() === "concluido")
        .map(
          (row: {
            id?: string;
            appointment_date?: string | null;
            appointment_time?: string | null;
            client_name?: string | null;
            service?: string | null;
            price?: number | null;
            status?: string | null;
          }): RowFinancePago => ({
            id: row.id,
            appointment_date: row.appointment_date,
            appointment_time: row.appointment_time,
            client_name: row.client_name,
            service: row.service,
            price: row.price,
            status: row.status,
            paid: true,
            paid_at: row.appointment_date != null ? String(row.appointment_date) : null,
            payment_method: null,
          })
        );
    } else {
      aptsPagos = [];
    }
  }

  const expenses = expRes.error?.code === "42P01" ? [] : expRes.data || [];
  const chargesOpen = chRes.error?.code === "42P01" ? [] : chRes.data || [];

  let receita = 0;
  const byService: Record<string, { total: number; count: number }> = {};
  const byClient: Record<string, number> = {};
  const byDayRev: Record<string, number> = {};
  const byDayExp: Record<string, number> = {};
  const byForma: Record<string, number> = {};

  for (const a of aptsPagos) {
    if (String(a.status || "").toLowerCase() === "cancelado") continue;
    const p = Number(a.price || 0);
    receita += p;
    const day = diaReceita(a);
    if (day) byDayRev[day] = (byDayRev[day] || 0) + p;
    const svc = (a.service || "Servico").trim() || "Servico";
    if (!byService[svc]) byService[svc] = { total: 0, count: 0 };
    byService[svc].total += p;
    byService[svc].count += 1;
    const cn = (a.client_name || "Cliente").trim();
    byClient[cn] = (byClient[cn] || 0) + p;
    const forma = String(a.payment_method || "nao_info").toLowerCase();
    byForma[forma] = (byForma[forma] || 0) + p;
  }

  const aReceberCarteira = carteiraPend.reduce((s, row: { price?: number | null }) => s + Number(row.price || 0), 0);

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
    .slice(0, 5);

  const topClientes = Object.entries(byClient)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const aReceber = chargesOpen.reduce((s, c) => s + Number(c.amount || 0), 0);

  const porFormaPagamento = Object.entries(byForma)
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total);

  const carteiraItens = carteiraPend
    .map((row: { id: string; client_name?: string; price?: number; payment_due_date?: string; appointment_date?: string; service?: string }) => ({
      id: row.id,
      client_name: row.client_name,
      price: Number(row.price || 0),
      payment_due_date: row.payment_due_date,
      appointment_date: row.appointment_date,
      service: row.service,
    }))
    .sort((a, b) => String(a.payment_due_date || "").localeCompare(String(b.payment_due_date || "")))
    .slice(0, 30);

  const mesAnt = mesAnteriorISO(mes);
  const ant = await mesReceitaDespesasLucro(g.db, g.userId, mesAnt);

  return NextResponse.json({
    ok: true,
    mes,
    resumo: {
      receita,
      despesas: totalDespesas,
      lucro: receita - totalDespesas,
      a_receber: aReceber,
      a_receber_carteira: aReceberCarteira,
    },
    comparativo: ant.erro
      ? null
      : {
          mes_anterior: mesAnt,
          receita_pct: pctVsAnterior(receita, ant.receita),
          despesas_pct: pctVsAnterior(totalDespesas, ant.despesas),
          lucro_pct: pctVsAnterior(receita - totalDespesas, ant.lucro),
        },
    porCategoria: byCategory,
    porFormaPagamento,
    carteiraPendente: carteiraItens,
    topServicos,
    topClientes,
    fluxoDiario,
  });
}
