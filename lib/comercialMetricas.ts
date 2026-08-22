export const STATUS_PEDIDO_PAGO = ["paid", "separacao", "despachado", "entregue"] as const;

export const ORIGEM_LEAD_LABEL: Record<string, string> = {
  manual: "Manual",
  indicacao: "Indicação",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  email: "E-mail",
  evento: "Evento",
  outro: "Outro",
};

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  DISTRIBUIDOR: "Distribuidor",
  EMBAIXADOR: "Embaixadora",
  CABELEIREIRO: "Cabeleireiro",
  CLIENTE: "Cliente",
  VENDEDOR: "Vendedor",
};

export type SemaforoComercial = "ok" | "atencao" | "risco";

export type MetasCiclo = {
  leads: number;
  pedidos: number;
  receita: number;
  recompras: number;
};

export const METAS_VAZIAS: MetasCiclo = { leads: 0, pedidos: 0, receita: 0, recompras: 0 };
export const CHAVE_METAS_COMERCIAL = "comercial_fase1_metas";

export function parseMetasPorPeriodo(raw: string | null | undefined, periodo: string): MetasCiclo {
  try {
    const json = JSON.parse(String(raw || "{}")) as Record<string, Partial<MetasCiclo>>;
    const m = json[periodo] || {};
    return {
      leads: Number(m.leads) || 0,
      pedidos: Number(m.pedidos) || 0,
      receita: Number(m.receita) || 0,
      recompras: Number(m.recompras) || 0,
    };
  } catch {
    return { ...METAS_VAZIAS };
  }
}

export function gravarMetasPeriodo(
  raw: string | null | undefined,
  periodo: string,
  metas: MetasCiclo
): string {
  let json: Record<string, MetasCiclo> = {};
  try {
    json = JSON.parse(String(raw || "{}")) as Record<string, MetasCiclo>;
  } catch {
    json = {};
  }
  json[periodo] = {
    leads: Math.max(0, Number(metas.leads) || 0),
    pedidos: Math.max(0, Number(metas.pedidos) || 0),
    receita: Math.max(0, Number(metas.receita) || 0),
    recompras: Math.max(0, Number(metas.recompras) || 0),
  };
  return JSON.stringify(json);
}

/** PDF: >=100% verde, 75–99% amarelo, <75% vermelho. Sem meta, compara com o mês anterior. */
export function semaforoComercial(params: {
  atual: number;
  anterior?: number | null;
  meta?: number | null;
  invertido?: boolean;
}): SemaforoComercial {
  const { atual, invertido } = params;
  const meta = Number(params.meta) || 0;
  const anterior = Number(params.anterior) || 0;

  if (invertido) {
    if (atual === 0) return "ok";
    if (atual <= 3) return "atencao";
    return "risco";
  }

  if (meta > 0) {
    const r = atual / meta;
    if (r >= 1) return "ok";
    if (r >= 0.75) return "atencao";
    return "risco";
  }

  if (anterior <= 0) return atual > 0 ? "ok" : "atencao";
  const r = atual / anterior;
  if (r >= 1) return "ok";
  if (r >= 0.75) return "atencao";
  return "risco";
}

/** Nota 0 / 5 / 8 / 10 do scorecard do PDF. Sem meta retorna null. */
export function notaMeta(atual: number, meta: number): number | null {
  if (meta <= 0) return null;
  const p = (atual / meta) * 100;
  if (p < 50) return 0;
  if (p < 75) return 5;
  if (p < 100) return 8;
  return 10;
}

export function progressoMeta(atual: number, meta: number): number | null {
  if (meta <= 0) return null;
  return Math.round((atual / meta) * 100);
}

export function pctSeguro(num: number, den: number) {
  if (den <= 0) return 0;
  return Math.round((num / den) * 100);
}

export const DEFINICOES_FASE1 = [
  {
    termo: "Lead",
    texto: "Linha em crm_leads. Cadastro de membro no app não conta como lead.",
  },
  {
    termo: "Pedido fechado / faturamento",
    texto: "Pedido com status pago, separação, despachado ou entregue. Cada pedido conta uma vez.",
  },
  {
    termo: "Ticket médio",
    texto: "Faturamento dos pedidos fechados do mês ÷ quantidade desses pedidos.",
  },
  {
    termo: "Recompra",
    texto: "Pedido pago no mês de quem já tinha compra paga antes do início do mês.",
  },
  {
    termo: "Semáforo",
    texto: "Se houver meta do ciclo: verde ≥100%, amarelo ≥75%, vermelho abaixo. Sem meta, compara com o mês anterior.",
  },
];
