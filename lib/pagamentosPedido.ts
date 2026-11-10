export type PartePagamento = { metodo: string; valor: number };

const METODOS = new Set(["pix", "cartao", "boleto", "dinheiro", "transferencia", "manual", "consignado"]);

export function resolverPagamentos(
  body: { payment_method?: unknown; pagamentos?: unknown },
  total: number
): { ok: true; payment_method: string; partes: PartePagamento[] } | { ok: false; error: string } {
  const lista = Array.isArray(body.pagamentos) ? body.pagamentos : [];
  if (lista.length === 0) {
    const metodo = String(body.payment_method || "manual").toLowerCase();
    if (!METODOS.has(metodo)) return { ok: false, error: "Forma de pagamento inválida." };
    return {
      ok: true,
      payment_method: metodo,
      partes: [{ metodo, valor: Number(total.toFixed(2)) }],
    };
  }
  if (lista.length > 2) return { ok: false, error: "Use no máximo duas formas de pagamento." };

  const partes: PartePagamento[] = [];
  for (const item of lista) {
    const metodo = String((item as { metodo?: unknown })?.metodo || "").toLowerCase();
    const valor = Number((item as { valor?: unknown })?.valor);
    if (!METODOS.has(metodo) || metodo === "consignado" || metodo === "manual") {
      return { ok: false, error: "Escolha Pix, cartão, boleto, dinheiro ou transferência." };
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      return { ok: false, error: "Cada forma precisa ter um valor maior que zero." };
    }
    partes.push({ metodo, valor: Number(valor.toFixed(2)) });
  }

  const soma = Number(partes.reduce((acc, p) => acc + p.valor, 0).toFixed(2));
  if (Math.abs(soma - Number(total.toFixed(2))) > 0.05) {
    return { ok: false, error: "A soma das formas precisa fechar o total do pedido." };
  }

  const payment_method = partes
    .map((p) => `${p.metodo} ${p.valor.toFixed(2)}`)
    .join(" + ");
  return { ok: true, payment_method, partes };
}
