"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "@/componentes/AdminSidebar";
import CrmCadastrarMembroPanel from "@/componentes/CrmCadastrarMembroPanel";
import {
  ArrowLeft, Loader2, Pencil, Save, X, AlertCircle,
  CheckCircle, MessageCircle, Instagram, Mail, Building2,
  Calendar, User, DollarSign, MapPin, FileText,
  Tag, Trash2, MessageSquare, PhoneCall, Clock,
  Link2, ShoppingBag, Users, TrendingUp, AlertTriangle,
  Package, Star, Search,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────
type Atividade = {
  id: string;
  created_at: string;
  tipo: string;
  conteudo: string;
  status_anterior?: string;
  status_novo?: string;
  autor: { id: string; full_name: string; avatar_url?: string } | null;
};

type Cliente360 = {
  perfil: any;
  pedidos: any[];
  agendamentos: any[];
  rede: any[];
  resumo: {
    total_pedidos: number;
    total_comprado: number;
    ultima_compra: string | null;
    dias_sem_comprar: number | null;
    total_indicados: number;
    pro_total: number;
  };
};

type PerfilBusca = { id: string; full_name: string; email: string; whatsapp: string | null; role: string };

type Lead = {
  id: string;
  created_at: string;
  updated_at: string;
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
  responsavel: { id: string; full_name: string } | null;
  criador: { id: string; full_name: string } | null;
  profile_id: string | null;
  convertido_em: string | null;
};

// ─── Constantes ───────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; cor: string; bg: string; borda: string }> = {
  novo:          { label: "Novo Lead",     cor: "text-blue-400",   bg: "bg-blue-500/10",   borda: "border-blue-500/30"   },
  contato_feito: { label: "Contato Feito", cor: "text-yellow-400", bg: "bg-yellow-500/10", borda: "border-yellow-500/30" },
  proposta:      { label: "Proposta",       cor: "text-orange-400", bg: "bg-orange-500/10", borda: "border-orange-500/30" },
  negociacao:    { label: "Negociação",     cor: "text-purple-400", bg: "bg-purple-500/10", borda: "border-purple-500/30" },
  fechado:       { label: "Fechado",        cor: "text-green-400",  bg: "bg-green-500/10",  borda: "border-green-500/30"  },
  perdido:       { label: "Perdido",        cor: "text-red-400",    bg: "bg-red-500/10",    borda: "border-red-500/30"    },
};

const ORIGENS: Record<string, string> = {
  manual: "Manual", indicacao: "Indicação", instagram: "Instagram",
  whatsapp: "WhatsApp", email: "E-mail", evento: "Evento", outro: "Outro",
};

