import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * Lista comissões do embaixador logado: quem comprou, valor da venda e comissão.
 */
export async function GET() {
  try {
    const supabaseAuth = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { ok: false, error: "Servidor sem permissão para listar comissões." },
        { status: 500 }
      );
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    const { data: comissoes, error } = await supabase
      .from("commissions")
      .select(
        "id, created_at, valor_pedido, percentual, valor_comissao, status, order_id, cabeleireiro_id"
      )
      .eq("embaixador_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = comissoes || [];
    const buyerIds = [...new Set(rows.map((c) => c.cabeleireiro_id).filter(Boolean))];

    const nameById = new Map<string, string>();
    if (buyerIds.length > 0) {
      const { data: perfis } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", buyerIds);
      (perfis || []).forEach((p) => {
        nameById.set(p.id, p.full_name || "Indicado");
      });
    }

    const lista = rows.map((c) => ({
      id: c.id,
      created_at: c.created_at,
      comprador_nome: nameById.get(c.cabeleireiro_id) || "Indicado",
      comprador_id: c.cabeleireiro_id,
      valor_pedido: Number(c.valor_pedido || 0),
      percentual: Number(c.percentual || 0),
      valor_comissao: Number(c.valor_comissao || 0),
      status: c.status,
      order_id: c.order_id,
    }));

    const total = lista.reduce((acc, c) => acc + c.valor_comissao, 0);
    const disponivel = lista
      .filter((c) => c.status === "disponivel")
      .reduce((acc, c) => acc + c.valor_comissao, 0);

    return NextResponse.json({
      ok: true,
      comissoes: lista,
      resumo: { total, disponivel, quantidade: lista.length },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
