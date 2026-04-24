/**
 * Marília/SP: faixa de CEPs dos Correios 17500-000 a 17519-999.
 * `cep` pode vir com ou sem hífen; precisa de 8 dígitos.
 */
export function isCepMariliaSp(cep: string): boolean {
  const d = String(cep || "").replace(/\D/g, "");
  if (d.length !== 8) return false;
  const cinco = parseInt(d.slice(0, 5), 10);
  return cinco >= 17500 && cinco <= 17519;
}
