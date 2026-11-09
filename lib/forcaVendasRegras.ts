/**
 * Regras puras da força de vendas.
 * O servidor usa estas funções. O frontend só exibe o resultado.
 * Estoque com concorrência fica na função SQL fv_alocar_item, que segue a mesma conta.
 */

export type OrigemAbastecimento = "distribuidor" | "empresa";

export type AlocacaoItem = {
  distribuidor: number;
  empresa: number;
  naoAtendida: number;
};

export type FreteStatus = "calculado" | "pendente" | "isento" | "recusado";

export type FreteDecisao = {
  status: FreteStatus;
  valor: number | null;
  motivo: string;
};

export type Feriado = {
  data: string;
  uf?: string | null;
};

export type RegraSla = {
  origem: OrigemAbastecimento;
  distribuidorId?: string | null;
  uf?: string | null;
  escopo: "uf" | "demais";
  diasUteis: number;
};

export type PrazoExpedicao = {
  aplicado: boolean;
  diasUteis: number | null;
  dataLimite: string | null;
  motivo: string;
};

function inteiroNaoNegativo(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.max(0, Math.floor(valor));
}

/** Prioridade: distribuidor primeiro, MASC PRO completa o que faltar. Não promete o restante. */
export function alocarPrioridade(
  quantidade: number,
  estoqueDistribuidor: number,
  estoqueCentral: number
): AlocacaoItem {
  const pedido = inteiroNaoNegativo(quantidade);
  const local = inteiroNaoNegativo(estoqueDistribuidor);
  const central = inteiroNaoNegativo(estoqueCentral);
  const distribuidor = Math.min(pedido, local);
  const empresa = Math.min(pedido - distribuidor, central);
  return {
    distribuidor,
    empresa,
    naoAtendida: pedido - distribuidor - empresa,
  };
}

/**
 * Frete só existe com cálculo válido ou com regra de isenção elegível.
 * Sem isso o status fica pendente e o valor não é inventado.
 * A isenção de uma origem não vale para a outra: chame uma vez por origem.
 */
export function decidirFrete(input: {
  valorCalculado: number | null;
  isencaoElegivel: boolean;
  motivoIsencao?: string;
  motivoCalculo?: string;
}): FreteDecisao {
  if (input.isencaoElegivel) {
    return {
      status: "isento",
      valor: 0,
      motivo: input.motivoIsencao || "regra_comercial",
    };
  }
  const valor = input.valorCalculado;
  if (valor != null && Number.isFinite(valor) && valor >= 0) {
    return {
      status: "calculado",
      valor: Math.round(valor * 100) / 100,
      motivo: input.motivoCalculo || "calculo",
    };
  }
  return { status: "pendente", valor: null, motivo: "sem_cotacao" };
}

export type TotalOrigem = {
  produtos: number;
  frete: number | null;
  freteStatus: FreteStatus;
  total: number | null;
};

/** Total da origem = produtos + frete. Pendente não fecha número. */
export function totalDaOrigem(produtos: number, frete: FreteDecisao): TotalOrigem {
  const base = Math.round(Math.max(0, produtos) * 100) / 100;
  if (frete.valor == null || frete.status === "pendente" || frete.status === "recusado") {
    return { produtos: base, frete: null, freteStatus: frete.status, total: null };
  }
  const freteValor = Math.round(frete.valor * 100) / 100;
  return {
    produtos: base,
    frete: freteValor,
    freteStatus: frete.status,
    total: Math.round((base + freteValor) * 100) / 100,
  };
}

/**
 * O consolidado é a soma dos pedidos de cada fornecedor.
 * O agrupador não entra nessa soma.
 */
export function totalConsolidado(totaisPedidos: Array<number | null>): number | null {
  if (totaisPedidos.some((v) => v == null || !Number.isFinite(v))) return null;
  const cents = totaisPedidos.reduce((acc, v) => acc + Math.round((v as number) * 100), 0);
  return cents / 100;
}

function isoDateUtc(year: number, month: number, day: number): string {
  const dt = new Date(Date.UTC(year, month - 1, day));
  return dt.toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return isoDateUtc(year, month, day + days);
}

