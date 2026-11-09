/** Dia comercial no fuso de São Paulo. Sem horário de verão. */

export function dataHojeSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export function intervaloDiaSaoPaulo(data: string): { ini: string; fim: string } {
  const [year, month, day] = data.split("-").map(Number);
  const ini = new Date(Date.UTC(year, month - 1, day, 3, 0, 0));
  const fim = new Date(ini.getTime() + 24 * 60 * 60 * 1000);
  return { ini: ini.toISOString(), fim: fim.toISOString() };
}

export function dataValida(valor: string | null): string | null {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  return valor;
}

export const STATUS_PEDIDO_CONFIRMADO = ["paid", "separacao", "despachado", "entregue"];
