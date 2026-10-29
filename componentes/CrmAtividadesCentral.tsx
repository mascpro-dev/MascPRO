"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check, Loader2, Plus, Search, CalendarPlus, Ban, Pencil,
} from "lucide-react";
import {
  COLUNAS_KANBAN_CRM_SIMPLIFICADO,
  ORIGENS_LEAD,
  STATUS_LEAD_LABEL,
} from "@/lib/comercialClassificacao";
import {
  STATUS_AGENDA_LABEL,
  TIPOS_TAREFA,
  ymdLocal,
  type StatusAgenda,
} from "@/lib/crmTarefas";
import CrmRegistrarTarefaModal from "@/componentes/CrmRegistrarTarefaModal";
import ErroComVoltar from "@/componentes/ErroComVoltar";

type Atividade = {
  id: string;
  tipo: string;
  tipo_label: string;
  titulo: string;
  observacao: string | null;
  agendada_em: string;
  status: StatusAgenda;
  lead_id: string;
  lead_nome: string;
  lead_empresa: string | null;
  lead_status: string | null;
  responsavel_nome: string;
  resultado: string | null;
};

type LeadSem = {
  id: string;
  nome: string;
  empresa: string | null;
  telefone: string | null;
  status: string;
  origem: string | null;
  responsavel_nome: string;
};

