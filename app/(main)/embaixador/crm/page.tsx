"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import CrmFechamentoPedidoModal from "@/componentes/CrmFechamentoPedidoModal";
import ErroComVoltar from "@/componentes/ErroComVoltar";
import {
  Kanban, Plus, Loader2, Search, X, ChevronRight,
  Mail, Building2, Calendar, User, DollarSign,
  MessageCircle, Instagram, AlertCircle,
} from "lucide-react";

type Lead = {
  id: string;
  nome: string;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  instagram: string | null;
  cidade: string | null;
  estado: string | null;
  status: string;
  origem: string;
  valor_estimado: number | null;
  data_followup: string | null;
  notas: string | null;
  profile_id: string | null;
  order_id: string | null;
  updated_at: string;
};

const COLUNAS = [
  { key: "novo", label: "Novo", cor: "text-blue-400", bg: "bg-blue-500/10", borda: "border-blue-500/30" },
  { key: "contato_feito", label: "Contato", cor: "text-yellow-400", bg: "bg-yellow-500/10", borda: "border-yellow-500/30" },
  { key: "proposta", label: "Proposta", cor: "text-orange-400", bg: "bg-orange-500/10", borda: "border-orange-500/30" },
  { key: "negociacao", label: "Negociação", cor: "text-purple-400", bg: "bg-purple-500/10", borda: "border-purple-500/30" },
  { key: "fechado", label: "Fechado", cor: "text-green-400", bg: "bg-green-500/10", borda: "border-green-500/30" },
  { key: "perdido", label: "Perdido", cor: "text-red-400", bg: "bg-red-500/10", borda: "border-red-500/30" },
];

const ORIGENS = [
  { value: "indicacao", label: "Indicação" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "evento", label: "Evento" },
  { value: "outro", label: "Outro" },
];

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataFormatada(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

function followupAtrasado(data: string | null) {
  if (!data) return false;
  return new Date(data) < new Date(new Date().toDateString());
}

function LeadCard({
  lead,
  onMover,
  onNovoPedido,
  colunaAtual,
}: {
  lead: Lead;
  onMover: (id: string, novoStatus: string) => void;
  onNovoPedido?: (lead: Lead) => void;
  colunaAtual: (typeof COLUNAS)[0];
}) {
  const [movendo, setMovendo] = useState(false);
  const atrasado = followupAtrasado(lead.data_followup);
  const idx = COLUNAS.findIndex((c) => c.key === lead.status);
  const proxima = COLUNAS[idx + 1];
  const anterior = COLUNAS[idx - 1];

  async function mover(novoStatus: string) {
    setMovendo(true);
    await onMover(lead.id, novoStatus);
    setMovendo(false);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-purple-500/20 transition-all group relative">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/embaixador/crm/leads/${lead.id}`}
            className="text-sm font-black text-white leading-tight hover:text-purple-400 transition-colors truncate block"
          >
            {lead.nome}
          </Link>
          {lead.empresa && (
            <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
              <Building2 size={10} /> {lead.empresa}
            </p>
          )}
        </div>
        <Link
          href={`/embaixador/crm/leads/${lead.id}`}
          className="shrink-0 w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700"
        >
          <ChevronRight size={14} className="text-zinc-400" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {lead.telefone && (
          <a
            href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-lg"
          >
            <MessageCircle size={10} /> {lead.telefone}
          </a>
        )}
        {lead.email && (
          <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg truncate max-w-full">
            <Mail size={10} /> {lead.email}
          </span>
        )}
        {lead.instagram && (
          <a
            href={`https://instagram.com/${lead.instagram.replace(/^@/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-pink-400 bg-pink-500/10 px-2 py-1 rounded-lg"
          >
            <Instagram size={10} /> {lead.instagram}
          </a>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {lead.valor_estimado != null && lead.valor_estimado > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-purple-400 font-bold">
            <DollarSign size={10} /> {moeda(lead.valor_estimado)}
          </span>
        )}
        {lead.data_followup && (
          <span className={`flex items-center gap-1 text-[10px] font-bold ${atrasado ? "text-red-400" : "text-zinc-500"}`}>
            <Calendar size={10} /> {dataFormatada(lead.data_followup)}
            {atrasado && " ⚠️"}
          </span>
        )}
        {!lead.profile_id && (
          <span className="text-[9px] uppercase tracking-widest text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
            Sem app
          </span>
        )}
      </div>

      {(anterior || proxima || colunaAtual.key === "fechado") && (
        <div className="flex gap-2 pt-1 border-t border-zinc-800 flex-wrap">
          {colunaAtual.key === "fechado" && onNovoPedido && (
            <button
              type="button"
              onClick={() => onNovoPedido(lead)}
              className="w-full text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 py-1.5 rounded-lg hover:bg-purple-500/20"
            >
              + Novo pedido da rede
            </button>
          )}
          {anterior && (
            <button
              type="button"
              onClick={() => mover(anterior.key)}
              disabled={movendo}
              className="flex-1 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 py-1.5 rounded-lg bg-zinc-800/50 disabled:opacity-50"
            >
              ← {anterior.label}
            </button>
          )}
          {proxima && (
            <button
              type="button"
              onClick={() => mover(proxima.key)}
              disabled={movendo}
              className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1.5 rounded-lg disabled:opacity-50 ${proxima.cor} ${proxima.bg}`}
            >
              {proxima.label} →
            </button>
          )}
        </div>
      )}

      {movendo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
          <Loader2 size={18} className="animate-spin text-purple-400" />
        </div>
      )}
    </div>
  );
}

