import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  calcularFretePAC,
  dimensoesParaCarrinho,
  getDimensoesPadraoEm,
  getPesoDefaultProdutoGramas,
  getPesoEmbalagemGramas,
  pesoTotalGramasItens,
} from "@/lib/correiosFrete";
import { isCepMariliaSp } from "@/lib/freteMarilia";
import { getConfig, getConfigNum } from "@/lib/systemConfig";

export type FretePedidoInput = {
  subtotal: number;
  cepDestino: string;
  cidade?: string;
  estado?: string;
  items: { id: string; quantity?: number }[];
  supabase?: SupabaseClient;
  /** Ex.: checkout com frete já exibido no carrinho — tentativa rápida aos Correios. */
  correiosTimeoutMs?: number;
};

export type FretePedidoResult = {
  frete: number;
  freteGratis: boolean;
  freteGratisAcima: number;
  motivo?: "subtotal" | "marilia" | "correios";
  prazoEntrega?: number;
  pesoGramas?: number;
  cepOrigem?: string;
  cepDestino?: string;
  servico?: string;
};

function normalizeText(v: string): string {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function supabaseAnon(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Mesma regra para /api/frete, carrinho e checkout Mercado Pago. */
export async function calcularFretePedido(input: FretePedidoInput): Promise<FretePedidoResult> {
  const subtotal = Number(input.subtotal) || 0;
  const cepDestino = String(input.cepDestino || "").replace(/\D/g, "");
  const cidade = normalizeText(String(input.cidade || ""));
  const estado = String(input.estado || "").trim().toUpperCase();
  const freteGratisAcima = await getConfigNum("frete_gratis_acima");

  const isentoSubtotal = freteGratisAcima > 0 && subtotal >= freteGratisAcima;
  const isentoMarilia =
    (cepDestino.length === 8 && isCepMariliaSp(cepDestino)) ||
    (cidade === "marilia" && estado === "SP");

  if (isentoSubtotal) {
    return { frete: 0, freteGratis: true, freteGratisAcima, motivo: "subtotal" };
  }
  if (isentoMarilia) {
    return { frete: 0, freteGratis: true, freteGratisAcima, motivo: "marilia" };
  }

  if (cepDestino.length !== 8) {
    throw new Error("CEP de entrega inválido ou ausente.");
  }

  const cepOrigemConfig = String(await getConfig("correios_cep_origem") || "").replace(/\D/g, "");
  const cepOrigemEnv = String(process.env.CORREIOS_CEP_ORIGEM || "").replace(/\D/g, "");
  const cepOrigem = cepOrigemConfig.length === 8 ? cepOrigemConfig : cepOrigemEnv;
  if (cepOrigem.length !== 8) {
    throw new Error(
      "Loja sem CEP de postagem: configure em Configurações do Sistema ou na variável CORREIOS_CEP_ORIGEM (8 dígitos)."
    );
  }

  const cartIt = input.items.map((i) => ({
    id: i.id,
    quantity: Number(i.quantity || 1),
  }));
  const cartIds = [...new Set(cartIt.map((i) => i.id))];
  const supabase = input.supabase ?? supabaseAnon();
  const { data: productRows, error: perr } = await supabase
    .from("products")
    .select("id, peso_gramas")
    .in("id", cartIds);

  if (perr) {
    throw new Error("Não foi possível validar o peso dos produtos. Tente novamente.");
  }

  const rows = productRows?.length ? productRows : [];
  const pesoBase = pesoTotalGramasItens(rows, cartIt, getPesoDefaultProdutoGramas());
  const pesoGramas = pesoBase + getPesoEmbalagemGramas();
  const dim = dimensoesParaCarrinho(getDimensoesPadraoEm(), cartIt);

  const r = await calcularFretePAC({
    cepOrigem,
    cepDestino,
    pesoGramas,
    dim,
    timeoutMs: input.correiosTimeoutMs,
  });

  if (!r.ok) {
    throw new Error(`Não foi possível calcular o frete: ${r.mensagem}`);
  }

  const valor = Number(r.valor.toFixed(2));
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error("Correios retornou um valor de frete inválido. Tente novamente.");
  }

  return {
    frete: valor,
    freteGratis: false,
    freteGratisAcima,
    motivo: "correios",
    prazoEntrega: r.prazoEntrega,
    pesoGramas,
    cepOrigem,
    cepDestino,
    servico: r.servico,
  };
}
