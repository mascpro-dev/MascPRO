export const TIPOS_TAREFA = [
  { value: "ligacao", label: "Retorno ligação" },
  { value: "primeira_ligacao", label: "Primeira ligação" },
  { value: "followup", label: "Follow-up" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "proposta", label: "Envio de proposta" },
  { value: "reuniao", label: "Reunião" },
  { value: "email", label: "E-mail" },
  { value: "disponibilidade", label: "Verificar disponibilidade" },
  { value: "visita", label: "Confirmar visita" },
  { value: "recebimento", label: "Confirmar recebimento" },
  { value: "outro", label: "Outro" },
] as const;

export type TipoTarefa = (typeof TIPOS_TAREFA)[number]["value"];

export const TIPO_TAREFA_LABEL: Record<string, string> = Object.fromEntries(
  TIPOS_TAREFA.map((t) => [t.value, t.label])
);

export const NOTIFICACOES_TAREFA = [
  { value: "na_hora", label: "Na hora agendada" },
  { value: "15min", label: "15 min antes" },
  { value: "1hora", label: "1 hora antes" },
  { value: "1dia", label: "1 dia antes" },
] as const;

export type PrazoAtividade = "sem" | "inicial" | "acabando" | "estourado";

export const PRAZOS_ATIVIDADE: {
  value: PrazoAtividade;
  label: string;
  titulo: string;
  cor: string;
}[] = [
  { value: "sem", label: "Sem atividade", titulo: "Laranja: ainda não tem atividade", cor: "#E8923A" },
  { value: "inicial", label: "Inicial", titulo: "Cinza: atividade marcada, prazo ainda folgado", cor: "#C8C8C8" },
  { value: "acabando", label: "Acabando", titulo: "Azul: o prazo acaba em até 24h", cor: "#3DB8D0" },
  { value: "estourado", label: "Estourado", titulo: "Vermelho: o prazo estourou", cor: "#E2554A" },
];

const TIPO_SET = new Set<string>(TIPOS_TAREFA.map((t) => t.value));

export function parseTipoTarefa(v: unknown): TipoTarefa | null {
  const s = String(v || "").trim();
  return TIPO_SET.has(s) ? (s as TipoTarefa) : null;
}

export function prazoAtividade(em: string | null | undefined, agora = new Date()): PrazoAtividade {
  if (!em) return "sem";
  const t = new Date(em).getTime();
  if (Number.isNaN(t)) return "sem";
  if (t < agora.getTime()) return "estourado";
  const horas = (t - agora.getTime()) / 36e5;
  if (horas <= 24) return "acabando";
  return "inicial";
}

export function estiloPrazoCard(em: string | null | undefined) {
  const prazo = prazoAtividade(em);
  return PRAZOS_ATIVIDADE.find((p) => p.value === prazo) || PRAZOS_ATIVIDADE[0];
}

export function dataHoraTarefa(data: string, hora: string) {
  const d = String(data || "").trim();
  const h = String(hora || "").trim() || "09:00";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const iso = new Date(`${d}T${h.length === 5 ? `${h}:00` : h}`);
  if (Number.isNaN(iso.getTime())) return null;
  return iso.toISOString();
}

export function filtrarLeadsAtividade<
  T extends {
    atividade_tipo?: string | null;
    atividade_em?: string | null;
    data_followup?: string | null;
  },
>(leads: T[], filtroTipo: string | null, filtroPrazo: PrazoAtividade | null): T[] {
  return leads.filter((l) => {
    if (filtroTipo && String(l.atividade_tipo || "") !== filtroTipo) return false;
    if (filtroPrazo) {
      const p = prazoAtividade(l.atividade_em || l.data_followup);
      if (p !== filtroPrazo) return false;
    }
    return true;
  });
}

export type StatusAgenda = "hoje" | "planejada" | "concluida" | "atrasada" | "cancelada";

export function ymdLocal(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function statusAgenda(
  agendadaEm: string | null | undefined,
  concluidaEm?: string | null,
  canceladaEm?: string | null,
  agora = new Date()
): StatusAgenda {
  if (canceladaEm) return "cancelada";
  if (concluidaEm) return "concluida";
  if (!agendadaEm) return "planejada";
  const t = new Date(agendadaEm);
  if (Number.isNaN(t.getTime())) return "planejada";
  if (t.getTime() < agora.getTime()) return "atrasada";
  const mesmoDia =
    t.getFullYear() === agora.getFullYear() &&
    t.getMonth() === agora.getMonth() &&
    t.getDate() === agora.getDate();
  return mesmoDia ? "hoje" : "planejada";
}

export const STATUS_AGENDA_LABEL: Record<StatusAgenda, string> = {
  hoje: "Hoje",
  planejada: "Planejada",
  concluida: "Concluída",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};

export function periodoAgenda(periodo: string, de?: string | null, ate?: string | null) {
  const agora = new Date();
  const inicioDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const fimDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  if (periodo === "hoje") {
    return { de: inicioDia(agora).toISOString(), ate: fimDia(agora).toISOString() };
  }
  if (periodo === "semana") {
    const dow = agora.getDay();
    const seg = new Date(agora);
    seg.setDate(agora.getDate() - (dow === 0 ? 6 : dow - 1));
    const dom = new Date(seg);
    dom.setDate(seg.getDate() + 6);
    return { de: inicioDia(seg).toISOString(), ate: fimDia(dom).toISOString() };
  }
  if (periodo === "custom" && de && ate) {
    return { de: inicioDia(new Date(de + "T00:00:00")).toISOString(), ate: fimDia(new Date(ate + "T00:00:00")).toISOString() };
  }
  const mesDe = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const mesAte = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
  return { de: inicioDia(mesDe).toISOString(), ate: fimDia(mesAte).toISOString() };
}

export function erroColunaTarefa(message: string) {
  if (/atividade_tipo|atividade_em|tipo_tarefa|agendada_em|concluida_em|notificacao|cancelada_em|titulo|resultado/i.test(message)) {
    return "Rode supabase/crm_atividades_tarefas.sql no Supabase para agendar atividades no pipeline.";
  }
  return null;
}
