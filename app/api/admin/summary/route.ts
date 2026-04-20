import { NextResponse } from "next/server";
import { getAdminServiceClient } from "@/lib/adminServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_CONFIRMADOS = ["paid", "separacao", "despachado", "entregue"];

const PAGE = 1000;

/** Percorre todas as páginas do PostgREST (limite padrão ~1000 linhas por request). */
async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  let from = 0;
  const maxPages = 500;
  for (let i = 0; i < maxPages; i++) {
    const to = from + PAGE - 1;
    const res = await fetchPage(from, to);
    if (res.error) return { rows: [], error: res.error.message };
    const chunk = res.data || [];
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return { rows, error: null };
}

export async function GET() {
  try {
    const { supabase, error: authErr, status } = await getAdminServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: authErr || "Não autorizado." }, { status });
    }

    const agora = new Date();
    const hoje = agora.toISOString().split("T")[0];
    const inicioSemana = new Date(agora);
    inicioSemana.setDate(agora.getDate() - 7);
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const [
      { count: membros },
      { count: cadastrosHoje },
      { count: cadastrosSemana },
      { count: acessosHoje },
      { count: pedidosPagos }, // mesmo critério de STATUS_CONFIRMADOS (histórico completo)
      { count: pedidosAguardandoPagamentoMp },
      { count: pedidosPendentes }, // paid + separacao — precisam de operação na loja
      { count: pedidosDespachados },
      { count: pedidosEntregues },
      pedidosTodosPagosTot,
      pedidosMesFin,
      { data: saques },
      { data: ultimosMembros },
      { data: ultimosPedidos },
      { data: comissoes },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${hoje}T00:00:00.000Z`)
        .lte("created_at", `${hoje}T23:59:59.999Z`),
      supabase.from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicioSemana.toISOString()),
      supabase.from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("last_sign_in_at", `${hoje}T00:00:00.000Z`),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", STATUS_CONFIRMADOS),
      // Só fluxo Mercado Pago/checkout (não conta rascunho `novo`)
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["paid", "separacao"]),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "despachado"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "entregue"),
      fetchAllRows<{ total: unknown }>(async (from, to) => {
        return await supabase
          .from("orders")
          .select("total")
          .in("status", STATUS_CONFIRMADOS)
          .range(from, to);
      }),
      fetchAllRows<{ total: unknown; profile_id: unknown }>(async (from, to) => {
        return await supabase
          .from("orders")
          .select("total, profile_id")
          .in("status", STATUS_CONFIRMADOS)
          .gte("created_at", inicioMes.toISOString())
          .range(from, to);
      }),
      supabase.from("withdrawal_requests").select("valor_liquido, status").eq("status", "aguardando"),
      supabase
        .from("profiles")
        .select("id, full_name, email, created_at, role, avatar_url")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("orders")
        .select("id, total, status, created_at, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase.from("commissions").select("valor_comissao"),
    ]);

    const criticos = [
      ultimosMembros,
      ultimosPedidos,
      comissoes,
      saques,
      pedidosTodosPagosTot.rows,
      pedidosMesFin.rows,
    ];
    if (criticos.some((x) => x === null)) {
      return NextResponse.json(
        { ok: false, error: "Falha ao carregar métricas administrativas." },
        { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    if (pedidosTodosPagosTot.error || pedidosMesFin.error) {
      return NextResponse.json(
        {
          ok: false,
          error: pedidosTodosPagosTot.error || pedidosMesFin.error || "Erro ao somar pedidos.",
        },
        { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const totalVendas = pedidosTodosPagosTot.rows.reduce((acc, p: any) => acc + Number(p.total || 0), 0);
    const vendasMes = pedidosMesFin.rows.reduce((acc, p: any) => acc + Number(p.total || 0), 0);
    const ativosNoMes = new Set(
      pedidosMesFin.rows.map((p: any) => p.profile_id).filter(Boolean) as string[]
    ).size;

    const saquesAbertos = (saques || []).length;
    const valorSaquesAbertos = (saques || []).reduce((acc: number, s: any) => acc + Number(s.valor_liquido), 0);
    const comissoesTotais = (comissoes || []).reduce((acc: number, c: any) => acc + Number(c.valor_comissao), 0);

    return NextResponse.json(
      {
        ok: true,
        resumo: {
          membros: membros || 0,
          acessosHoje: acessosHoje || 0,
          cadastrosHoje: cadastrosHoje || 0,
          cadastrosSemana: cadastrosSemana || 0,
          ativosNoMes,
          totalVendas,
          vendasMes,
          pedidosPagos: pedidosPagos ?? 0,
          pedidosPendentes: pedidosPendentes ?? 0,
          pedidosDespachados: pedidosDespachados ?? 0,
          pedidosEntregues: pedidosEntregues ?? 0,
          pedidosAguardando: pedidosAguardandoPagamentoMp ?? 0,
          saquesAbertos,
          valorSaquesAbertos,
          comissoesTotais,
          ultimosMembros: ultimosMembros || [],
          ultimosPedidos: ultimosPedidos || [],
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno." },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