const STATUS_CHIPS = [
  { value: "hoje", label: "Hoje", cor: "bg-orange-500/15 text-orange-300 border-orange-500/40" },
  { value: "planejadas", label: "Planejadas", cor: "bg-blue-500/15 text-blue-300 border-blue-500/40" },
  { value: "concluidas", label: "Concluídas", cor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  { value: "atrasadas", label: "Atrasadas", cor: "bg-red-500/15 text-red-300 border-red-500/40" },
];

const BADGE: Record<string, string> = {
  hoje: "bg-orange-500/15 text-orange-300",
  planejada: "bg-blue-500/15 text-blue-300",
  concluida: "bg-emerald-500/15 text-emerald-300",
  atrasada: "bg-red-500/15 text-red-300",
  cancelada: "bg-zinc-800 text-zinc-500",
};

function dataGrupo(iso: string) {
  const d = new Date(iso);
  const t = new Date();
  const ymd = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const label = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  if (ymd(d) === ymd(t)) return `Hoje · ${label}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function CrmAtividadesCentral({
  leadHref,
  podeFiltrarResponsavel = false,
}: {
  leadHref: (id: string) => string;
  podeFiltrarResponsavel?: boolean;
}) {
  const [aba, setAba] = useState<"minhas" | "sem">("minhas");
  const [status, setStatus] = useState("");
  const [tipo, setTipo] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [etapa, setEtapa] = useState("");
  const [origem, setOrigem] = useState("");
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState("mes");
  const [de, setDe] = useState(ymdLocal());
  const [ate, setAte] = useState(ymdLocal());
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [leadsSem, setLeadsSem] = useState<LeadSem[]>([]);
  const [indicadores, setIndicadores] = useState({ previstas: 0, concluidas: 0, hoje: 0, atrasadas: 0, percentual: 0 });
  const [responsaveis, setResponsaveis] = useState<{ id: string; full_name: string }[]>([]);
  const [modal, setModal] = useState<{ leadId?: string; leadNome?: string; atividade?: Atividade; concluir?: boolean } | null>(null);
  const [acaoId, setAcaoId] = useState("");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("aba", aba);
    if (status) p.set("status", status);
    if (tipo) p.set("tipo", tipo);
    if (responsavel) p.set("responsavel_id", responsavel);
    if (etapa) p.set("etapa", etapa);
    if (origem) p.set("origem", origem);
    if (busca.trim()) p.set("q", busca.trim());
    p.set("periodo", periodo);
    if (periodo === "custom") {
      p.set("de", de);
      p.set("ate", ate);
    }
    return p.toString();
  }, [aba, status, tipo, responsavel, etapa, origem, busca, periodo, de, ate]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    const res = await fetch(`/api/crm/tarefas?${qs}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) {
      setErro(d?.error || "Não foi possível carregar as atividades.");
      setLoading(false);
      return;
    }
    setAviso(d.aviso || "");
    setAtividades(d.atividades || []);
    setLeadsSem(d.leads || []);
    if (d.indicadores) setIndicadores(d.indicadores);
    if (d.responsaveis) setResponsaveis(d.responsaveis);
    setLoading(false);
  }, [qs]);

  useEffect(() => {
    const t = setTimeout(() => void carregar(), busca ? 350 : 0);
    return () => clearTimeout(t);
  }, [carregar, busca]);

  async function patch(id: string, body: Record<string, unknown>) {
    setAcaoId(id);
    const res = await fetch("/api/crm/tarefas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const d = await res.json().catch(() => null);
    setAcaoId("");
    if (!res.ok || !d?.ok) {
      setErro(d?.error || "Não foi possível atualizar.");
      return;
    }
    void carregar();
  }

  const grupos = useMemo(() => {
    const map = new Map<string, Atividade[]>();
    for (const a of atividades) {
      const k = a.agendada_em ? new Date(a.agendada_em).toDateString() : "sem";
      const arr = map.get(k) || [];
      arr.push(a);
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [atividades]);

  const input = "bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]/50";

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black uppercase italic">Atividades</h1>
          <p className="text-zinc-500 text-xs mt-0.5">O que fazer hoje e quais leads priorizar — o funil continua no pipeline.</p>
        </div>
        <button
          type="button"
          onClick={() => setModal({})}
          className="inline-flex items-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black uppercase text-xs tracking-widest px-4 py-2.5 rounded-xl"
        >
          <Plus size={16} /> Criar atividade
        </button>
      </div>

      <div className="flex gap-2 border-b border-white/5 pb-3">
        {([
          { k: "minhas" as const, l: "Minhas atividades" },
          { k: "sem" as const, l: "Leads sem atividades" },
        ]).map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setAba(t.k)}
            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest ${
              aba === t.k ? "bg-[#C9A66B]/15 text-[#C9A66B] border border-[#C9A66B]/30" : "text-zinc-500 border border-transparent"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {aba === "minhas" && STATUS_CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setStatus(status === c.value ? "" : c.value)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${status === c.value ? c.cor : "border-zinc-800 text-zinc-500"}`}
          >
            {c.label}
          </button>
        ))}
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={input}>
          <option value="">Tipo: todos</option>
          {TIPOS_TAREFA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {podeFiltrarResponsavel && (
          <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={input}>
            <option value="">Responsável: todos</option>
            {responsaveis.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        )}
        <select value={etapa} onChange={(e) => setEtapa(e.target.value)} className={input}>
          <option value="">Etapa: todas</option>
          {COLUNAS_KANBAN_CRM_SIMPLIFICADO.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        {aba === "sem" && (
          <select value={origem} onChange={(e) => setOrigem(e.target.value)} className={input}>
            <option value="">Origem: todas</option>
            {ORIGENS_LEAD.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar lead..." className={`${input} pl-8 w-44`} />
        </div>
        {aba === "minhas" && (
          <>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className={input}>
              <option value="hoje">Hoje</option>
              <option value="semana">Semana</option>
              <option value="mes">Mês atual</option>
              <option value="custom">Intervalo</option>
            </select>
            {periodo === "custom" && (
              <>
                <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className={input} />
                <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className={input} />
              </>
            )}
          </>
        )}
      </div>

      {aba === "minhas" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { l: "Previstas", v: indicadores.previstas, s: "" },
            { l: "Concluídas", v: indicadores.concluidas, s: `${indicadores.percentual}%` },
            { l: "Hoje", v: indicadores.hoje, s: "" },
            { l: "Atrasadas", v: indicadores.atrasadas, s: "" },
            { l: "Conclusão", v: `${indicadores.percentual}%`, s: `${indicadores.concluidas}/${indicadores.previstas}` },
          ].map((c) => (
            <div key={c.l} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{c.l}</p>
              <p className="text-2xl font-black tabular-nums">{c.v}</p>
              {c.s && <p className="text-[10px] text-zinc-500">{c.s}</p>}
            </div>
          ))}
        </div>
      )}

      {aviso && <p className="text-xs text-amber-400">{aviso}</p>}
      {erro && <ErroComVoltar compacto mensagem={erro} onVoltar={() => setErro("")} rotuloVoltar="Fechar" />}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C9A66B]" /></div>
      ) : aba === "sem" ? (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden">
          {leadsSem.length === 0 ? (
            <p className="text-center text-zinc-600 py-12 text-sm">Nenhum lead sem atividade futura.</p>
          ) : (
            <ul>
              {leadsSem.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/80 last:border-0">
                  <div className="min-w-0 flex-1">
                    <Link href={leadHref(l.id)} className="text-sm font-bold text-white hover:text-[#C9A66B] truncate block">{l.nome}</Link>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {[l.empresa, STATUS_LEAD_LABEL[l.status] || l.status, l.responsavel_nome].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModal({ leadId: l.id, leadNome: l.nome })}
                    className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#C9A66B] bg-[#C9A66B]/10 px-3 py-2 rounded-xl"
                  >
                    <CalendarPlus size={12} /> Agendar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.length === 0 && <p className="text-center text-zinc-600 py-12 text-sm">Nenhuma atividade neste recorte.</p>}
          {grupos.map(([dia, itens]) => (
            <section key={dia}>
              <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2">{dataGrupo(itens[0].agendada_em)}</h2>
              <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden">
                {itens.map((a) => (
                  <div key={a.id} className="grid grid-cols-[72px_1fr_auto] gap-3 px-4 py-3 border-b border-zinc-800/80 last:border-0 items-start">
                    <div className="text-sm font-black tabular-nums text-zinc-300 pt-0.5">
                      {a.agendada_em ? new Date(a.agendada_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{a.titulo}</p>
                      <Link href={leadHref(a.lead_id)} className="text-[12px] text-[#C9A66B] hover:underline truncate block">
                        {a.lead_nome}{a.lead_empresa ? ` · ${a.lead_empresa}` : ""}
                      </Link>
                      <p className="text-[11px] text-zinc-500">
                        {STATUS_LEAD_LABEL[a.lead_status || ""] || a.lead_status || "—"} · {a.responsavel_nome}
                      </p>
                      {a.observacao && <p className="text-[12px] text-zinc-400 mt-1 line-clamp-2">{a.observacao}</p>}
                      {a.resultado && <p className="text-[11px] text-emerald-400/80 mt-1">Resultado: {a.resultado}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${BADGE[a.status] || ""}`}>
                        {STATUS_AGENDA_LABEL[a.status]}
                      </span>
                      {a.status !== "concluida" && a.status !== "cancelada" && (
                        <div className="flex gap-1">
                          <button type="button" title="Concluir" disabled={acaoId === a.id} onClick={() => setModal({ leadId: a.lead_id, leadNome: a.lead_nome, atividade: a, concluir: true })} className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 inline-flex items-center justify-center">
                            <Check size={13} />
                          </button>
                          <button type="button" title="Reagendar" disabled={acaoId === a.id} onClick={() => setModal({ leadId: a.lead_id, leadNome: a.lead_nome, atividade: a })} className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 inline-flex items-center justify-center">
                            <Pencil size={12} />
                          </button>
                          <button type="button" title="Cancelar" disabled={acaoId === a.id} onClick={() => void patch(a.id, { acao: "cancelar" })} className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-500 inline-flex items-center justify-center">
                            {acaoId === a.id ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {modal && (
        <CrmRegistrarTarefaModal
          leadId={modal.leadId}
          leadNome={modal.leadNome}
          atividade={modal.atividade}
          concluir={modal.concluir}
          onClose={() => setModal(null)}
          onSalvo={() => {
            setModal(null);
            void carregar();
          }}
        />
      )}
    </div>
  );
}
