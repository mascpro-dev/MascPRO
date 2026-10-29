import { ymdSaoPaulo } from "@/lib/comercialRegua";
import { perfilComercialLead, type LeadCarteira } from "@/lib/crmCarteiraServidor";

export const FORA_PERFIL = new Set(["fora_perfil", "atividade_encerrada"]);

export const RESULTADO_TENTATIVA = new Set([
  "contato_nao_efetivado",
  "decisor_nao_localizado",
  "contato_decisor",
  "apresentacao",
  "catalogo_enviado",
  "visita_agendada",
  "visita_realizada",
  "proposta_enviada",
  "negociacao",
  "compra_confirmada",
]);

export const RESULTADO_CONVERSA = new Set([
  "contato_decisor",
  "apresentacao",
  "catalogo_enviado",
  "visita_realizada",
  "proposta_enviada",
  "negociacao",
  "compra_confirmada",
]);

export const RESULTADO_DECISOR = new Set([
  "contato_decisor",
  "apresentacao",
  "catalogo_enviado",
  "visita_agendada",
  "visita_realizada",
  "proposta_enviada",
  "negociacao",
  "compra_confirmada",
]);

export const CHAVE_METAS_CARTEIRA = "comercial_metas_carteira";

export type MetasCarteiraOp = {
  trabalhados: number;
  decisores: number;
  visitas: number;
  clientes_novos: number;
};

export const METAS_CARTEIRA_VAZIAS: MetasCarteiraOp = {
  trabalhados: 0,
  decisores: 0,
  visitas: 0,
  clientes_novos: 0,
};

export function parseMetasCarteira(raw: string | null | undefined, periodo: string): MetasCarteiraOp {
  try {
    const json = JSON.parse(String(raw || "{}")) as Record<string, Partial<MetasCarteiraOp>>;
    const m = json[periodo] || {};
    return {
      trabalhados: Number(m.trabalhados) || 0,
      decisores: Number(m.decisores) || 0,
      visitas: Number(m.visitas) || 0,
      clientes_novos: Number(m.clientes_novos) || 0,
    };
  } catch {
    return { ...METAS_CARTEIRA_VAZIAS };
  }
}

export function gravarMetasCarteira(
  raw: string | null | undefined,
  periodo: string,
  metas: MetasCarteiraOp
): string {
  let json: Record<string, MetasCarteiraOp> = {};
  try {
    json = JSON.parse(String(raw || "{}")) as Record<string, MetasCarteiraOp>;
  } catch {
    json = {};
  }
  json[periodo] = {
    trabalhados: Math.max(0, Number(metas.trabalhados) || 0),
    decisores: Math.max(0, Number(metas.decisores) || 0),
    visitas: Math.max(0, Number(metas.visitas) || 0),
    clientes_novos: Math.max(0, Number(metas.clientes_novos) || 0),
  };
  return JSON.stringify(json);
}

export function ymdDe(v: string | null | undefined) {
  if (!v) return null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return ymdSaoPaulo(d);
}

export function noIntervalo(iso: string | null | undefined, ini: string, fim: string) {
  if (!iso) return false;
  return iso >= ini && iso <= fim;
}

export function ehElegivel(lead: LeadCarteira) {
  return !FORA_PERFIL.has(perfilComercialLead(lead));
}

export function resultadoLead(lead: LeadCarteira) {
  return String(lead.resultado_atendimento || "") || (lead.status === "novo" ? "nao_abordado" : "");
}

export const DEFINICOES_CARTEIRA = [
  {
    termo: "Estoque vs período",
    texto: "Totais da carteira (não abordados, sem responsável) são fotografia de agora. Trabalhados, visitas e faturamento usam o mês selecionado.",
  },
  {
    termo: "Contato elegível",
    texto: "Fora do perfil e atividade encerrada saem do denominador de cobertura e conversão.",
  },
  {
    termo: "Taxa de contato efetivo",
    texto: "Contatos únicos com conversa no período / contatos únicos com tentativa no período. Tentativa ≠ conversa.",
  },
  {
    termo: "Cobertura da carteira",
    texto: "Elegíveis já trabalhados (resultado diferente de ainda não abordado) / elegíveis atribuídos a alguém.",
  },
  {
    termo: "Conversão de contatos",
    texto: "Clientes com primeiro pedido pago no mês / elegíveis trabalhados no mês. Pedido só conta se status pago/separação/despachado/entregue e com crm_lead_id.",
  },
  {
    termo: "Pedido sem vínculo",
    texto: "Pago no mês sem crm_lead_id entra em conciliação. Não soma faturamento da carteira.",
  },
];
