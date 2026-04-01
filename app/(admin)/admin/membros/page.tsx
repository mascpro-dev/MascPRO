"use client";
import { useEffect, useState, useCallback } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import {
  Search, Users, Instagram, MessageCircle, Loader2,
  ShoppingBag, Pencil, X, Save, AlertCircle, CheckCircle, KeyRound,
} from "lucide-react";

type Membro = {
  id: string; full_name: string; email: string; whatsapp: string | null;
  instagram: string | null; role: string; city: string | null; state: string | null;
  created_at: string; indicado_por: string | null; moedas_pro_acumuladas: number;
  network_coins: number; total_compras_rede: number;
  indicador?: { full_name: string } | null;
  tem_compra?: boolean; nivel?: string | null;
};

const ROLES = ["CABELEIREIRO", "EMBAIXADOR", "DISTRIBUIDOR", "ADMIN"];
const NIVEIS = ["cabeleireiro", "embaixador", "distribuidor"];

export default function AdminMembrosPage() {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [filtrado, setFiltrado] = useState<Membro[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtroRole, setFiltroRole] = useState("todos");

  // Edit modal
  const [editando, setEditando] = useState<Membro | null>(null);
  const [form, setForm] = useState<any>({});
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{tipo: "ok"|"erro"; msg: string}|null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/admin/membros");
    const data = await res.json().catch(() => null);
    if (data?.ok) { setMembros(data.membros || []); setFiltrado(data.membros || []); }
    setLoading(false);
  }

  const filtrar = useCallback((termo: string, role: string) => {
    const t = termo.toLowerCase().trim();
    let lista = membros;
    if (role !== "todos") lista = lista.filter(m => m.role === role);
    if (t) lista = lista.filter(m =>
      m.full_name?.toLowerCase().includes(t) || m.email?.toLowerCase().includes(t) ||
      m.whatsapp?.includes(t) || m.instagram?.toLowerCase().includes(t)
    );
    setFiltrado(lista);
  }, [membros]);

  useEffect(() => { filtrar(busca, filtroRole); }, [busca, filtroRole, filtrar]);

  function abrirEditar(m: Membro) {
    setEditando(m);
    setForm({
      full_name: m.full_name || "", email: m.email || "",
      whatsapp: m.whatsapp || "", instagram: m.instagram || "",
      city: m.city || "", state: m.state || "",
      role: m.role || "CABELEIREIRO", nivel: m.nivel || "cabeleireiro",
      indicado_por: m.indicado_por || "", nova_senha: "",
    });
    setFeedback(null); setMostrarSenha(false);
  }

  async function salvar() {
    if (!editando) return;
    setSalvando(true); setFeedback(null);
    const body: any = { user_id: editando.id, ...form };
    if (!body.nova_senha) delete body.nova_senha;
    if (!body.indicado_por) body.indicado_por = null;

    const res = await fetch("/api/admin/membros/editar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      setFeedback({ tipo: "ok", msg: "Membro atualizado com sucesso!" });
      await carregar();
      setTimeout(() => setEditando(null), 1500);
    } else {
      setFeedback({ tipo: "erro", msg: d?.error || "Erro ao salvar." });
    }
    setSalvando(false);
  }

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
  const roles = ["todos", ...Array.from(new Set(membros.map(m => m.role).filter(Boolean)))];

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1";

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-[#C9A66B]" size={26} />
          <div>
            <h1 className="text-2xl font-black uppercase italic">Membros <span className="text-[#C9A66B]">da Rede</span></h1>
            <p className="text-zinc-500 text-xs">Busque, filtre e gerencie todos os membros</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input type="text" placeholder="Buscar por nome, e-mail, WhatsApp ou Instagram..." value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-[#C9A66B]/50" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {roles.map(r => (
              <button key={r} onClick={() => setFiltroRole(r)}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${filtroRole === r ? "bg-[#C9A66B] text-black border-[#C9A66B]" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"}`}>
                {r === "todos" ? `Todos (${membros.length})` : r}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-600 mb-4 font-bold">{filtrado.length} membro(s) encontrado(s)</p>

        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#C9A66B]" size={32} /></div>
        ) : filtrado.length === 0 ? (
          <p className="text-zinc-500 text-center mt-20">Nenhum membro encontrado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtrado.map(m => {
              const proTotal = (m.moedas_pro_acumuladas || 0) + (m.network_coins || 0);
              return (
                <div key={m.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 flex items-center justify-center font-black text-[#C9A66B] text-sm shrink-0">
                      {m.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">{m.full_name}</p>
                      <p className="text-[10px] text-zinc-500">{m.email}</p>
                      {m.indicador && <p className="text-[10px] text-zinc-600">Indicado por: <span className="text-zinc-400 font-bold">{m.indicador.full_name}</span></p>}
                      {(m.city || m.state) && <p className="text-[10px] text-zinc-600">{[m.city, m.state].filter(Boolean).join(" · ")}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-center">
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest">PRO</p>
                      <p className="text-sm font-black text-[#C9A66B]">{proTotal.toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Compras Rede</p>
                      <p className="text-sm font-black text-emerald-400">R$ {Number(m.total_compras_rede || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
                    </div>
                    <div className="flex gap-2">
                      {m.whatsapp ? <a href={`https://wa.me/55${m.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} className="text-green-400 hover:text-green-300" /></a> : <MessageCircle size={18} className="text-zinc-700" />}
                      {m.instagram ? <a href={`https://instagram.com/${m.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"><Instagram size={18} className="text-pink-400 hover:text-pink-300" /></a> : <Instagram size={18} className="text-zinc-700" />}
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{m.role}</span>
                    {m.tem_compra
                      ? <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 flex items-center gap-1"><ShoppingBag size={10} /> ATIVO</span>
                      : <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-zinc-900 text-zinc-600 border border-zinc-800">INATIVO</span>
                    }
                    <button onClick={() => abrirEditar(m)} className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-[#C9A66B] transition-all" title="Editar membro">
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL EDITAR */}
        {editando && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
                <div>
                  <h2 className="font-black uppercase text-sm tracking-widest">Editar Membro</h2>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{editando.full_name}</p>
                </div>
                <button onClick={() => setEditando(null)}><X size={20} className="text-zinc-500 hover:text-white" /></button>
              </div>
              <div className="p-6 space-y-4">
                {feedback && (
                  <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${feedback.tipo === "ok" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
                    {feedback.tipo === "ok" ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {feedback.msg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className={labelClass}>Nome Completo</label><input value={form.full_name} onChange={e => set("full_name", e.target.value)} className={inputClass} /></div>
                  <div className="col-span-2"><label className={labelClass}>E-mail (altera login)</label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>WhatsApp</label><input value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Instagram</label><input value={form.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@" className={inputClass} /></div>
                  <div><label className={labelClass}>Cidade</label><input value={form.city} onChange={e => set("city", e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Estado (UF)</label><input value={form.state} onChange={e => set("state", e.target.value)} maxLength={2} className={inputClass} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Nível / Role</label>
                    <select value={form.role} onChange={e => set("role", e.target.value)} className={inputClass}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Tabela de Preços</label>
                    <select value={form.nivel} onChange={e => set("nivel", e.target.value)} className={inputClass}>
                      {NIVEIS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>ID do Indicador (quem indicou)</label>
                  <input value={form.indicado_por} onChange={e => set("indicado_por", e.target.value)} placeholder="UUID do membro que indicou (ou vazio)" className={inputClass} />
                  {editando.indicador && <p className="text-[10px] text-zinc-600 mt-1">Atual: <span className="text-zinc-400">{editando.indicador.full_name}</span></p>}
                </div>

                <div className="bg-zinc-900 rounded-xl p-4">
                  <button onClick={() => setMostrarSenha(!mostrarSenha)} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-[#C9A66B] transition-colors">
                    <KeyRound size={13} /> {mostrarSenha ? "Ocultar" : "Alterar Senha"}
                  </button>
                  {mostrarSenha && (
                    <div className="mt-3">
                      <label className={labelClass}>Nova Senha (mín. 6 caracteres)</label>
                      <input type="password" value={form.nova_senha} onChange={e => set("nova_senha", e.target.value)} placeholder="Nova senha..." className={inputClass} />
                    </div>
                  )}
                </div>

                <button onClick={salvar} disabled={salvando} className="w-full bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2">
                  {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {salvando ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
