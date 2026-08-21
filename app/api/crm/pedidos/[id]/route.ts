import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { carregarPedidoParaPdf, podeVerPedidoCrm } from "@/lib/pedidoAcessoCrm";

export const dynamic = "force-dynamic";

/** Dados do pedido para gerar PDF (vendedor, distribuidor ou admin) */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  try {
    const pedido = await carregarPedidoParaPdf(supabase, params.id);
    if (!pedido) {
      return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
    }

    const access = await podeVerPedidoCrm(supabase, userId, pedido);
    if (!access.ok) {
      return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
    }

    return NextResponse.json({ ok: true, pedido });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao carregar pedido.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
