"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import AdminSidebar from "@/componentes/AdminSidebar";
import CrmFechamentoPedidoModal from "@/componentes/CrmFechamentoPedidoModal";
import {
  Kanban, Plus, Loader2, Search, X, ChevronRight, ChevronDown,
  Mail, Building2, Calendar, User, DollarSign,
  MessageCircle, Instagram, AlertCircle, Filter,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────
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
  responsavel_id: string | null;
  profile_id: string | null;
  order_id: string | null;
  responsavel: { id: string; full_name: string; avatar_url?: string } | null;
  updated_at: string;
};

type Distribuidor = {
  id: string;
  full_name: string;
  avatar_url?: string;
};

type NovoLeadForm = {
  nome: string;
  empresa: string;
  telefone: string;
  email: string;
  instagram: string;
  origem: string;
  valor_estimado: string;
  data_followup: string;
  notas: string;
};

// ─── Colunas do Kanban ────────────────────────────────────
const COLUNAS = [
  { key: "novo",          label: "Novo Lead",       cor: "text-blue-400",    bg: "bg-blue-500/10",    borda: "border-blue-500/30"    },
  { key: "contato_feito", label: "Contato Feito",   cor: "text-yellow-400",  bg: "bg-yellow-500/10",  borda: "border-yellow-500/30"  },
  { key: "proposta",      label: "Proposta",         cor: "text-orange-400",  bg: "bg-orange-500/10",  borda: "border-orange-500/30"  },
  { key: "negociacao",    label: "Negociação",       cor: "text-purple-400",  bg: "bg-purple-500/10",  borda: "border-purple-500/30"  },
  { key: "fechado",       label: "Fechado",          cor: "text-green-400",   bg: "bg-green-500/10",   borda: "border-green-500/30"   },
  { key: "perdido",       label: "Perdido",          cor: "text-red-400",     bg: "bg-red-500/10",     borda: "border-red-500/30"     },
];

