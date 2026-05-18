import { getConfigNum } from "@/lib/systemConfig";

/** Papéis que não recebem comissão em R$ por indicação. */
const ROLES_SEM_COMISSAO = new Set(["DISTRIBUIDOR", "ADMIN"]);

/**
 * Percentual de comissão sobre o pedido do indicado direto.
 * null = não gera comissão (ex.: distribuidor).
 */
export async function percentualComissaoDoIndicador(role: string): Promise<number | null> {
  const r = String(role || "").trim().toUpperCase();
  if (ROLES_SEM_COMISSAO.has(r)) return null;

  if (r === "CABELEIREIRO") {
    return await getConfigNum("percentual_comissao_cabeleireiro");
  }
  if (r === "EMBAIXADOR") {
    return await getConfigNum("percentual_comissao");
  }

  return null;
}

export function calcularValorComissao(valorPedido: number, percentual: number): number {
  if (percentual <= 0 || valorPedido <= 0) return 0;
  return Number((valorPedido * (percentual / 100)).toFixed(2));
}
