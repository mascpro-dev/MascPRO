import type { SemaforoComercial } from "@/lib/comercialMetricas";
import { STATUS_EXIGE_PROXIMO_PASSO, statusContaFollowup } from "@/lib/comercialClassificacao";
import { janelaFechada, ymdDeIso, ymdSaoPaulo } from "@/lib/comercialRegua";

export const DIAS_LEAD_PARADO = 7;
export const DIAS_PROPOSTA_PARADA = 7;
export const JANELA_RECOMPRA_ALARME = 60;

export const TIPOS_ALARME = [
  { value: "lead_parado", label: "Lead parado", destino: "pipeline" },
  { value: "proposta_parada", label: "Proposta parada", destino: "pipeline" },
  { value: "recompra_vencida", label: "Recompra vencida", destino: "homecare" },
  { value: "regua_atrasada", label: "Régua atrasada", destino: "homecare" },
  { value: "evento_sem_followup", label: "Evento sem follow-up", destino: "eventos" },
] as const;

export type TipoAlarme = (typeof TIPOS_ALARME)[number]["value"];
export type DestinoAlarme = (typeof TIPOS_ALARME)[number]["destino"];

export const TIPO_ALARME_LABEL: Record<string, string> = Object.fromEntries(
  TIPOS_ALARME.map((t) => [t.value, t.label])
);

export const TIPO_ALARME_DESTINO: Record<TipoAlarme, DestinoAlarme> = Object.fromEntries(
  TIPOS_ALARME.map((t) => [t.value, t.destino])
) as Record<TipoAlarme, DestinoAlarme>;

export const DEFINICOES_FASE6 = [
  {
    termo: "Alarme",
    texto: "Leitura do que já existe. Não é planilha paralela e não se apaga o fato.",
  },
  {
    termo: "Lead parado",
    texto: `Pipeline aberto (fora de proposta/negociação) com follow-up vencido, ou sem movimento há ${DIAS_LEAD_PARADO} dias.`,
  },
  {
    termo: "Proposta parada",
    texto: `Proposta ou negociação com follow-up vencido, sem próximo passo, ou parada há ${DIAS_PROPOSTA_PARADA} dias.`,
  },
  {
    termo: "Recompra vencida",
    texto: "Kit com janela de 60 dias fechada, sem segundo pedido pago e sem motivo de não recompra.",
  },
  {
    termo: "Régua atrasada",
    texto: "Toque D7, D15 ou D30 previsto e ainda pendente. Só kit marcado.",
  },
  {
    termo: "Evento sem follow-up",
    texto: "Data do calendário já passou e o resultado comercial não marcou follow-up.",
  },
];

export function diasEntre(a: string, b: string) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function ymdDeCampo(iso: string | null | undefined) {
  if (!iso) return null;
  const s = String(iso);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return ymdSaoPaulo(d);
}

export function followupVencido(dataFollowup: string | null | undefined, hoje = ymdSaoPaulo()) {
  const ymd = ymdDeCampo(dataFollowup);
  return Boolean(ymd && ymd < hoje);
}

export function diasParado(updatedAt: string | null | undefined, createdAt: string, hoje = ymdSaoPaulo()) {
  const base = ymdDeCampo(updatedAt) || ymdDeIso(createdAt);
  return Math.max(0, diasEntre(base, hoje));
}

export function ehProposta(status: string) {
  return (STATUS_EXIGE_PROXIMO_PASSO as readonly string[]).includes(status);
}

export function alarmeLead(params: {
  status: string;
  created_at: string;
  updated_at?: string | null;
  data_followup?: string | null;
  proximo_passo?: string | null;
  hoje?: string;
}): { tipo: "lead_parado" | "proposta_parada"; gravidade: SemaforoComercial; dias: number; detalhe: string } | null {
  if (!statusContaFollowup(params.status)) return null;
  const hoje = params.hoje || ymdSaoPaulo();
  const dias = diasParado(params.updated_at, params.created_at, hoje);
  const vencido = followupVencido(params.data_followup, hoje);
  const semPasso = !String(params.proximo_passo || "").trim() && !params.data_followup;

  if (ehProposta(params.status)) {
    const parada = vencido || semPasso || dias >= DIAS_PROPOSTA_PARADA;
    if (!parada) return null;
    const gravidade: SemaforoComercial = vencido || dias >= 14 ? "risco" : "atencao";
    const detalhe = vencido
      ? "Follow-up vencido"
      : semPasso
        ? "Sem follow-up nem próximo passo"
        : `Parada há ${dias} dias`;
    return { tipo: "proposta_parada", gravidade, dias, detalhe };
  }

  const parado = vencido || dias >= DIAS_LEAD_PARADO;
  if (!parado) return null;
  const gravidade: SemaforoComercial = vencido || dias >= 14 ? "risco" : "atencao";
  const detalhe = vencido ? "Follow-up vencido" : `Sem movimento há ${dias} dias`;
  return { tipo: "lead_parado", gravidade, dias, detalhe };
}

export function alarmeRecompra(params: {
  kitEm: string;
  proximoPedidoEm: string | null;
  motivo: string | null;
  hoje?: string;
}) {
  const hoje = params.hoje || ymdSaoPaulo();
  if (!janelaFechada(params.kitEm, JANELA_RECOMPRA_ALARME, hoje)) return null;
  if (params.proximoPedidoEm) return null;
  if (params.motivo) return null;
  const dias = diasEntre(ymdDeIso(params.kitEm), hoje);
  return {
    tipo: "recompra_vencida" as const,
    gravidade: "risco" as SemaforoComercial,
    dias,
    detalhe: `Janela de ${JANELA_RECOMPRA_ALARME} dias fechou sem segundo pedido`,
  };
}