const ORIGENS = [
  { value: "manual",     label: "Manual" },
  { value: "indicacao",  label: "Indicação" },
  { value: "instagram",  label: "Instagram" },
  { value: "whatsapp",   label: "WhatsApp" },
  { value: "email",      label: "E-mail" },
  { value: "evento",     label: "Evento" },
  { value: "outro",      label: "Outro" },
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

function DropdownDistribuidor({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (id: string) => void;
  options: Distribuidor[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const label =
    options.find((d) => d.id === value)?.full_name || "Todos os distribuidores";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white hover:border-zinc-600 min-w-[200px] justify-between"
      >
        <span className="flex items-center gap-2 truncate">
          <Filter size={13} className="text-zinc-500 shrink-0" />
          <span className="truncate max-w-[160px]">{label}</span>
        </span>
        <ChevronDown size={14} className={`text-zinc-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-[200] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl min-w-full max-h-64 overflow-y-auto py-1">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800 transition-colors ${!value ? "text-[#C9A66B] font-bold" : "text-white"}`}
          >
            Todos os distribuidores
          </button>
          {options.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => { onChange(d.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-800 transition-colors truncate ${value === d.id ? "text-[#C9A66B] font-bold" : "text-white"}`}
            >
              {d.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Card do Lead ─────────────────────────────────────────
function LeadCard({
  lead,
  onMover,
  colunaAtual,
  mostrarDistribuidor = false,
}: {
  lead: Lead;
  onMover: (id: string, novoStatus: string) => void;
  colunaAtual: (typeof COLUNAS)[0];
  mostrarDistribuidor?: boolean;
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/admin/crm/leads/${lead.id}`}
            className="text-sm font-black text-white leading-tight hover:text-[#C9A66B] transition-colors truncate block"
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
          href={`/admin/crm/leads/${lead.id}`}
          className="shrink-0 w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700"
        >
          <ChevronRight size={14} className="text-zinc-400" />
        </Link>
      </div>

      {/* Contatos */}
      <div className="flex flex-wrap gap-2">
        {lead.telefone && (
          <a
            href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            <MessageCircle size={10} /> {lead.telefone}
          </a>
        )}
        {lead.instagram && (
          <a
            href={`https://instagram.com/${lead.instagram.replace(/^@/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-pink-400 bg-pink-500/10 px-2 py-1 rounded-lg hover:bg-pink-500/20 transition-colors"
          >
            <Instagram size={10} /> {lead.instagram}
          </a>
        )}
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <Mail size={10} /> {lead.email}
          </a>
        )}
      </div>

      {/* Infos */}
      <div className="flex items-center gap-3 flex-wrap">
        {lead.valor_estimado != null && lead.valor_estimado > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-[#C9A66B] font-bold">
            <DollarSign size={10} /> {moeda(lead.valor_estimado)}
          </span>
        )}
        {lead.data_followup && (
          <span className={`flex items-center gap-1 text-[10px] font-bold ${atrasado ? "text-red-400" : "text-zinc-500"}`}>
            <Calendar size={10} /> {dataFormatada(lead.data_followup)}
            {atrasado && " ⚠️"}
          </span>
        )}
        {lead.responsavel && (
          <span className={`flex items-center gap-1 text-[10px] font-bold ${mostrarDistribuidor ? "text-[#C9A66B] bg-[#C9A66B]/10 px-1.5 py-0.5 rounded-lg" : "text-zinc-600"}`}>
            <User size={10} /> {lead.responsavel.full_name.split(" ")[0]}
          </span>
        )}
      </div>

      {/* Ações de mover */}
      {(anterior || proxima) && (
        <div className="flex gap-2 pt-1 border-t border-zinc-800">
          {anterior && (
            <button
              onClick={() => mover(anterior.key)}
              disabled={movendo}
              className="flex-1 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              ← {anterior.label}
            </button>
          )}
          {proxima && (
            <button
              onClick={() => mover(proxima.key)}
              disabled={movendo}
              className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-all disabled:opacity-50 ${proxima.cor} ${proxima.bg} hover:opacity-80`}
            >
              {proxima.label} →
            </button>
          )}
        </div>
      )}

      {movendo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
          <Loader2 size={18} className="animate-spin text-[#C9A66B]" />
        </div>
      )}
    </div>
  );
}

// ─── Modal Novo Lead ──────────────────────────────────────
function ModalNovoLead({
  onClose,
  onSalvo,
}: {
  onClose: () => void;
  onSalvo: (lead: Lead) => void;
}) {
  const [form, setForm] = useState<NovoLeadForm>({
    nome: "", empresa: "", telefone: "", email: "",
    instagram: "", origem: "manual", valor_estimado: "",
    data_followup: "", notas: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const set = (k: keyof NovoLeadForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function salvar() {
    if (!form.nome.trim()) { setErro("Nome é obrigatório."); return; }
    setSalvando(true);
    setErro("");
    const res = await fetch("/api/admin/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado.replace(",", ".")) : null,
        data_followup: form.data_followup || null,
      }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      onSalvo(d.lead);
    } else {
      setErro(d?.error || "Erro ao salvar.");
    }
    setSalvando(false);
  }

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B] placeholder:text-zinc-700";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
          <div>
            <h2 className="font-black uppercase text-sm tracking-widest">Novo Lead</h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">Preencha os dados do contato</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-zinc-500 hover:text-white" /></button>
        </div>

        <div className="p-6 space-y-4">
          {erro && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertCircle size={16} /> {erro}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Nome *</label>
              <input value={form.nome} onChange={(e) => set("nome", e.target.value)} className={inputClass} placeholder="Nome do lead..." />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Empresa</label>
              <input value={form.empresa} onChange={(e) => set("empresa", e.target.value)} className={inputClass} placeholder="Nome da empresa..." />
            </div>
            <div>
              <label className={labelClass}>WhatsApp</label>
              <input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} className={inputClass} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className={labelClass}>Instagram</label>
              <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} className={inputClass} placeholder="@usuario" />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>E-mail</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className={labelClass}>Origem</label>
              <select value={form.origem} onChange={(e) => set("origem", e.target.value)} className={inputClass}>
                {ORIGENS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Valor Estimado (R$)</label>
              <input value={form.valor_estimado} onChange={(e) => set("valor_estimado", e.target.value)} className={inputClass} placeholder="0,00" />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Data do Follow-up</label>
              <input type="date" value={form.data_followup} onChange={(e) => set("data_followup", e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Notas iniciais</label>
              <textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Observações sobre o lead..." />
            </div>
          </div>

          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2"
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {salvando ? "Salvando..." : "Criar Lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────
export default function CrmKanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [modalNovo, setModalNovo] = useState(false);
  const [leadFechamento, setLeadFechamento] = useState<Lead | null>(null);

  // Filtro por distribuidor (só visível para ADMIN)
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);
  const [distribuidorSelecionado, setDistribuidorSelecionado] = useState("");

  // Carrega lista de distribuidores (só retorna dados se o user for ADMIN)
  useEffect(() => {
    fetch("/api/admin/crm/distribuidores", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d?.ok) setDistribuidores(d.distribuidores || []); })
      .catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setErro("");
    const params = new URLSearchParams();
    if (busca.trim()) params.set("q", busca.trim());
    if (distribuidorSelecionado) params.set("distribuidor_id", distribuidorSelecionado);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/admin/crm/leads${qs}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErro(data?.error || "Falha ao carregar leads.");
      setLoading(false);
      return;
    }
    setLeads(data.leads || []);
    setLoading(false);
  }, [busca, distribuidorSelecionado]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => carregar(), busca ? 400 : 0);
    return () => clearTimeout(timer);
  }, [carregar, busca]);

  async function moverLead(id: string, novoStatus: string) {
    if (novoStatus === "fechado") {
      const lead = leads.find((l) => l.id === id);
      if (lead) {
        if (lead.order_id) {
          setErro("Este lead já possui pedido vinculado.");
          return;
        }
        setLeadFechamento(lead);
      }
      return;
    }

    const res = await fetch(`/api/admin/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: novoStatus } : l))
      );
    }
  }

  function onPedidoConcluido(leadId: string) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, status: "fechado" } : l
      )
    );
    setLeadFechamento(null);
  }

  function onLeadSalvo(lead: Lead) {
    setLeads((prev) => [lead, ...prev]);
    setModalNovo(false);
  }

  const totalPorColuna = (key: string) => leads.filter((l) => l.status === key).length;
  const followupsHoje = leads.filter(
    (l) => l.data_followup && followupAtrasado(l.data_followup) && !["fechado", "perdido"].includes(l.status)
  ).length;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />

      <main className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-4 md:px-8 pt-4 md:pt-8 pb-4 border-b border-white/5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Kanban className="text-[#C9A66B]" size={26} />
              <div>
                <h1 className="text-2xl font-black uppercase italic">
                  CRM <span className="text-[#C9A66B]">Pipeline</span>
                </h1>
                <p className="text-zinc-500 text-xs">
                  {leads.length} lead(s) no funil
                  {followupsHoje > 0 && (
                    <span className="ml-2 text-red-400 font-bold">
                      · {followupsHoje} follow-up(s) em atraso
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              {/* Dropdown de distribuidor — só aparece para ADMIN (lista não vazia) */}
              {distribuidores.length > 0 && (
                <DropdownDistribuidor
                  value={distribuidorSelecionado}
                  onChange={setDistribuidorSelecionado}
                  options={distribuidores}
                />
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar lead..."
                  className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-[#C9A66B]/50 w-48"
                />
              </div>
              <button
                onClick={() => setModalNovo(true)}
                className="flex items-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black uppercase text-xs tracking-widest px-4 py-2.5 rounded-xl transition-all"
              >
                <Plus size={16} /> Novo Lead
              </button>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
          </div>
        ) : erro ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <AlertCircle className="text-red-400 mx-auto mb-3" size={32} />
              <p className="text-red-400 font-bold">{erro}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 p-4 md:p-6 h-full min-w-max">
              {COLUNAS.map((col) => {
                const leadsColuna = leads.filter((l) => l.status === col.key);
                return (
                  <div
                    key={col.key}
                    className="flex flex-col w-72 shrink-0 h-full"
                  >
                    {/* Header da coluna */}
                    <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${col.bg} border ${col.borda} mb-3 shrink-0`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${col.cor}`}>
                          {col.label}
                        </span>
                      </div>
                      <span className={`text-xs font-black tabular-nums ${col.cor}`}>
                        {leadsColuna.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pr-1">
                      {leadsColuna.length === 0 ? (
                        <div className="flex items-center justify-center h-24 rounded-2xl border border-dashed border-zinc-800 text-zinc-700 text-xs">
                          Vazio
                        </div>
                      ) : (
                        leadsColuna.map((lead) => (
                          <div key={lead.id} className="relative">
                            <LeadCard
                              lead={lead}
                              onMover={moverLead}
                              colunaAtual={col}
                              mostrarDistribuidor={distribuidores.length > 0}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {modalNovo && (
        <ModalNovoLead onClose={() => setModalNovo(false)} onSalvo={onLeadSalvo} />
      )}

      {leadFechamento && (
        <CrmFechamentoPedidoModal
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
          onConcluido={onPedidoConcluido}
        />
      )}
    </div>
  );
}
