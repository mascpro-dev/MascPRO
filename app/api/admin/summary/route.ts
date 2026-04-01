import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const agora = new Date();
    const hoje = agora.toISOString().split("T")[0];
    const inicioSemana = new Date(agora);
    inicioSemana.setDate(agora.getDate() - 7);
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const statusConfirmados = ["paid", "separacao", "despachado", "entregue"];

    const [
      { count: membros },
      { count: cadastrosHoje },
      { count: cadastrosSemana },
      { count: acessosHoje },
      { data: todosPedidos },
      { data: pedidosDoMes },
      { data: saques },
      { data: ultimosMembros },
      { data: ultimosPedidos },
      { data: comissoes },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      // Novos hoje — filtro no banco
      supabase.from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${hoje}T00:00:00.000Z`)
        .lte("created_at", `${hoje}T23:59:59.999Z`),
      // Novos nos últimos 7 dias — filtro no banco
      supabase.from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicioSemana.toISOString()),
      // Online hoje (last_sign_in)
      supabase.from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("last_sign_in_at", `${hoje}T00:00:00.000Z`),
      // Todos os pedidos (para totais históricos e por status)
      supabase.from("orders")
        .select("id, total, status, created_at, profile_id")
        .in("status", ["paid", "separacao", "despachado", "entregue", "pending", "novo"]),
      // Pedidos confirmados ESTE MÊS (para ativos e vendas do mês)
      supabase.from("orders")
        .select("id, total, profile_id")
        .in("status", statusConfirmados)
        .gte("created_at", inicioMes.toISOString()),
      supabase.from("withdrawal_requests").select("valor_liquido, status").eq("status", "aguardando"),
      supabase.from("profiles")
        .select("id, full_name, email, created_at, role")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase.from("orders")
        .select("id, total, status, created_at, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase.from("commissions").select("valor_comissao"),
    ]);

    // Cálculos históricos
    const pedidosPagos = (todosPedidos || []).filter((p: any) => statusConfirmados.includes(p.status));
    const totalVendas = pedidosPagos.reduce((acc: number, p: any) => acc + Number(p.total), 0);

    // Vendas e ativos do MÊS ATUAL
    const vendasMes = (pedidosDoMes || []).reduce((acc: number, p: any) => acc + Number(p.total), 0);
    const ativosNoMes = new Set((pedidosDoMes || []).map((p: any) => p.profile_id).filter(Boolean)).size;

    // Por status (todos os tempos)
    const pedidosPendentes = (todosPedidos || []).filter((p: any) => ["paid", "separacao"].includes(p.status)).length;
    const pedidosDespachados = (todosPedidos || []).filter((p: any) => p.status === "despachado").length;
    const pedidosEntregues = (todosPedidos || []).filter((p: any) => p.status === "entregue").length;
    const pedidosAguardando = (todosPedidos || []).filter((p: any) => ["pending", "novo"].includes(p.status)).length;

    const saquesAbertos = (saques || []).length;
    const valorSaquesAbertos = (saques || []).reduce((acc: number, s: any) => acc + Number(s.valor_liquido), 0);
    const comissoesTotais = (comissoes || []).reduce((acc: number, c: any) => acc + Number(c.valor_comissao), 0);

    return NextResponse.json({
      ok: true,
      resumo: {
        membros: membros || 0,
        acessosHoje: acessosHoje || 0,
        cadastrosHoje: cadastrosHoje || 0,
        cadastrosSemana: cadastrosSemana || 0,
        ativosNoMes,
        totalVendas,
        vendasMes,
        pedidosPagos: pedidosPagos.length,
        pedidosPendentes,
        pedidosDespachados,
        pedidosEntregues,
        pedidosAguardando,
        saquesAbertos,
        valorSaquesAbertos,
        comissoesTotais,
        ultimosMembros: ultimosMembros || [],
        ultimosPedidos: ultimosPedidos || [],
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
