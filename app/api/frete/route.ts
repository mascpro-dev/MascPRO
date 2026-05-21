import { NextRequest, NextResponse } from "next/server";
import { calcularFretePedido } from "@/lib/fretePedido";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cep = String(body.cep || "").replace(/\D/g, "");
    const items: { id: string; quantity: number }[] = Array.isArray(body.items) ? body.items : [];
    const subtotal = Number(body.subtotal);

    if (cep.length !== 8) {
      return NextResponse.json({ ok: false, error: "Informe um CEP válido." }, { status: 400 });
    }
    if (!items.length) {
      return NextResponse.json({ ok: false, error: "Carrinho vazio." }, { status: 400 });
    }

    const r = await calcularFretePedido({
      subtotal,
      cepDestino: cep,
      cidade: body.cidade,
      estado: body.estado,
      items,
    });

    if (r.freteGratis) {
      const mensagem =
        r.motivo === "marilia"
          ? "Marília/SP — entrega com frete isento."
          : `Frete grátis para pedidos acima de R$ ${r.freteGratisAcima.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`;
      return NextResponse.json(
        {
          ok: true,
          frete: 0,
          freteGratis: true,
          freteGratisAcima: r.freteGratisAcima,
          prazoEntrega: null,
          pesoGramas: null,
          motivo: r.motivo || "subtotal",
          mensagem,
        },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        frete: r.frete,
        freteGratis: false,
        freteGratisAcima: r.freteGratisAcima,
        motivo: "correios",
        prazoEntrega: r.prazoEntrega ?? null,
        pesoGramas: r.pesoGramas ?? null,
        cepOrigem: r.cepOrigem,
        cepDestino: r.cepDestino,
        servico: r.servico,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado.";
    const erro =
      /aborted|abort|timeout/i.test(msg)
        ? "Correios demorou para responder. Tente novamente em instantes."
        : msg;
    return NextResponse.json({ ok: false, error: erro }, { status: 500 });
  }
}
