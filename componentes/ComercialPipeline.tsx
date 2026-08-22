"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, Plus, MessageCircle, X } from "lucide-react";
import CrmFechamentoPedidoModal from "@/componentes/CrmFechamentoPedidoModal";
import {
  COLUNAS_KANBAN_CRM,
  ORIGENS_LEAD,
  PERFIS_LEAD,
  INTERESSES_LEAD,
  LINHAS_PRODUTO,
  DORES_LEAD,
  LINHA_LABEL,
  PERFIL_LABEL,
  ORIGEM_LEAD_LABEL,
  DOR_LABEL,
  INTERESSE_LABEL,
  STATUS_LEAD_LABEL,
  statusContaFollowup,
} from "@/lib/comercialClassificacao";

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
  perfil: string | null;
  interesse: string | null;
  linha_interesse: string | null;
  dor: string | null;
  proximo_passo: string | null;
  profile_id: string | null;
  order_id: string | null;
  responsavel: { id: string; full_name: string } | null;
};

type Distribuidor = { id: string; full_name: string; role?: string | null };

const COL_TOM: Record<string, string> = {
  novo: "bg-[#F5EDDF] text-[#8A6A32]",
  contato_feito: "bg-[#F5EDDF] text-[#8A6A32]",
  qualificado: "bg-[#E7F0EA] text-[#4F7A5A]",
  diagnostico: "bg-[#F5EDDF] text-[#8A6A32]",
  proposta: "bg-[#F6EDE0] text-[#8A6A32]",
  negociacao: "bg-[#EEE8F4] text-[#5C4A72]",
  fechado: "bg-[#E7F0EA] text-[#4F7A5A]",
  perdido: "bg-[#F6E6E2] text-[#9A4338]",
  reativar: "bg-[#F6E6E2] text-[#9A4338]",
  nao_qualificado: "bg-[#F3EEE6] text-[#8A847A]",
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBr(d: string) {
  return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
}

function followupAtrasado(data: string | null) {
  if (!data) return false;
  return new Date(data) < new Date(new Date().toDateString());
}

function wa(tel: string | null) {
  const n = String(tel || "").replace(/\D/g, "");
  if (!n) return null;
  return `https://wa.me/${n.startsWith("55") ? n : `55${n}`}`;
}

const inputClass =
  "w-full h-10 px-3 rounded-xl border border-[#E7E1D6] bg-[#FBF9F6] text-[13px] text-[#2A2723] outline-none focus:border-[#C9A66B]";
const labelClass = "block text-[11px] uppercase tracking-[0.12em] text-[#A39C90] mb-1";

export default function ComercialPipeline() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [busca, setBusca] = useState("");
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);
  const [distribuidorId, setDistribuidorId] = useState("");
  const [aberto, setAberto] = useState<Lead | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [leadFechamento, setLeadFechamento] = useState<Lead | null>(null);
  const [modalKey, setModalKey] = useState(0);

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
    if (distribuidorId) params.set("distribuidor_id", distribuidorId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/admin/crm/leads${qs}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErro(data?.error || "Falha ao carregar o pipeline.");
      setLeads([]);
    } else {
      setLeads(data.leads || []);
    }
    setLoading(false);
  }, [busca, distribuidorId]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => void carregar(), busca ? 350 : 0);
    return () => clearTimeout(t);
  }, [carregar, busca]);

  async function mover(id: string, status: string) {
    if (status === "fechado") {
      const lead = leads.find((l) => l.id === id);
      if (lead) {
        setModalKey((k) => k + 1);
        setLeadFechamento(lead);
      }
      return;
    }
    const res = await fetch(`/api/admin/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      setAviso("");
    } else {
      setAviso(d?.error || "Não foi possível mover o lead.");
    }
  }

  const atrasados = leads.filter(
    (l) => l.data_followup && followupAtrasado(l.data_followup) && statusContaFollowup(l.status)
  ).length;

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A39C90]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar lead..."
            className={`${inputClass} pl-9`}
          />
        </div>
        {distribuidores.length > 0 && (
          <select value={distribuidorId} onChange={(e) => setDistribuidorId(e.target.value)} className={`${inputClass} w-auto min-w-[200px]`}>
            <option value="">Todos os responsáveis</option>
            {distribuidores.map((d) => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>
        )}
        <p className="text-[12px] text-[#8A847A]">
          {leads.length} lead(s)
          {atrasados > 0 && <span className="text-[#9A4338]"> · {atrasados} follow-up(s) atrasado(s)</span>}
        </p>
        <button
          type="button"
          onClick={() => setModalNovo(true)}
          className="ml-auto inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-[#2A2723] text-white text-[12px]"
        >
          <Plus size={14} /> Novo lead
        </button>
      </div>

      {aviso && <p className="text-[13px] text-[#9A4338]">{aviso}</p>}
      {erro && <p className="text-[13px] text-[#9A4338]">{erro}</p>}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#C9A66B]" size={28} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 h-full min-w-max pb-1">
            {COLUNAS_KANBAN_CRM.map((col) => {
              const lista = leads.filter((l) => l.status === col.key);
              const idx = COLUNAS_KANBAN_CRM.findIndex((c) => c.key === col.key);
              const prev = COLUNAS_KANBAN_CRM[idx - 1];
              const next = COLUNAS_KANBAN_CRM[idx + 1];
              return (
                <div key={col.key} className="w-[260px] shrink-0 flex flex-col h-full">
                  <div className={`flex items-center justify-between px-3 py-2 rounded-2xl mb-2 ${COL_TOM[col.key] || "bg-white"}`}>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{col.label}</span>
                    <span className="text-[12px] tabular-nums">{lista.length}</span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
                    {lista.length === 0 ? (
                      <div className="h-20 rounded-2xl border border-dashed border-[#E7E1D6] text-[12px] text-[#A39C90] flex items-center justify-center">
                        Vazio
                      </div>
                    ) : lista.map((lead) => {
                      const atrasado = followupAtrasado(lead.data_followup);
                      const w = wa(lead.telefone);
                      return (
                        <article key={lead.id} className="bg-white border border-[#E7E1D6] rounded-2xl p-3">
                          <button type="button" onClick={() => setAberto(lead)} className="w-full text-left">
                            <p className="text-[13px] font-semibold leading-tight">{lead.nome}</p>
                            {lead.empresa && <p className="text-[11px] text-[#8A847A] mt-0.5">{lead.empresa}</p>}
                            {(lead.perfil || lead.linha_interesse) && (
                              <p className="flex flex-wrap gap-1 mt-1.5">
                                {lead.perfil && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F5EDDF] text-[#8A6A32]">
                                    {PERFIL_LABEL[lead.perfil] || lead.perfil}
                                  </span>
                                )}
                                {lead.linha_interesse && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E7F0EA] text-[#4F7A5A]">
                                    {LINHA_LABEL[lead.linha_interesse] || lead.linha_interesse}
                                  </span>
                                )}
                              </p>
                            )}
                            <p className="text-[11px] text-[#8A847A] mt-1.5">
                              {lead.valor_estimado ? moeda(lead.valor_estimado) : "Sem valor"}
                              {lead.data_followup && (
                                <span className={atrasado ? " text-[#9A4338]" : ""}>
                                  {" · "}{dataBr(lead.data_followup)}{atrasado ? " atrasado" : ""}
                                </span>
                              )}
                            </p>
                            {lead.responsavel && (
                              <p className="text-[11px] text-[#A39C90] mt-0.5">{lead.responsavel.full_name}</p>
                            )}
                          </button>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {w && (
                              <a href={w} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#4F7A5A]">
                                <MessageCircle size={11} /> WhatsApp
                              </a>
                            )}
                            {prev && (
                              <button type="button" onClick={() => void mover(lead.id, prev.key)} className="text-[11px] text-[#8A847A]">
                                ← {prev.label}
                              </button>
                            )}
                            {next && (
                              <button type="button" onClick={() => void mover(lead.id, next.key)} className="ml-auto text-[11px] text-[#2A2723]">
                                {next.label} →
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {aberto && (
        <DetalheLead lead={aberto} onClose={() => setAberto(null)} />
      )}

      {modalNovo && (
        <NovoLead
          onClose={() => setModalNovo(false)}
          onSalvo={(lead) => {
            setLeads((prev) => [lead, ...prev]);
            setModalNovo(false);
          }}
        />
      )}

      {leadFechamento && (
        <CrmFechamentoPedidoModal
          key={modalKey}
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
        />
      )}
    </div>
  );
}

function DetalheLead({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [extra, setExtra] = useState<Lead | null>(null);
  const [atividades, setAtividades] = useState<{ id: string; created_at: string; conteudo: string }[]>([]);

  useEffect(() => {
    fetch(`/api/admin/crm/leads/${lead.id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setExtra(d.lead);
          setAtividades(d.atividades || []);
        }
      })
      .catch(() => {});
  }, [lead.id]);

  const l = extra || lead;
  const w = wa(l.telefone);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#2A2723]/25" onClick={onClose}>
      <aside
        className="w-full max-w-md h-full bg-[#FBF9F6] border-l border-[#E7E1D6] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className={`inline-flex text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${COL_TOM[l.status] || "bg-white"}`}>
              {STATUS_LEAD_LABEL[l.status] || l.status}
            </p>
            <h2 className="text-[18px] font-semibold mt-2">{l.nome}</h2>
            {l.empresa && <p className="text-[13px] text-[#8A847A]">{l.empresa}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[#8A847A]"><X size={18} /></button>
        </div>
        <dl className="space-y-2 text-[13px]">
          {l.telefone && <div><dt className="text-[11px] text-[#A39C90]">WhatsApp</dt><dd>{w ? <a href={w} className="text-[#4F7A5A]" target="_blank" rel="noopener noreferrer">{l.telefone}</a> : l.telefone}</dd></div>}
          {l.email && <div><dt className="text-[11px] text-[#A39C90]">E-mail</dt><dd>{l.email}</dd></div>}
          {l.instagram && <div><dt className="text-[11px] text-[#A39C90]">Instagram</dt><dd>{l.instagram}</dd></div>}
          {(l.cidade || l.estado) && <div><dt className="text-[11px] text-[#A39C90]">Cidade</dt><dd>{[l.cidade, l.estado].filter(Boolean).join(" · ")}</dd></div>}
          <div><dt className="text-[11px] text-[#A39C90]">Origem</dt><dd>{ORIGEM_LEAD_LABEL[l.origem] || l.origem}</dd></div>
          {l.perfil && <div><dt className="text-[11px] text-[#A39C90]">Perfil</dt><dd>{PERFIL_LABEL[l.perfil]}</dd></div>}
          {l.interesse && <div><dt className="text-[11px] text-[#A39C90]">Interesse</dt><dd>{INTERESSE_LABEL[l.interesse]}</dd></div>}
          {l.linha_interesse && <div><dt className="text-[11px] text-[#A39C90]">Linha</dt><dd>{LINHA_LABEL[l.linha_interesse]}</dd></div>}
          {l.dor && <div><dt className="text-[11px] text-[#A39C90]">Dor</dt><dd>{DOR_LABEL[l.dor]}</dd></div>}
          {l.valor_estimado != null && l.valor_estimado > 0 && <div><dt className="text-[11px] text-[#A39C90]">Valor estimado</dt><dd>{moeda(l.valor_estimado)}</dd></div>}
          {l.data_followup && <div><dt className="text-[11px] text-[#A39C90]">Follow-up</dt><dd>{dataBr(l.data_followup)}</dd></div>}
          {l.proximo_passo && <div><dt className="text-[11px] text-[#A39C90]">Próximo passo</dt><dd>{l.proximo_passo}</dd></div>}
          {l.notas && <div><dt className="text-[11px] text-[#A39C90]">Notas</dt><dd className="whitespace-pre-wrap">{l.notas}</dd></div>}
        </dl>
        {atividades.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90] mb-2">Histórico</p>
            <ul className="space-y-2">
              {atividades.slice(0, 12).map((a) => (
                <li key={a.id} className="text-[13px] border-b border-[#F0EBE3] pb-2">
                  <p>{a.conteudo}</p>
                  <p className="text-[11px] text-[#A39C90] mt-0.5">{new Date(a.created_at).toLocaleString("pt-BR")}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function NovoLead({ onClose, onSalvo }: { onClose: () => void; onSalvo: (lead: Lead) => void }) {
  const [form, setForm] = useState({
    nome: "", empresa: "", telefone: "", email: "", instagram: "",
    origem: "manual", valor_estimado: "", data_followup: "", notas: "",
    perfil: "", interesse: "", linha_interesse: "", dor: "", proximo_passo: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
    setSalvando(false);
    if (res.ok && d?.ok) onSalvo(d.lead);
    else setErro(d?.error || "Erro ao salvar.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A2723]/25 p-4">
      <div className="bg-white border border-[#E7E1D6] rounded-[22px] w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E1D6]">
          <h2 className="text-[15px] font-semibold">Novo lead</h2>
          <button type="button" onClick={onClose}><X size={18} className="text-[#8A847A]" /></button>
        </div>
        <div className="p-5 space-y-3">
          {erro && <p className="text-[13px] text-[#9A4338]">{erro}</p>}
          <div>
            <label className={labelClass}>Nome *</label>
            <input value={form.nome} onChange={(e) => set("nome", e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>WhatsApp</label>
              <input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Origem</label>
              <select value={form.origem} onChange={(e) => set("origem", e.target.value)} className={inputClass}>
                {ORIGENS_LEAD.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Perfil</label>
              <select value={form.perfil} onChange={(e) => set("perfil", e.target.value)} className={inputClass}>
                <option value="">Sem perfil</option>
                {PERFIS_LEAD.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Linha</label>
              <select value={form.linha_interesse} onChange={(e) => set("linha_interesse", e.target.value)} className={inputClass}>
                <option value="">Sem linha</option>
                {LINHAS_PRODUTO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Interesse</label>
              <select value={form.interesse} onChange={(e) => set("interesse", e.target.value)} className={inputClass}>
                <option value="">Sem interesse</option>
                {INTERESSES_LEAD.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Dor</label>
              <select value={form.dor} onChange={(e) => set("dor", e.target.value)} className={inputClass}>
                <option value="">Sem dor</option>
                {DORES_LEAD.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Follow-up</label>
              <input type="date" value={form.data_followup} onChange={(e) => set("data_followup", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Valor estimado</label>
              <input value={form.valor_estimado} onChange={(e) => set("valor_estimado", e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Próximo passo</label>
            <input value={form.proximo_passo} onChange={(e) => set("proximo_passo", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notas</label>
            <textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={2} className={`${inputClass} h-auto py-2`} />
          </div>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="w-full h-11 rounded-2xl bg-[#2A2723] text-white text-[13px] disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Criar lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
