"use client";
import { useEffect, useState, useCallback } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import AdminMemberAvatar from "@/componentes/AdminMemberAvatar";
import {
  Search, Users, Instagram, MessageCircle, Loader2,
  ShoppingBag, Pencil, X, Save, AlertCircle, CheckCircle, KeyRound, Link2, Copy,
} from "lucide-react";

type Membro = {
  id: string; full_name: string; email: string; whatsapp: string | null;
  avatar_url?: string | null;
  instagram: string | null; role: string; city: string | null; state: string | null;
  created_at: string; indicado_por: string | null; moedas_pro_acumuladas: number;
  network_coins: number; total_compras_rede: number;
  indicador?: { full_name: string } | null;
  tem_compra?: boolean; nivel?: string | null;
};

/** value = gravado em profiles.role; label = exibicao */
const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "CABELEIREIRO", label: "CABELEIREIRO" },
  { value: "EMBAIXADOR", label: "EMBAIXADOR" },
  { value: "EDUCADOR_TECNICO", label: "EDUCADOR TÉCNICO" },
  { value: "DISTRIBUIDOR", label: "DISTRIBUIDOR" },
  { value: "ADMIN", label: "ADMIN" },
];

function labelRole(v: string) {
  return ROLE_OPTIONS.find((r) => r.value === v)?.label ?? v;
}

