import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  calcularFretePAC,
  getDimensoesPadraoEm,
  getPesoDefaultProdutoGramas,
  getPesoEmbalagemGramas,
  pesoTotalGramasItens,
} from "@/lib/correiosFrete";
import { isCepMariliaSp } from "@/lib/freteMarilia";

const FRETE_GRATIS_ACIMA = 1500;

function supabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

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

    if (Number.isFinite(subtotal) && subtotal >= FRETE_GRATIS_ACIMA) {
      return NextResponse.json({
        ok: true,
        frete: 0,
        freteGratis: true,
        prazoEntrega: null,
        pesoGramas: null,
        mensagem: "Frete grátis (pedido acima do mínimo).",
      });
    }

    const cepOrigem = String(process.env.CORREIOS_CEP_ORIGEM || "").replace(/\D/g, "");
    if (cepOrigem.length !== 8) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Frete não configurado: defina CORREIOS_CEP_ORIGEM (8 dígitos) nas variáveis de ambiente.",
        },
        { status: 503 }
      );
    }

    const ids = [...new Set(items.map((i) => i.id))];
    const supabase = supabaseAnon();
    const { data: productRows, error: qerr } = await supabase
      .from("products")
      .select("id, peso_gramas")
      .in("id", ids);

    if (qerr || !productRows) {
      return NextResponse.json({ ok: false, error: "Não foi possível carregar os produtos." }, { status: 500 });
    }

    const def = getPesoDefaultProdutoGramas();
    const emb = getPesoEmbalagemGramas();
    const pesoBase = pesoTotalGramasItens(productRows, items, def);
    const pesoGramas = pesoBase + emb;

    const dim = getDimensoesPadraoEm();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20_000);

    const r = await calcularFretePAC({
      cepOrigem,
      cepDestino: cep,
      pesoGramas,
      dim,
      signal: controller.signal,
    });
    clearTimeout(t);

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: r.mensagem || "Erro ao calcular frete." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      frete: Number(r.valor.toFixed(2)),
      freteGratis: false,
      prazoEntrega: r.prazoEntrega,
      servico: r.servico,
      pesoGramas,
      motivo: "correios",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
