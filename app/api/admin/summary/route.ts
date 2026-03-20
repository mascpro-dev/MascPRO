import { NextResponse } from "next/server";
import { getAdminServiceClient } from "@/lib/adminServer";

export async function GET() {
  try {
    const { supabase, error, status } = await getAdminServiceClient();
    if (!supabase) return NextResponse.json({ ok: false, error }, { status });
    const hoje = new Date().toISOString().split("T")[0];

    const [{ count: membros }, { data: perfisHoje }, { data: vendas }, { count: pendentes }, { data: saques }] =
      await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id, last_sign_in_at"),
        supabase.from("orders").select("total").eq("status", "paid"),
        supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "separacao"]),
        supabase.from("withdrawal_requests").select("valor_liquido").eq("status", "aguardando"),
      ]);

    const acessosHoje = (perfisHoje || []).filter((u: any) => u.last_sign_in_at?.startsWith(hoje)).length;
    const pedidosPagos = (vendas || []).length;
    const totalVendas = (vendas || []).reduce((acc: number, p: any) => acc + Number(p.total), 0);
    const saquesAbertos = (saques || []).length;
    const valorSaquesAbertos = (saques || []).reduce((acc: number, s: any) => acc + Number(s.valor_liquido), 0);

    return NextResponse.json({
      ok: true,
      resumo: {
        membros: membros || 0,
        acessosHoje,
        totalVendas,
        pedidosPagos,
        pedidosPendentes: pendentes || 0,
        saquesAbertos,
        valorSaquesAbertos,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
