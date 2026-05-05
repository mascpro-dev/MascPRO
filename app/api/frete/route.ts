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
import { getConfig, getConfigNum } from "@/lib/systemConfig";

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

    const freteGratisAcima = await getConfigNum("frete_gratis_acima");

    if (Number.isFinite(subtotal) && freteGratisAcima > 0 && subtotal >= freteGratisAcima) {
      return NextResponse.json({
        ok: true,
        frete: 0,
        freteGratis: true,
        prazoEntrega: null,
        pesoGramas: null,
        mensagem: `Frete grátis para pedidos acima de R$ ${freteGratisAcima.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
      });
    }

    const cepOrigemConfig = String(await getConfig("correios_cep_origem") || "").replace(/\D/g, "");
    const cepOrigemEnv = String(process.env.CORREIOS_CEP_ORIGEM || "").replace(/\D/g, "");
    const cepOrigem = cepOrigemConfig.length === 8 ? cepOrigemConfig : cepOrigemEnv;
    if (cepOrigem.length !== 8) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Frete não configurado: informe o CEP de origem dos Correios em Configurações do Sistema ou na variável CORREIOS_CEP_ORIGEM.",
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
