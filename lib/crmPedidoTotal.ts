/** Cálculo de total do pedido CRM (pipeline / manual). */
export function calcularTotalPedidoCrm(params: {
  subtotal: number;
  frete?: number;
  descontoFinal?: number;
}): {
  subtotal: number;
  frete: number;
  descontoFinal: number;
  total: number;
} {
  const subtotal = Math.max(0, Number(params.subtotal) || 0);
  const frete = Math.max(0, Number(params.frete) || 0);
  const bruto = subtotal + frete;
  const descontoFinal = Math.min(
    bruto,
    Math.max(0, Number(params.descontoFinal) || 0)
  );
  const total = Number(Math.max(0, bruto - descontoFinal).toFixed(2));

  return { subtotal, frete, descontoFinal, total };
}

export function parseDescontoFinalBody(body: Record<string, unknown>): number {
  const raw =
    body.desconto_final ??
    body.descontoFinal ??
    body.desconto ??
    0;
  return Math.max(0, Number(raw) || 0);
}