// Quando muda o role, sincroniza o nivel automaticamente (tabela da loja)
function roleParaNivel(role: string): string {
  const m: Record<string, string> = {
    CABELEIREIRO: "cabeleireiro",
    EMBAIXADOR: "embaixador",
    EDUCADOR_TECNICO: "educador_tecnico",
    DISTRIBUIDOR: "distribuidor",
    ADMIN: "cabeleireiro",
  };
  return m[role] || "cabeleireiro";
}

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://mascpro.com.br";

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
  const [linkCopiado, setLinkCopiado] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/admin/membros");
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      const sorted = (data.membros || []).sort((a: Membro, b: Membro) =>
        ((b.moedas_pro_acumuladas || 0) + (b.network_coins || 0)) -
        ((a.moedas_pro_acumuladas || 0) + (a.network_coins || 0))
      );
      setMembros(sorted);
      setFiltrado(sorted);
    }
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
      role: m.role || "CABELEIREIRO",
      indicado_por: m.indicado_por || "", nova_senha: "",
    });
    setFeedback(null); setMostrarSenha(false); setLinkCopiado(false);
  }

  async function salvar() {
    if (!editando) return;
    setSalvando(true); setFeedback(null);
    const body: any = {
      user_id: editando.id,
      ...form,
      nivel: roleParaNivel(form.role),
    };
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
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">
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
                {r === "todos" ? `Todos (${membros.length})` : labelRole(r)}
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
          <div className="flex flex-col gap-2">
            <div className="hidden lg:grid lg:grid-cols-[2rem_2.75rem_minmax(12rem,1fr)_4.75rem_6.25rem_4rem_9.5rem_2.75rem] lg:items-center lg:gap-x-4 lg:px-4 lg:pb-2 lg:pt-1 text-[9px] font-black uppercase tracking-widest text-zinc-600 border-b border-zinc-800/80">
              <span className="text-right tabular-nums">#</span>
              <span aria-hidden className="block min-w-[2.75rem]" />
              <span>Membro</span>
              <span className="text-right">PRO</span>
              <span className="text-right">Compras rede</span>
              <span className="text-center">Redes</span>
              <span className="text-center">Função / status</span>
              <span className="sr-only">Editar</span>
            </div>

            {filtrado.map((m, idx) => {
              const proTotal = (m.moedas_pro_acumuladas || 0) + (m.network_coins || 0);
              const redeFmt = `R$ ${Number(m.total_compras_rede || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

              const blocoMembro = (
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-bold leading-snug text-white">{m.full_name}</p>
                  <p className="truncate text-[11px] leading-relaxed text-zinc-500">{m.email}</p>
                  {m.indicador ? (
                    <p className="text-[10px] leading-relaxed text-zinc-600">
                      Indicado por <span className="font-semibold text-zinc-400">{m.indicador.full_name}</span>
                    </p>
                  ) : null}
                  {(m.city || m.state) ? (
                    <p className="text-[10px] leading-relaxed text-zinc-600">
                      {[m.city, m.state].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
              );

              const icones = (
                <div className="flex items-center justify-center gap-1">
                  {m.whatsapp ? (
                    <a
                      href={`https://wa.me/55${m.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-1.5 text-green-400 transition-colors hover:bg-green-500/10 hover:text-green-300"
                      aria-label="WhatsApp"
                    >
                      <MessageCircle size={18} />
                    </a>
                  ) : (
                    <span className="rounded-lg p-1.5 text-zinc-700">
                      <MessageCircle size={18} />
                    </span>
                  )}
                  {m.instagram ? (
                    <a
                      href={`https://instagram.com/${m.instagram.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-1.5 text-pink-400 transition-colors hover:bg-pink-500/10 hover:text-pink-300"
                      aria-label="Instagram"
                    >
                      <Instagram size={18} />
                    </a>
                  ) : (
                    <span className="rounded-lg p-1.5 text-zinc-700">
                      <Instagram size={18} />
                    </span>
                  )}
                </div>
              );

              const pills = (
                <div className="flex flex-col gap-1.5">
                  <span className="inline-flex min-h-[1.75rem] items-center justify-center rounded-lg bg-zinc-800 px-2 py-1 text-center text-[9px] font-black uppercase leading-tight tracking-wide text-zinc-300">
                    {labelRole(m.role)}
                  </span>
                  {m.tem_compra ? (
                    <span className="inline-flex min-h-[1.75rem] items-center justify-center gap-1 rounded-lg border border-emerald-800/40 bg-emerald-950/35 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-400">
                      <ShoppingBag size={10} className="shrink-0" /> ATIVO
                    </span>
                  ) : (
                    <span className="inline-flex min-h-[1.75rem] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/80 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-zinc-500">
                      INATIVO
                    </span>
                  )}
                </div>
              );

              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-700/70"
                >
                  {/* Mobile / tablet */}
                  <div className="flex flex-col gap-4 p-4 lg:hidden">
                    <div className="flex items-start gap-3">
                      <span className="w-6 shrink-0 text-right text-[11px] font-black tabular-nums text-zinc-500">
                        {idx + 1}
                      </span>
                      <AdminMemberAvatar avatarUrl={m.avatar_url} name={m.full_name} />
                      <div className="min-w-0 flex-1">{blocoMembro}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-zinc-800/80 pt-4 sm:grid-cols-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">PRO</span>
                        <span className="text-sm font-black tabular-nums text-[#C9A66B]">
                          {proTotal.toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">
                          Compras rede
                        </span>
                        <span className="text-sm font-black tabular-nums text-emerald-400">{redeFmt}</span>
                      </div>
                      <div className="flex items-center justify-center">{icones}</div>
                      <div className="flex flex-col justify-center gap-2">{pills}</div>
                    </div>
                    <div className="flex justify-end border-t border-zinc-800/80 pt-3">
                      <button
                        type="button"
                        onClick={() => abrirEditar(m)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-[#C9A66B]"
                        title="Editar membro"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Desktop — colunas alinhadas */}
                  <div className="hidden min-h-[4.25rem] lg:grid lg:grid-cols-[2rem_2.75rem_minmax(12rem,1fr)_4.75rem_6.25rem_4rem_9.5rem_2.75rem] lg:items-center lg:gap-x-4 lg:px-4 lg:py-3">
                    <span className="text-right text-[11px] font-black tabular-nums text-zinc-500">{idx + 1}</span>
                    <div className="flex justify-center">
                      <AdminMemberAvatar avatarUrl={m.avatar_url} name={m.full_name} />
                    </div>
                    <div className="min-w-0 pr-1">{blocoMembro}</div>
                    <div className="flex flex-col items-end justify-center gap-0.5 text-right">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">PRO</span>
                      <span className="text-sm font-black tabular-nums text-[#C9A66B]">
                        {proTotal.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex flex-col items-end justify-center gap-0.5 text-right">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Rede</span>
                      <span className="text-sm font-black tabular-nums leading-tight text-emerald-400">{redeFmt}</span>
                    </div>
                    {icones}
                    <div className="flex min-w-0 justify-center">{pills}</div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => abrirEditar(m)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 transition-all hover:bg-zinc-700 hover:text-[#C9A66B]"
                        title="Editar membro"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
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

                <div>
                  <label className={labelClass}>Nível / Role</label>
                  <select value={form.role} onChange={e => set("role", e.target.value)} className={inputClass}>
                    {form.role && !ROLE_OPTIONS.some((r) => r.value === form.role) && (
                      <option value={form.role}>{form.role}</option>
                    )}
                    {ROLE_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-600 mt-1">Tabela de preços aplicada automaticamente: <span className="text-zinc-400 font-bold">{roleParaNivel(form.role)}</span></p>
                </div>

                <div>
                  <label className={labelClass}>ID do Indicador (quem indicou)</label>
                  <input value={form.indicado_por} onChange={e => set("indicado_por", e.target.value)} placeholder="UUID do membro que indicou (ou vazio)" className={inputClass} />
                  {editando.indicador && <p className="text-[10px] text-zinc-600 mt-1">Atual: <span className="text-zinc-400">{editando.indicador.full_name}</span></p>}
                </div>

                {/* LINK DE INDICAÇÃO DO MEMBRO */}
                <div className="bg-zinc-900 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 size={13} className="text-[#C9A66B]" />
                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Link de Indicação</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-xs text-zinc-300 bg-black/40 rounded-lg px-3 py-2 truncate select-all font-mono">
                      {`${typeof window !== "undefined" ? window.location.origin : "https://mascpro.com.br"}/cadastro?ref=${editando.id}`}
                    </p>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/cadastro?ref=${editando!.id}`;
                        navigator.clipboard.writeText(link);
                        setLinkCopiado(true);
                        setTimeout(() => setLinkCopiado(false), 2000);
                      }}
                      className="shrink-0 px-3 py-2 rounded-lg bg-[#C9A66B]/10 border border-[#C9A66B]/30 hover:bg-[#C9A66B]/20 text-[#C9A66B] text-[10px] font-black uppercase tracking-widest flex items-center gap-1"
                    >
                      <Copy size={12} /> {linkCopiado ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
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
