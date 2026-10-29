"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, Clock, Loader2, Save, X } from "lucide-react";
import { NOTIFICACOES_TAREFA, TIPO_TAREFA_LABEL, TIPOS_TAREFA, type TipoTarefa } from "@/lib/crmTarefas";

function hojeYmd() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function agoraHm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function CrmRegistrarTarefaModal({
  leadId,
  leadNome,
  tipoInicial,
  atividade,
  concluir,
  onClose,
  onSalvo,
}: {
  leadId?: string;
  leadNome?: string;
  tipoInicial?: TipoTarefa | null;
  atividade?: { id: string; tipo?: string; observacao?: string | null; agendada_em?: string };
  concluir?: boolean;
  onClose: () => void;
  onSalvo: (lead: any) => void;
}) {
  const [tipo, setTipo] = useState<TipoTarefa>((atividade?.tipo as TipoTarefa) || tipoInicial || "ligacao");
  const [data, setData] = useState(hojeYmd);
  const [hora, setHora] = useState(agoraHm);
  const [notificacao, setNotificacao] = useState("na_hora");
  const [observacao, setObservacao] = useState(atividade?.observacao || "");
  const [resultado, setResultado] = useState("");
  const [leadEscolhido, setLeadEscolhido] = useState(leadId || "");
  const [nomeLead, setNomeLead] = useState(leadNome || "");
  const [buscaLead, setBuscaLead] = useState("");
  const [opcoesLead, setOpcoesLead] = useState<{ id: string; nome: string; empresa?: string | null }[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [duplicado, setDuplicado] = useState<{ tipo_tarefa?: string; agendada_em?: string; conteudo?: string } | null>(null);

  useEffect(() => {
    if (!buscaLead.trim() || leadEscolhido) return;
    const t = setTimeout(() => {
      fetch(`/api/crm/tarefas?buscar_lead=${encodeURIComponent(buscaLead.trim())}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setOpcoesLead(d?.leads || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [buscaLead, leadEscolhido]);

  const titulo = useMemo(() => TIPO_TAREFA_LABEL[tipo] || "Atividade", [tipo]);

  async function salvar(forcar = false) {
    setSalvando(true);
    setErro("");
    try {
      if (!leadEscolhido) {
        setErro("Vincule um lead.");
        return;
      }
      if (atividade?.id) {
        const res = await fetch("/api/crm/tarefas", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            concluir
              ? { id: atividade.id, acao: "concluir", resultado }
              : { id: atividade.id, acao: "editar", tipo, data, hora, observacao }
          ),
        });
        const d = await res.json().catch(() => null);
        if (!res.ok || !d?.ok) {
          setErro(d?.error || "Não foi possível atualizar.");
          return;
        }
        onSalvo(d);
        return;
      }
      const res = await fetch("/api/crm/tarefas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadEscolhido,
          tipo,
          data,
          hora,
          notificacao,
          observacao,
          forcar,
        }),
      });
      const d = await res.json().catch(() => null);
      if (res.status === 409 && d?.duplicado) {
        setDuplicado(d.existente || {});
        return;
      }
      if (!res.ok || !d?.ok) {
        setErro(d?.error || "Não foi possível salvar a atividade.");
        return;
      }
      onSalvo(d.lead);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="font-black uppercase text-sm tracking-widest">Registrar atividade</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[280px]">
              {concluir ? "Concluir atividade" : nomeLead ? `Vinculada a ${nomeLead}` : "Escolha o lead"}
            </p>
          </div>
          <button type="button" onClick={onClose}><X size={18} className="text-zinc-500 hover:text-white" /></button>
        </div>

        <div className="p-5 space-y-4">
          {erro && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{erro}</p>}

          {!leadEscolhido && (
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Lead</label>
              <input value={buscaLead} onChange={(e) => setBuscaLead(e.target.value)} placeholder="Buscar salão ou contato" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white" />
              {opcoesLead.length > 0 && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-zinc-800">
                  {opcoesLead.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => { setLeadEscolhido(l.id); setNomeLead(l.nome); setOpcoesLead([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-800"
                    >
                      {l.nome}{l.empresa ? ` · ${l.empresa}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {concluir ? (
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Resultado da interação</label>
              <textarea value={resultado} onChange={(e) => setResultado(e.target.value)} rows={3} placeholder="O que aconteceu nesta atividade?" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white resize-none" />
            </div>
          ) : (
          <>
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Tipo</p>
            <div className="grid grid-cols-1 gap-1.5">
              {TIPOS_TAREFA.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`text-left px-3 py-2 rounded-xl text-sm border transition-colors ${
                    tipo === t.value
                      ? "border-[#C9A66B] bg-[#C9A66B]/10 text-[#C9A66B]"
                      : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Calendar size={11} /> Data
              </label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Clock size={11} /> Hora
              </label>
              <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Notificação</label>
            <select value={notificacao} onChange={(e) => setNotificacao(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white">
              {NOTIFICACOES_TAREFA.map((n) => (
                <option key={n.value} value={n.value}>{n.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Observações</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Ex.: Pediu para ligar no dia 6"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white resize-none"
            />
          </div>
          </>
          )}

          <button
            type="button"
            disabled={salvando}
            onClick={() => void salvar(false)}
            className="w-full h-11 rounded-xl bg-[#C9A66B] text-black font-black uppercase text-xs tracking-widest disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {concluir ? "Concluir" : `Salvar ${titulo}`}
          </button>
        </div>

        {duplicado && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 rounded-2xl">
            <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-5 max-w-sm w-full space-y-3">
              <div className="flex items-start gap-2 text-amber-300">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-black uppercase text-xs tracking-widest">Atividade já existe</p>
                  <p className="text-sm text-zinc-300 mt-1">
                    Este lead já tem {TIPO_TAREFA_LABEL[duplicado.tipo_tarefa || ""] || "uma atividade"}
                    {duplicado.agendada_em ? ` em ${new Date(duplicado.agendada_em).toLocaleString("pt-BR")}` : ""}.
                  </p>
                  {duplicado.conteudo && <p className="text-xs text-zinc-500 mt-1">{duplicado.conteudo}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDuplicado(null)} className="flex-1 h-10 rounded-xl border border-zinc-700 text-xs uppercase font-bold">
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => void salvar(true)}
                  className="flex-1 h-10 rounded-xl bg-[#C9A66B] text-black text-xs uppercase font-black disabled:opacity-50"
                >
                  Manter mesmo assim
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
