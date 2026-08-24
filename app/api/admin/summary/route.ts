import { NextRequest, NextResponse } from "next/server";
import { getAdminServiceClient } from "@/lib/adminServer";
import { boundsMesBrasil, labelMesYm, parsePeriodoYm, ymdSaoPaulo, ymSaoPaulo } from "@/lib/comercialRegua";
import { pedidoAtivoNoPeriodo } from "@/lib/pedidoAtivo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_CONFIRMADOS = ["paid", "separacao", "despachado", "entregue"];

const PAGE = 1000;

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

function ymDeIso(iso: string | null | undefined) {
  if (!iso) return "";
  return ymdSaoPaulo(new Date(iso)).slice(0, 7);
}

function listarMeses(ateYm: string, n: number) {
  const [y, m] = ateYm.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, error: authErr, status } = await getAdminServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: authErr || "Não autorizado." }, { status });
    }

    const periodo = parsePeriodoYm(new URL(req.url).searchParams.get("periodo"));
    const { ini: iniMes, fim: fimMes } = boundsMesBrasil(periodo);
    const agoraYm = ymSaoPaulo();
    const hoje = ymdSaoPaulo();
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - 7);

    const [
      membrosRes,
      cadastrosHojeRes,
      cadastrosSemanaRes,
      cadastrosMesRes,
      acessosHojeRes,
      pedidosPagosRes,
      pedidosAguardandoMpRes,
      pedidosPendentesRes,
      pedidosDespachadosRes,
      pedidosEntreguesRes,
      pedidosTodosPagosTot,
      saquesRes,
      ultimosMembrosRes,
      ultimosPedidosRes,
      comissoesRes,
      cadastrosHistRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${hoje}T00:00:00.000-03:00`)
        .lte("created_at", `${hoje}T23:59:59.999-03:00`),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicioSemana.toISOString()),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", iniMes)
        .lte("created_at", fimMes),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("last_sign_in_at", `${hoje}T00:00:00.000-03:00`),
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
      (async () => {
        type PedidoResumo = {
          total: unknown;
          profile_id: unknown;
          created_at: string;
          pago_em?: string | null;
        };
        let r = await fetchAllRows<PedidoResumo>(async (from, to) =>
          (supabase.from("orders") as any)
            .select("total, profile_id, created_at, pago_em")
            .in("status", STATUS_CONFIRMADOS)
            .range(from, to)
        );
        if (r.error) {
          r = await fetchAllRows<PedidoResumo>(async (from, to) =>
            supabase
              .from("orders")
              .select("total, profile_id, created_at")
              .in("status", STATUS_CONFIRMADOS)
              .range(from, to)
          );
        }
        return r;
      })(),
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
      fetchAllRows<{ valor_comissao: unknown; created_at: string }>(async (from, to) => {
        return await supabase
          .from("commissions")
          .select("valor_comissao, created_at")
          .range(from, to);
      }),
      fetchAllRows<{ created_at: string }>(async (from, to) => {
        const { ini } = boundsMesBrasil(listarMeses(agoraYm, 12)[0]);
        return await supabase
          .from("profiles")
          .select("created_at")
          .gte("created_at", ini)
          .range(from, to);
      }),
    ]);

    const erros: string[] = [];
    if (ultimosMembrosRes.error) erros.push(`membros: ${ultimosMembrosRes.error.message}`);
    if (ultimosPedidosRes.error) erros.push(`pedidos: ${ultimosPedidosRes.error.message}`);
    if (comissoesRes.error) erros.push(`comissões: ${comissoesRes.error}`);
    if (saquesRes.error) erros.push(`saques: ${saquesRes.error.message}`);
    if (pedidosTodosPagosTot.error) erros.push(`vendas: ${pedidosTodosPagosTot.error}`);
    if (cadastrosHistRes.error) erros.push(`cadastros: ${cadastrosHistRes.error}`);

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
    const saques = saquesRes.data;

    if (ultimosMembros == null || ultimosPedidos == null || saques == null) {
      return NextResponse.json(
        { ok: false, error: "Falha ao carregar métricas administrativas." },
        { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const pedidos = pedidosTodosPagosTot.rows;
    const totalVendas = pedidos.reduce((acc, p) => acc + Number(p.total || 0), 0);

    const pedidosDoMes = pedidos.filter((p) => {
      const t = new Date(p.created_at).getTime();
      return t >= new Date(iniMes).getTime() && t <= new Date(fimMes).getTime();
    });
    const vendasMes = pedidosDoMes.reduce((acc, p) => acc + Number(p.total || 0), 0);
    const ativosNoMes = new Set(
      pedidos
        .filter((p) => pedidoAtivoNoPeriodo(p, iniMes, fimMes))
        .map((p) => p.profile_id)
        .filter(Boolean) as string[]
    ).size;

    const comissoes = comissoesRes.rows;
    const comissoesTotais = comissoes.reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);
    const comissoesMes = comissoes
      .filter((c) => {
        const t = new Date(c.created_at).getTime();
        return t >= new Date(iniMes).getTime() && t <= new Date(fimMes).getTime();
      })
      .reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0);

    const mesesTabela = listarMeses(agoraYm, 12);
    const porMes = mesesTabela.map((ym) => {
      const b = boundsMesBrasil(ym);
      const iniT = new Date(b.ini).getTime();
      const fimT = new Date(b.fim).getTime();
      const pMes = pedidos.filter((p) => {
        const t = new Date(p.created_at).getTime();
        return t >= iniT && t <= fimT;
      });
      const cMes = comissoes.filter((c) => {
        const t = new Date(c.created_at).getTime();
        return t >= iniT && t <= fimT;
      });
      const cad = cadastrosHistRes.rows.filter((r) => ymDeIso(r.created_at) === ym).length;
      return {
        mes: ym,
        label: labelMesYm(ym),
        vendas: pMes.reduce((acc, p) => acc + Number(p.total || 0), 0),
        pedidos: pMes.length,
        ativos: new Set(
          pedidos
            .filter((p) => pedidoAtivoNoPeriodo(p, b.ini, b.fim))
            .map((p) => p.profile_id)
            .filter(Boolean)
        ).size,
        cadastros: cad,
        comissoes: cMes.reduce((acc, c) => acc + Number(c.valor_comissao || 0), 0),
      };
    });

    const saquesAbertos = saques.length;
    const valorSaquesAbertos = saques.reduce((acc, s) => acc + Number(s.valor_liquido), 0);

    return NextResponse.json(
      {
        ok: true,
        resumo: {
          periodo,
          periodoLabel: labelMesYm(periodo),
          membros: membrosRes.count || 0,
          acessosHoje: acessosHojeRes.count || 0,
          cadastrosHoje: cadastrosHojeRes.count || 0,
          cadastrosSemana: cadastrosSemanaRes.count || 0,
          cadastrosMes: cadastrosMesRes.count || 0,
          ativosNoMes,
          totalVendas,
          vendasMes,
          pedidosPagos: pedidosPagosRes.count ?? 0,
          pedidosPagosMes: pedidosDoMes.length,
          pedidosPendentes: pedidosPendentesRes.count ?? 0,
          pedidosDespachados: pedidosDespachadosRes.count ?? 0,
          pedidosEntregues: pedidosEntreguesRes.count ?? 0,
          pedidosAguardando: pedidosAguardandoMpRes.count ?? 0,
          saquesAbertos,
          valorSaquesAbertos,
          comissoesTotais,
          comissoesMes,
          ultimosMembros,
          ultimosPedidos,
          porMes,
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