function weekdayUtc(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function partesEmSaoPaulo(instante: Date): { data: string; minutos: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const partes = fmt.formatToParts(instante);
  const pegar = (tipo: string) => partes.find((p) => p.type === tipo)?.value || "";
  const data = `${pegar("year")}-${pegar("month")}-${pegar("day")}`;
  const minutos = Number(pegar("hour")) * 60 + Number(pegar("minute"));
  return { data, minutos };
}

export function ehFeriado(data: string, uf: string, feriados: Feriado[]): boolean {
  const estado = uf.trim().toUpperCase();
  return feriados.some((f) => {
    if (f.data !== data) return false;
    const local = String(f.uf || "").trim().toUpperCase();
    return !local || local === estado;
  });
}

export function ehDiaUtil(data: string, uf: string, feriados: Feriado[]): boolean {
  const dia = weekdayUtc(data);
  if (dia === 0 || dia === 6) return false;
  return !ehFeriado(data, uf, feriados);
}

/** O primeiro dia útil a partir da data conta como dia 1. Fim de semana e feriado não contam. */
export function dataLimiteDiasUteis(
  inicio: string,
  diasUteis: number,
  uf: string,
  feriados: Feriado[]
): string | null {
  const dias = inteiroNaoNegativo(diasUteis);
  if (dias <= 0) return null;
  let cursor = inicio;
  while (!ehDiaUtil(cursor, uf, feriados)) cursor = addDaysIso(cursor, 1);
  let restantes = dias - 1;
  while (restantes > 0) {
    cursor = addDaysIso(cursor, 1);
    if (ehDiaUtil(cursor, uf, feriados)) restantes -= 1;
  }
  return cursor;
}

export function escolherRegraSla(
  regras: RegraSla[],
  origem: OrigemAbastecimento,
  uf: string,
  distribuidorId?: string | null
): RegraSla | null {
  const estado = uf.trim().toUpperCase();
  const daOrigem = regras.filter((r) => r.origem === origem && r.diasUteis > 0);
  if (origem === "distribuidor") {
    const doDistribuidor = daOrigem.filter((r) => r.distribuidorId && r.distribuidorId === distribuidorId);
    return (
      doDistribuidor.find((r) => r.escopo === "uf" && String(r.uf || "").toUpperCase() === estado) ||
      doDistribuidor.find((r) => r.escopo === "demais") ||
      null
    );
  }
  return (
    daOrigem.find((r) => !r.distribuidorId && r.escopo === "uf" && String(r.uf || "").toUpperCase() === estado) ||
    daOrigem.find((r) => !r.distribuidorId && r.escopo === "demais") ||
    null
  );
}

/**
 * Prazo de expedição, não de entrega.
 * Sem regra do distribuidor, não aplica os 3 ou 7 dias da MASC PRO.
 * Sem UF, não escolhe prazo.
 */
export function prazoExpedicao(input: {
  origem: OrigemAbastecimento;
  uf: string;
  liberadoEm: Date;
  regras: RegraSla[];
  feriados: Feriado[];
  distribuidorId?: string | null;
  horaCorteMinutos?: number | null;
}): PrazoExpedicao {
  const uf = input.uf.trim().toUpperCase();
  if (!uf) {
    return { aplicado: false, diasUteis: null, dataLimite: null, motivo: "sem_uf" };
  }
  const regra = escolherRegraSla(input.regras, input.origem, uf, input.distribuidorId);
  if (!regra) {
    return { aplicado: false, diasUteis: null, dataLimite: null, motivo: "sem_regra" };
  }
  const local = partesEmSaoPaulo(input.liberadoEm);
  let inicio = local.data;
  if (
    input.horaCorteMinutos != null &&
    Number.isFinite(input.horaCorteMinutos) &&
    local.minutos > input.horaCorteMinutos
  ) {
    inicio = addDaysIso(inicio, 1);
  }
  const dataLimite = dataLimiteDiasUteis(inicio, regra.diasUteis, uf, input.feriados);
  if (!dataLimite) {
    return { aplicado: false, diasUteis: null, dataLimite: null, motivo: "sem_regra" };
  }
  return {
    aplicado: true,
    diasUteis: regra.diasUteis,
    dataLimite,
    motivo: "expedicao",
  };
}

export const REGRAS_SLA_MASC_PRO: RegraSla[] = [
  { origem: "empresa", escopo: "uf", uf: "SP", diasUteis: 3 },
  { origem: "empresa", escopo: "demais", diasUteis: 7 },
];
