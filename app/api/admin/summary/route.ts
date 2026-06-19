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
      membrosRes,
      cadastrosHojeRes,
      cadastrosSemanaRes,
      acessosHojeRes,
      pedidosPagosRes,
      pedidosAguardandoMpRes,
      pedidosPendentesRes,
      pedidosDespachadosRes,
      pedidosEntreguesRes,
      pedidosTodosPagosTot,
      pedidosMesFin,
      saquesRes,
      ultimosMembrosRes,
      ultimosPedidosRes,
      comissoesRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${hoje}T00:00:00.000Z`)
        .lte("created_at", `${hoje}T23:59:59.999Z`),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicioSemana.toISOString()),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("last_sign_in_at", `${hoje}T00:00:00.000Z`),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", STATUS_CONFIRMADOS),
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
        .select("id, total, status, created_at, profiles!orders_profile_id_fkey(full_name)")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase.from("commissions").select("valor_comissao"),
    ]);

    const erros: string[] = [];
    if (ultimosMembrosRes.error) erros.push(`membros: ${ultimosMembrosRes.error.message}`);
    if (ultimosPedidosRes.error) erros.push(`pedidos: ${ultimosPedidosRes.error.message}`);
    if (comissoesRes.error) erros.push(`comissões: ${comissoesRes.error.message}`);
    if (saquesRes.error) erros.push(`saques: ${saquesRes.error.message}`);
    if (pedidosTodosPagosTot.error) erros.push(`vendas: ${pedidosTodosPagosTot.error}`);
    if (pedidosMesFin.error) erros.push(`vendas mês: ${pedidosMesFin.error}`);

    if (erros.length > 0) {
      console.error("[admin/summary]", erros.join(" | "));
      return NextResponse.json(
        {
          ok: false,
          error: erros[0] || "Falha ao carregar métricas administrativas.",
          detalhes: erros,
        },
        { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const ultimosMembros = ultimosMembrosRes.data;
    const ultimosPedidos = ultimosPedidosRes.data;
    const comissoes = comissoesRes.data;
    const saques = saquesRes.data;

    if (
      ultimosMembros == null ||
      ultimosPedidos == null ||
      comissoes == null ||
      saques == null
    ) {
      return NextResponse.json(
        { ok: false, error: "Falha ao carregar métricas administrativas." },
        { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const totalVendas = pedidosTodosPagosTot.rows.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const vendasMes = pedidosMesFin.rows.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const ativosNoMes = new Set(
      pedidosMesFin.rows.map((p) => p.profile_id).filter(Boolean) as string[]
    ).size;

    const saquesAbertos = saques.length;
    const valorSaquesAbertos = saques.reduce((acc, s) => acc + Number(s.valor_liquido), 0);
    const comissoesTotais = comissoes.reduce((acc, c) => acc + Number(c.valor_comissao), 0);

    return NextResponse.json(
      {
        ok: true,
        resumo: {
          membros: membrosRes.count || 0,
          acessosHoje: acessosHojeRes.count || 0,
          cadastrosHoje: cadastrosHojeRes.count || 0,
          cadastrosSemana: cadastrosSemanaRes.count || 0,
          ativosNoMes,
          totalVendas,
          vendasMes,
          pedidosPagos: pedidosPagosRes.count ?? 0,
          pedidosPendentes: pedidosPendentesRes.count ?? 0,
          pedidosDespachados: pedidosDespachadosRes.count ?? 0,
          pedidosEntregues: pedidosEntreguesRes.count ?? 0,
          pedidosAguardando: pedidosAguardandoMpRes.count ?? 0,
          saquesAbertos,
          valorSaquesAbertos,
          comissoesTotais,
          ultimosMembros,
          ultimosPedidos,
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
