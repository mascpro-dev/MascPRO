import { NextResponse } from "next/server";
import { getAdminServiceClient } from "@/lib/adminServer";

export async function GET() {
  try {
    const { supabase, error, status } = await getAdminServiceClient();
    if (!supabase) return NextResponse.json({ ok: false, error }, { status });

    const hoje = new Date().toISOString().split("T")[0];
    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - 7);
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const [
      { count: membros },
      { data: perfisHoje },
      { data: todosPedidos },
      { data: saques },
      { data: ultimosMembros },
      { data: ultimosPedidos },
      { data: comissoes },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id, last_sign_in_at, created_at"),
      supabase.from("orders").select("id, total, status, created_at, profile_id"),
      supabase.from("withdrawal_requests").select("valor_liquido, status").eq("status", "aguardando"),
      supabase
        .from("profiles")
        .select("id, full_name, email, created_at, role")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("orders")
        .select("id, total, status, created_at, profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase.from("commissions").select("valor_comissao"),
    ]);

    const acessosHoje = (perfisHoje || []).filter((u: any) => u.last_sign_in_at?.startsWith(hoje)).length;
    const cadastrosHoje = (perfisHoje || []).filter((u: any) => u.created_at?.startsWith(hoje)).length;
    const cadastrosSemana = (perfisHoje || []).filter((u: any) =>
      new Date(u.created_at) >= inicioSemana
    ).length;

    const pedidosPagos = (todosPedidos || []).filter((p: any) => p.status === "paid");
    const totalVendas = pedidosPagos.reduce((acc: number, p: any) => acc + Number(p.total), 0);

    const vendasMes = (todosPedidos || [])
      .filter((p: any) => p.status === "paid" && new Date(p.created_at) >= inicioMes)
      .reduce((acc: number, p: any) => acc + Number(p.total), 0);

    const pedidosPendentes = (todosPedidos || []).filter((p: any) =>
      ["paid", "separacao"].includes(p.status)
    ).length;
    const pedidosDespachados = (todosPedidos || []).filter((p: any) => p.status === "despachado").length;
    const pedidosEntregues = (todosPedidos || []).filter((p: any) => p.status === "entregue").length;
    const pedidosAguardando = (todosPedidos || []).filter((p: any) =>
      ["pending", "novo"].includes(p.status)
    ).length;

    const saquesAbertos = (saques || []).length;
    const valorSaquesAbertos = (saques || []).reduce((acc: number, s: any) => acc + Number(s.valor_liquido), 0);
    const comissoesTotais = (comissoes || []).reduce((acc: number, c: any) => acc + Number(c.valor_comissao), 0);

    return NextResponse.json({
      ok: true,
      resumo: {
        membros: membros || 0,
        acessosHoje,
        cadastrosHoje,
        cadastrosSemana,
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
