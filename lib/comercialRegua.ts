import { STATUS_PEDIDO_PAGO } from "@/lib/comercialMetricas";

export const ETAPAS_REGUA = [
  { value: "d7", label: "Dia 7", dias: 7, dica: "Começou a usar? Tem dúvida?" },
  { value: "d15", label: "Dia 15", dias: 15, dica: "Como está o cabelo? Precisa de ajuste?" },
  { value: "d30", label: "Dia 30", dias: 30, dica: "Hora de repor o kit." },
] as const;

export const JANELAS_RECOMPRA = [30, 45, 60] as const;

export const MOTIVOS_NAO_RECOMPRA = [
  { value: "so_usou", label: "Ainda está usando" },
  { value: "nao_gostou", label: "Não gostou" },
  { value: "preco", label: "Preço" },
  { value: "esqueceu", label: "Esqueceu" },
  { value: "comprou_outro", label: "Comprou outro" },
  { value: "sem_resposta", label: "Sem resposta" },
  { value: "outro", label: "Outro" },
] as const;

export const STATUS_ETAPA_REGUA = ["pendente", "feito", "atrasado", "pulado"] as const;

export type EtapaRegua = (typeof ETAPAS_REGUA)[number]["value"];
export type StatusEtapaRegua = (typeof STATUS_ETAPA_REGUA)[number];

export const ETAPA_LABEL: Record<string, string> = Object.fromEntries(
  ETAPAS_REGUA.map((e) => [e.value, e.label])
);

export const MOTIVO_LABEL: Record<string, string> = Object.fromEntries(
  MOTIVOS_NAO_RECOMPRA.map((m) => [m.value, m.label])
);

export const DEFINICOES_FASE3 = [
  {
    termo: "Home care (por item)",
    texto:
      "Pedido pago com pelo menos 1 item das linhas Daily, Nutri, Repair, Scalp, Curls ou Blond. Align³ e produto sem linha não entram. O pedido pode misturar profissional + home care.",
  },
  {
    termo: "Régua 7 / 15 / 30",
    texto: "Três toques depois da data do pedido que tem home care. Não dispara só em Align³ ou item sem linha.",
  },
  {
    termo: "Recompra 30 / 45 / 60",
    texto: "Outro pedido pago do mesmo perfil depois do home care, dentro da janela. Dois itens no mesmo pedido não contam.",
  },
  {
    termo: "Motivo de não recompra",
    texto: "Preenchido no pedido home care cuja janela de 60 dias já fechou sem segundo pedido.",
  },
];

export function ymdSaoPaulo(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function ymdDeIso(iso: string) {
  return ymdSaoPaulo(new Date(iso));
}

export function ymSaoPaulo(d = new Date()) {
  return ymdSaoPaulo(d).slice(0, 7);
}

export function parsePeriodoYm(raw: string | null | undefined, fallback = ymSaoPaulo()) {
  const s = String(raw || fallback).slice(0, 7);
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  if (!y || m < 1 || m > 12) return fallback;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Início e fim do mês civil em Brasília (sem horário de verão). */
export function boundsMesBrasil(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const ini = new Date(`${ym}-01T00:00:00.000-03:00`);
  const fim = new Date(`${ym}-${String(last).padStart(2, "0")}T23:59:59.999-03:00`);
  return { ini: ini.toISOString(), fim: fim.toISOString() };
}

export function labelMesYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function somarDiasYmd(ymd: string, dias: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

export function etapasParaPedido(createdAt: string) {
  const base = ymdDeIso(createdAt);
  return ETAPAS_REGUA.map((e) => ({
    etapa: e.value,
    previsto_em: somarDiasYmd(base, e.dias),
  }));
}

export function statusExibidoEtapa(status: string, previstoEm: string, hoje = ymdSaoPaulo()) {
  if (status === "pendente" && previstoEm < hoje) return "atrasado";
  return status;
}

export function parseMotivoNaoRecompra(v: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (v == null || v === "") return { ok: true, value: null };
  const s = String(v);
  if (MOTIVOS_NAO_RECOMPRA.some((m) => m.value === s)) return { ok: true, value: s };
  return { ok: false, error: "Motivo inválido." };
}

export function erroColunaFase3(message: string) {
  if (/column|does not exist|schema cache|PGRST204|comercial_regua/i.test(message)) {
    return "Rode supabase/comercial_fase3.sql no Supabase para habilitar a régua da fase 3.";
  }
  return message;
}

export function pedidoPodeSerKit(status: string) {
  return (STATUS_PEDIDO_PAGO as readonly string[]).includes(status);
}

export function recompraNaJanela(params: {
  kitEm: string;
  proximoPedidoEm: string | null;
  dias: number;
}) {
  if (!params.proximoPedidoEm) return false;
  const limite = somarDiasYmd(ymdDeIso(params.kitEm), params.dias);
  const prox = ymdDeIso(params.proximoPedidoEm);
  const kit = ymdDeIso(params.kitEm);
  return prox > kit && prox <= limite;
}

export function janelaFechada(kitEm: string, dias: number, hoje = ymdSaoPaulo()) {
  return somarDiasYmd(ymdDeIso(kitEm), dias) <= hoje;
}
