export const TIPOS_TAREFA = [
  { value: "ligacao", label: "Retorno ligação" },
  { value: "disponibilidade", label: "Verificar disponibilidade" },
  { value: "outro", label: "Outro" },
  { value: "visita", label: "Confirmar visita" },
  { value: "recebimento", label: "Confirmar recebimento" },
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
  dot: string;
  barra: string;
}[] = [
  { value: "sem", label: "Sem atividade", titulo: "Azul: ainda não tem atividade", dot: "bg-sky-500", barra: "border-l-sky-500" },
  { value: "inicial", label: "Inicial", titulo: "Cinza: atividade marcada, prazo ainda folgado", dot: "bg-zinc-400", barra: "border-l-zinc-400" },
  { value: "acabando", label: "Acabando", titulo: "Amarelo: o prazo acaba em até 24h", dot: "bg-amber-400", barra: "border-l-amber-400" },
  { value: "estourado", label: "Estourado", titulo: "Vermelho: o prazo estourou", dot: "bg-red-500", barra: "border-l-red-500" },
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

export function erroColunaTarefa(message: string) {
  if (/atividade_tipo|atividade_em|tipo_tarefa|agendada_em|concluida_em|notificacao/i.test(message)) {
    return "Rode supabase/crm_atividades_tarefas.sql no Supabase para agendar atividades no pipeline.";
  }
  return null;
}