const TIPO_ATIVIDADE: Record<string, { icon: React.ReactNode; cor: string; label: string }> = {
  criacao:       { icon: <Tag size={13} />,         cor: "text-zinc-400",   label: "Criado"        },
  nota:          { icon: <FileText size={13} />,    cor: "text-blue-400",   label: "Nota"           },
  contato:       { icon: <PhoneCall size={13} />,   cor: "text-green-400",  label: "Contato"        },
  followup:      { icon: <Clock size={13} />,       cor: "text-yellow-400", label: "Follow-up"      },
  status_change: { icon: <Tag size={13} />,         cor: "text-[#C9A66B]",  label: "Status alterado"},
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataHora(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function dataSimples(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

// ─── Página ───────────────────────────────────────────────
export default function LeadDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  // Edição
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<any>({});
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);

  // Nova atividade
  const [novaAtv, setNovaAtv] = useState("");
  const [tipoAtv, setTipoAtv] = useState<"nota" | "contato" | "followup">("nota");
  const [adicionandoAtv, setAdicionandoAtv] = useState(false);

  // Confirmar exclusão
  const [excluindo, setExcluindo] = useState(false);
  const [viewerRole, setViewerRole] = useState("");

  // Jornada 360
  const [cliente360, setCliente360] = useState<Cliente360 | null>(null);
  const [loading360, setLoading360] = useState(false);
  const [tab, setTab] = useState<"crm" | "360">("crm");

  // Modal converter lead
  const [modalConverter, setModalConverter] = useState(false);
  const [buscaPerfil, setBuscaPerfil] = useState("");
  const [perfisEncontrados, setPerfisEncontrados] = useState<PerfilBusca[]>([]);
  const [buscandoPerfil, setBuscandoPerfil] = useState(false);
  const [convertendo, setConvertendo] = useState(false);
  const [cadastroCriado, setCadastroCriado] = useState(false);

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/admin/crm/leads/${id}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErro(data?.error || "Lead não encontrado.");
      setLoading(false);
      return;
    }
    setLead(data.lead);
    setAtividades(data.atividades || []);
    setViewerRole(String(data.viewer_role || "").toUpperCase());
    setLoading(false);
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  // Carrega 360 quando aba é ativada e lead tem profile_id
  useEffect(() => {
    if (tab !== "360" || !lead?.profile_id || cliente360) return;
    setLoading360(true);
    fetch(`/api/admin/crm/leads/${id}/cliente360`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d?.ok) setCliente360(d); })
      .finally(() => setLoading360(false));
  }, [tab, lead?.profile_id, cliente360, id]);

  // Busca perfis para converter
  useEffect(() => {
    if (!buscaPerfil.trim()) { setPerfisEncontrados([]); return; }
    const timer = setTimeout(async () => {
      setBuscandoPerfil(true);
      const res = await fetch(`/api/admin/crm/leads/${id}/converter?q=${encodeURIComponent(buscaPerfil)}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (d?.ok) setPerfisEncontrados(d.perfis || []);
      setBuscandoPerfil(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [buscaPerfil, id]);

  async function converterLead(profileId: string) {
    setConvertendo(true);
    const res = await fetch(`/api/admin/crm/leads/${id}/converter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      await carregar();
      setModalConverter(false);
      setCliente360(null);
      setTab("360");
    }
    setConvertendo(false);
  }

  function abrirEditar() {
    if (!lead) return;
    setForm({
      nome: lead.nome || "",
      empresa: lead.empresa || "",
      telefone: lead.telefone || "",
      email: lead.email || "",
      instagram: lead.instagram || "",
      cidade: lead.cidade || "",
      estado: lead.estado || "",
      status: lead.status || "novo",
      origem: lead.origem || "manual",
      valor_estimado: lead.valor_estimado != null ? String(lead.valor_estimado) : "",
      data_followup: lead.data_followup || "",
      notas: lead.notas || "",
    });
    setFeedback(null);
    setEditando(true);
  }

  async function salvar() {
    if (!form.nome?.trim()) { setFeedback({ tipo: "erro", msg: "Nome é obrigatório." }); return; }
    setSalvando(true);
    setFeedback(null);
    const body: any = { ...form };
    body.valor_estimado = form.valor_estimado ? parseFloat(String(form.valor_estimado).replace(",", ".")) : null;
    body.data_followup = form.data_followup || null;

    const res = await fetch(`/api/admin/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      setFeedback({ tipo: "ok", msg: "Salvo com sucesso!" });
      setLead(d.lead);
      await carregar();
      setTimeout(() => setEditando(false), 800);
    } else {
      setFeedback({ tipo: "erro", msg: d?.error || "Erro ao salvar." });
    }
    setSalvando(false);
  }

  async function adicionarAtividade() {
    if (!novaAtv.trim()) return;
    setAdicionandoAtv(true);
    const res = await fetch(`/api/admin/crm/leads/${id}/atividades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: tipoAtv, conteudo: novaAtv.trim() }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      setAtividades((prev) => [d.atividade, ...prev]);
      setNovaAtv("");
    }
    setAdicionandoAtv(false);
  }

  async function excluirLead() {
    if (viewerRole !== "ADMIN") return;
    if (!confirm("Excluir este lead permanentemente? Esta ação não pode ser desfeita.")) return;
    setExcluindo(true);
    const res = await fetch(`/api/admin/crm/leads/${id}`, { method: "DELETE" });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      router.push("/admin/crm");
    } else {
      alert(d?.error || "Não foi possível excluir o lead.");
      setExcluindo(false);
    }
  }

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B] placeholder:text-zinc-700";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1";

  if (loading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
        </main>
      </div>
    );
  }

  if (erro || !lead) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="text-red-400 mx-auto mb-3" size={32} />
            <p className="text-red-400 font-bold">{erro || "Lead não encontrado."}</p>
            <Link href="/admin/crm" className="text-[#C9A66B] text-sm mt-4 block hover:underline">
              ← Voltar ao CRM
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />

      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/admin/crm" className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
            <ArrowLeft size={14} /> CRM
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest truncate max-w-[200px]">{lead.nome}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── COLUNA ESQUERDA — Dados do Lead ─── */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            {/* Card principal */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h1 className="text-xl font-black text-white leading-tight truncate">{lead.nome}</h1>
                  {lead.empresa && (
                    <p className="text-sm text-zinc-400 flex items-center gap-1 mt-1">
                      <Building2 size={13} /> {lead.empresa}
                    </p>
                  )}
                </div>
                <button
                  onClick={abrirEditar}
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-[#C9A66B] transition-all"
                >
                  <Pencil size={15} />
                </button>
              </div>

              {/* Status badge */}
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest mb-5 ${statusCfg.bg} ${statusCfg.cor} border ${statusCfg.borda}`}>
                {statusCfg.label}
              </div>

              {/* Contatos */}
              <div className="space-y-2">
                {lead.telefone && (
                  <a href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors group">
                    <MessageCircle size={15} className="text-green-400 shrink-0" />
                    <span className="text-sm text-zinc-300 group-hover:text-white">{lead.telefone}</span>
                  </a>
                )}
                {lead.instagram && (
                  <a href={`https://instagram.com/${lead.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors group">
                    <Instagram size={15} className="text-pink-400 shrink-0" />
                    <span className="text-sm text-zinc-300 group-hover:text-white">{lead.instagram}</span>
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors group">
                    <Mail size={15} className="text-blue-400 shrink-0" />
                    <span className="text-sm text-zinc-300 group-hover:text-white truncate">{lead.email}</span>
                  </a>
                )}
                {(lead.cidade || lead.estado) && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800/50">
                    <MapPin size={15} className="text-zinc-500 shrink-0" />
                    <span className="text-sm text-zinc-400">{[lead.cidade, lead.estado].filter(Boolean).join(" · ")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detalhes financeiros e datas */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 space-y-3">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">Detalhes</p>

              {lead.valor_estimado != null && lead.valor_estimado > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 flex items-center gap-2"><DollarSign size={13} /> Valor Estimado</span>
                  <span className="text-sm font-black text-[#C9A66B]">{moeda(lead.valor_estimado)}</span>
                </div>
              )}
              {lead.data_followup && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 flex items-center gap-2"><Calendar size={13} /> Follow-up</span>
                  <span className="text-sm font-bold text-zinc-300">{dataSimples(lead.data_followup)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 flex items-center gap-2"><Tag size={13} /> Origem</span>
                <span className="text-sm text-zinc-400">{ORIGENS[lead.origem] || lead.origem}</span>
              </div>
              {lead.responsavel && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 flex items-center gap-2"><User size={13} /> Responsável</span>
                  <span className="text-sm text-zinc-300">{lead.responsavel.full_name}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-[10px] text-zinc-600">Criado em</span>
                <span className="text-[10px] text-zinc-600">{dataHora(lead.created_at)}</span>
              </div>
            </div>

            {/* Notas */}
            {lead.notas && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Notas</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{lead.notas}</p>
              </div>
            )}

            {/* Excluir — somente admin */}
            {viewerRole === "ADMIN" && (
              <button
                onClick={excluirLead}
                disabled={excluindo}
                className="flex items-center justify-center gap-2 text-red-500 hover:text-red-400 text-[11px] font-black uppercase tracking-widest py-2 rounded-xl border border-red-900/40 hover:border-red-800/60 bg-red-950/20 hover:bg-red-950/40 transition-all disabled:opacity-50"
              >
                {excluindo ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {excluindo ? "Excluindo..." : "Excluir Lead"}
              </button>
            )}
          </div>

          {/* ─── COLUNA DIREITA — Abas CRM / 360 ─── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setTab("crm")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === "crm" ? "bg-[#C9A66B] text-black" : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"}`}
              >
                <MessageSquare size={13} /> Jornada CRM
              </button>
              <button
                onClick={() => setTab("360")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === "360" ? "bg-[#C9A66B] text-black" : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"}`}
              >
                <TrendingUp size={13} /> Pós-Venda 360°
                {lead?.profile_id && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
              </button>
            </div>

            {tab === "360" && (
              <div className="flex flex-col gap-5">
                {!lead?.profile_id ? (
                  /* ─ Não vinculado ─ */
                  <div className="bg-zinc-900/50 border border-dashed border-zinc-700 rounded-2xl p-8 text-center">
                    <Link2 size={32} className="text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400 font-bold mb-1">Lead ainda não convertido</p>
                    <p className="text-zinc-600 text-xs mb-5">Vincule este lead a um perfil do MascPRO para acompanhar a jornada pós-venda.</p>
                    <button
                      onClick={() => { setCadastroCriado(false); setModalConverter(true); }}
                      className="inline-flex items-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black uppercase text-xs tracking-widest px-5 py-2.5 rounded-xl"
                    >
                      <Link2 size={14} /> Converter Lead
                    </button>
                  </div>
                ) : loading360 ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#C9A66B]" size={28} /></div>
                ) : cliente360 ? (
                  <>
                    {/* Resumo 360 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { label: "Total Comprado", value: cliente360.resumo.total_comprado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), cor: "text-[#C9A66B]" },
                        { label: "Pedidos", value: cliente360.resumo.total_pedidos, cor: "text-white" },
                        { label: "PRO Score", value: (cliente360.resumo.pro_total || 0).toLocaleString("pt-BR"), cor: "text-yellow-400" },
                        { label: "Indicados", value: cliente360.resumo.total_indicados, cor: "text-blue-400" },
                        {
                          label: "Última Compra",
                          value: cliente360.resumo.ultima_compra
                            ? `${cliente360.resumo.dias_sem_comprar}d atrás`
                            : "Nenhuma",
                          cor: (cliente360.resumo.dias_sem_comprar || 0) > 30 ? "text-red-400" : "text-green-400",
                        },
                        { label: "Membro desde", value: cliente360.perfil ? new Date(cliente360.perfil.created_at).toLocaleDateString("pt-BR") : "—", cor: "text-zinc-400" },
                      ].map((card) => (
                        <div key={card.label} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">{card.label}</p>
                          <p className={`text-lg font-black leading-tight ${card.cor}`}>{card.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Alerta de risco */}
                    {(cliente360.resumo.dias_sem_comprar || 0) > 30 && (
                      <div className="flex items-center gap-3 bg-red-950/30 border border-red-800/40 rounded-2xl px-5 py-3">
                        <AlertTriangle size={16} className="text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm font-bold">
                          Cliente sem comprar há {cliente360.resumo.dias_sem_comprar} dias — considere um follow-up de retenção.
                        </p>
                      </div>
                    )}

                    {/* Últimos pedidos */}
                    {cliente360.pedidos.length > 0 && (
                      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Pedidos na Loja</p>
                        <div className="flex flex-col gap-2">
                          {cliente360.pedidos.map((p: any) => {
                            const STATUS_COR: Record<string, string> = {
                              paid: "text-blue-400", separacao: "text-yellow-400",
                              despachado: "text-emerald-400", entregue: "text-green-300",
                              pending: "text-zinc-500", cancelled: "text-red-400",
                            };
                            return (
                              <div key={p.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-900/20 flex items-center justify-center shrink-0">
                                    <ShoppingBag size={13} className="text-blue-400" />
                                  </div>
                                  <div>
                                    <p className={`text-[10px] font-black uppercase ${STATUS_COR[p.status] || "text-zinc-400"}`}>{p.status}</p>
                                    <p className="text-[10px] text-zinc-600">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                                    {p.itens?.length > 0 && (
                                      <p className="text-[10px] text-zinc-500">{p.itens.map((i: any) => i.titulo).join(", ")}</p>
                                    )}
                                  </div>
                                </div>
                                <span className="text-sm font-black text-white">
                                  {Number(p.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Rede do cliente */}
                    {cliente360.rede.length > 0 && (
                      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">
                          Rede Indicada ({cliente360.rede.length})
                        </p>
                        <div className="flex flex-col gap-2">
                          {cliente360.rede.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-zinc-800 last:border-0">
                              <div>
                                <p className="text-xs font-bold text-white">{m.full_name}</p>
                                <p className="text-[10px] text-zinc-500">{m.email}</p>
                              </div>
                              <span className="text-[9px] font-black uppercase text-zinc-600 bg-zinc-800 px-2 py-1 rounded-lg">{m.role}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}

            {tab === "crm" && (
              <>
                {/* Adicionar atividade */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">Registrar Atividade</p>

              {/* Tipo de atividade */}
              <div className="flex gap-2 mb-3">
                {(["nota", "contato", "followup"] as const).map((t) => {
                  const configs = {
                    nota:     { label: "Nota",     icon: <FileText size={12} />,  cor: "text-blue-400",   bg: "bg-blue-500/10",   borda: "border-blue-500/30"   },
                    contato:  { label: "Contato",  icon: <PhoneCall size={12} />, cor: "text-green-400",  bg: "bg-green-500/10",  borda: "border-green-500/30"  },
                    followup: { label: "Follow-up",icon: <Clock size={12} />,     cor: "text-yellow-400", bg: "bg-yellow-500/10", borda: "border-yellow-500/30" },
                  };
                  const c = configs[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setTipoAtv(t)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${tipoAtv === t ? `${c.cor} ${c.bg} ${c.borda}` : "text-zinc-600 border-zinc-800 hover:border-zinc-700"}`}
                    >
                      {c.icon} {c.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <textarea
                  value={novaAtv}
                  onChange={(e) => setNovaAtv(e.target.value)}
                  placeholder="Descreva o que aconteceu..."
                  rows={2}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B] placeholder:text-zinc-700 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) adicionarAtividade();
                  }}
                />
                <button
                  onClick={adicionarAtividade}
                  disabled={adicionandoAtv || !novaAtv.trim()}
                  className="px-4 bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-40 text-black font-black rounded-xl transition-all self-stretch"
                >
                  {adicionandoAtv ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                </button>
              </div>
              <p className="text-[9px] text-zinc-700 mt-1">Ctrl+Enter para enviar</p>
            </div>

            {/* Timeline de atividades */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">
                Histórico ({atividades.length})
              </p>

              {atividades.length === 0 ? (
                <p className="text-zinc-600 text-sm text-center py-6">Nenhuma atividade registrada.</p>
              ) : (
                <div className="flex flex-col">
                  {atividades.map((atv, idx) => {
                    const cfg = TIPO_ATIVIDADE[atv.tipo] || TIPO_ATIVIDADE.nota;
                    return (
                      <div key={atv.id} className="flex gap-3">
                        {/* Linha do tempo */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${cfg.cor} bg-zinc-800 shrink-0`}>
                            {cfg.icon}
                          </div>
                          {idx < atividades.length - 1 && (
                            <div className="w-px flex-1 bg-zinc-800 my-1" />
                          )}
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0 pb-5">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.cor}`}>
                              {cfg.label}
                            </span>
                            {atv.autor && (
                              <span className="text-[10px] text-zinc-600">
                                por {atv.autor.full_name.split(" ")[0]}
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-700 ml-auto">
                              {dataHora(atv.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{atv.conteudo}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
              </>
            )}

          </div>
        </div>
      </main>

      {/* ─── Modal Converter Lead ─── */}
      {modalConverter && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
              <div>
                <h2 className="font-black uppercase text-sm tracking-widest">Converter Lead</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Vincule a um membro do MascPRO</p>
              </div>
              <button onClick={() => setModalConverter(false)}><X size={20} className="text-zinc-500 hover:text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                <input
                  type="text"
                  value={buscaPerfil}
                  onChange={(e) => setBuscaPerfil(e.target.value)}
                  placeholder="Buscar por nome, e-mail ou WhatsApp..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none focus:border-[#C9A66B]/50"
                  autoFocus
                />
              </div>

              {buscandoPerfil && (
                <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-[#C9A66B]" /></div>
              )}

              {!buscandoPerfil && perfisEncontrados.length > 0 && (
                <div className="flex flex-col gap-2">
                  {perfisEncontrados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => converterLead(p.id)}
                      disabled={convertendo}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-[#C9A66B]/50 transition-all text-left disabled:opacity-50"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{p.full_name}</p>
                        <p className="text-[10px] text-zinc-500">{p.email}</p>
                        {p.whatsapp && <p className="text-[10px] text-zinc-600">{p.whatsapp}</p>}
                      </div>
                      <span className="text-[9px] font-black uppercase text-zinc-600 bg-zinc-800 px-2 py-1 rounded-lg shrink-0 ml-2">{p.role}</span>
                    </button>
                  ))}
                </div>
              )}

              {!buscandoPerfil && buscaPerfil.trim() && perfisEncontrados.length === 0 && (
                <p className="text-zinc-600 text-sm text-center py-2">Nenhum membro encontrado.</p>
              )}

              {!buscaPerfil.trim() && (
                <p className="text-zinc-600 text-xs text-center py-2">Digite o nome ou contato do membro para buscar.</p>
              )}

              {!lead.profile_id && (
                <CrmCadastrarMembroPanel
                  leadId={id}
                  nome={lead?.nome || ""}
                  emailInicial={lead?.email}
                  jaTemCadastro={Boolean(lead?.profile_id) || cadastroCriado}
                  onCadastrado={() => {
                    setCadastroCriado(true);
                    void carregar();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal de Edição ─── */}
      {editando && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
              <div>
                <h2 className="font-black uppercase text-sm tracking-widest">Editar Lead</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">{lead.nome}</p>
              </div>
              <button onClick={() => setEditando(false)}><X size={20} className="text-zinc-500 hover:text-white" /></button>
            </div>

            <div className="p-6 space-y-4">
              {feedback && (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${feedback.tipo === "ok" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
                  {feedback.tipo === "ok" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {feedback.msg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelClass}>Nome *</label>
                  <input value={form.nome} onChange={(e) => setForm((f: any) => ({ ...f, nome: e.target.value }))} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Empresa</label>
                  <input value={form.empresa} onChange={(e) => setForm((f: any) => ({ ...f, empresa: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>WhatsApp</label>
                  <input value={form.telefone} onChange={(e) => setForm((f: any) => ({ ...f, telefone: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Instagram</label>
                  <input value={form.instagram} onChange={(e) => setForm((f: any) => ({ ...f, instagram: e.target.value }))} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>E-mail</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Cidade</label>
                  <input value={form.cidade} onChange={(e) => setForm((f: any) => ({ ...f, cidade: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Estado (UF)</label>
                  <input value={form.estado} onChange={(e) => setForm((f: any) => ({ ...f, estado: e.target.value }))} maxLength={2} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={form.status} onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))} className={inputClass}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Origem</label>
                  <select value={form.origem} onChange={(e) => setForm((f: any) => ({ ...f, origem: e.target.value }))} className={inputClass}>
                    {Object.entries(ORIGENS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Valor Estimado (R$)</label>
                  <input value={form.valor_estimado} onChange={(e) => setForm((f: any) => ({ ...f, valor_estimado: e.target.value }))} className={inputClass} placeholder="0,00" />
                </div>
                <div>
                  <label className={labelClass}>Data Follow-up</label>
                  <input type="date" value={form.data_followup} onChange={(e) => setForm((f: any) => ({ ...f, data_followup: e.target.value }))} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Notas</label>
                  <textarea value={form.notas} onChange={(e) => setForm((f: any) => ({ ...f, notas: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
                </div>
              </div>

              <button
                onClick={salvar}
                disabled={salvando}
                className="w-full bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2"
              >
                {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {salvando ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