function ModalNovoLead({
  onClose,
  onSalvo,
}: {
  onClose: () => void;
  onSalvo: (lead: Lead) => void;
}) {
  const [form, setForm] = useState({
    nome: "", empresa: "", telefone: "", email: "",
    instagram: "", origem: "indicacao", valor_estimado: "",
    data_followup: "", notas: "", cidade: "", estado: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function salvar() {
    if (!form.nome.trim()) { setErro("Nome é obrigatório."); return; }
    setSalvando(true);
    setErro("");
    const res = await fetch("/api/embaixador/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado.replace(",", ".")) : null,
        data_followup: form.data_followup || null,
      }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) onSalvo(d.lead);
    else setErro(d?.error || "Erro ao salvar.");
    setSalvando(false);
  }

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-purple-500/20 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
          <div>
            <h2 className="font-black uppercase text-sm tracking-widest text-purple-400">Novo contato da rede</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">Cabeleireira ou futura embaixadora</p>
          </div>
          <button type="button" onClick={onClose}><X size={20} className="text-zinc-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          {erro && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertCircle size={16} /> {erro}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Nome *</label>
              <input value={form.nome} onChange={(e) => set("nome", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>WhatsApp</label>
              <input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>E-mail</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cidade</label>
              <input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>UF</label>
              <input value={form.estado} onChange={(e) => set("estado", e.target.value)} maxLength={2} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Origem</label>
              <select value={form.origem} onChange={(e) => set("origem", e.target.value)} className={inputClass}>
                {ORIGENS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Follow-up</label>
              <input type="date" value={form.data_followup} onChange={(e) => set("data_followup", e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Notas</label>
              <textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={2} className={`${inputClass} resize-none`} />
            </div>
          </div>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2"
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {salvando ? "Salvando..." : "Adicionar ao pipeline"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmbaixadoraCrmPipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState("");
  const [aviso, setAviso] = useState("");
  const [busca, setBusca] = useState("");
  const [modalNovo, setModalNovo] = useState(false);
  const [leadFechamento, setLeadFechamento] = useState<Lead | null>(null);
  const [modalPedidoKey, setModalPedidoKey] = useState(0);

  const carregar = useCallback(async () => {
    setErroCarregamento("");
    const params = new URLSearchParams();
    if (busca.trim()) params.set("q", busca.trim());
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/embaixador/crm/leads${qs}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErroCarregamento(data?.error || "Falha ao carregar leads.");
      setLoading(false);
      return;
    }
    setLeads(data.leads || []);
    setLoading(false);
  }, [busca]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => { void carregar(); }, busca ? 400 : 0);
    return () => clearTimeout(timer);
  }, [carregar, busca]);

  async function moverLead(id: string, novoStatus: string) {
    if (novoStatus === "fechado") {
      const lead = leads.find((l) => l.id === id);
      if (lead) abrirFechamentoPedido(lead);
      return;
    }
    const res = await fetch(`/api/embaixador/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: novoStatus } : l)));
      setAviso("");
    } else {
      setAviso(d?.error || "Não foi possível mover o lead.");
    }
  }

  function abrirFechamentoPedido(lead: Lead) {
    setAviso("");
    setModalPedidoKey((k) => k + 1);
    setLeadFechamento(lead);
  }

  const followupsHoje = leads.filter(
    (l) => l.data_followup && followupAtrasado(l.data_followup) && !["fechado", "perdido"].includes(l.status)
  ).length;

  return (
    <div className="-mx-4 md:-mx-6">
      <div className="px-4 md:px-6 pb-4 border-b border-purple-500/10 mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Kanban className="text-purple-400" size={24} />
            <div>
              <h1 className="text-xl font-black uppercase italic">
                Pipeline <span className="text-purple-400">da Rede</span>
              </h1>
              <p className="text-zinc-500 text-xs">
                {leads.length} contato(s)
                {followupsHoje > 0 && (
                  <span className="ml-2 text-red-400 font-bold">· {followupsHoje} follow-up(s) atrasado(s)</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-purple-500/50 w-40"
              />
            </div>
            <button
              type="button"
              onClick={() => setModalNovo(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase text-xs tracking-widest px-4 py-2.5 rounded-xl"
            >
              <Plus size={16} /> Novo contato
            </button>
          </div>
        </div>
      </div>

      {aviso && !loading && (
        <div className="px-4 md:px-6 pb-2">
          <ErroComVoltar compacto mensagem={aviso} onVoltar={() => setAviso("")} rotuloVoltar="Fechar" />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-400" size={32} />
        </div>
      ) : erroCarregamento ? (
        <div className="px-4 md:px-6 py-12">
          <ErroComVoltar
            mensagem={erroCarregamento}
            onVoltar={() => { setErroCarregamento(""); setLoading(true); void carregar(); }}
            onTentarNovamente={() => { setLoading(true); void carregar(); }}
          />
        </div>
      ) : (
        <div className="overflow-x-auto pb-8 px-4 md:px-6">
          <div className="flex gap-4 min-w-max">
            {COLUNAS.map((col) => {
              const leadsColuna = leads.filter((l) => l.status === col.key);
              return (
                <div key={col.key} className="flex flex-col w-72 shrink-0">
                  <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${col.bg} border ${col.borda} mb-3`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${col.cor}`}>{col.label}</span>
                    <span className={`text-xs font-black ${col.cor}`}>{leadsColuna.length}</span>
                  </div>
                  <div className="flex flex-col gap-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                    {leadsColuna.length === 0 ? (
                      <div className="h-24 rounded-2xl border border-dashed border-zinc-800 flex items-center justify-center text-zinc-700 text-xs">
                        Vazio
                      </div>
                    ) : (
                      leadsColuna.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onMover={moverLead}
                          onNovoPedido={abrirFechamentoPedido}
                          colunaAtual={col}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modalNovo && (
        <ModalNovoLead
          onClose={() => setModalNovo(false)}
          onSalvo={(lead) => { setLeads((p) => [lead, ...p]); setModalNovo(false); }}
        />
      )}

      {leadFechamento && (
        <CrmFechamentoPedidoModal
          key={modalPedidoKey}
          variant="embaixadora"
          apiBase="/api/embaixador/crm"
          lead={{
            id: leadFechamento.id,
            nome: leadFechamento.nome,
            email: leadFechamento.email,
            telefone: leadFechamento.telefone,
            cidade: leadFechamento.cidade,
            estado: leadFechamento.estado,
            profile_id: leadFechamento.profile_id,
          }}
          onClose={() => setLeadFechamento(null)}
          onConcluido={() => { setLeadFechamento(null); void carregar(); }}
          onNovaCompra={() => void carregar()}
        />
      )}
    </div>
  );
}
