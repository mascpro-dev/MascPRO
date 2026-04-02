"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import { Bell, Plus, Loader2, Trash2, X, ToggleRight, ToggleLeft, Send, Users, User, Briefcase, Shield } from "lucide-react";

const PUBLICOS = [
  { value: "TODOS", label: "Todos os membros", icon: Users, cor: "text-[#C9A66B] bg-[#C9A66B]/10" },
  { value: "CABELEIREIRO", label: "Cabeleireiros", icon: User, cor: "text-blue-400 bg-blue-900/20" },
  { value: "EMBAIXADOR", label: "Embaixadores", icon: Briefcase, cor: "text-purple-400 bg-purple-900/20" },
  { value: "DISTRIBUIDOR", label: "Distribuidores", icon: Shield, cor: "text-green-400 bg-green-900/20" },
];

const TIPOS = [
  { value: "info", label: "Informação", cor: "bg-blue-500" },
  { value: "aviso", label: "Aviso", cor: "bg-yellow-500" },
  { value: "destaque", label: "Destaque", cor: "bg-[#C9A66B]" },
  { value: "urgente", label: "Urgente", cor: "bg-red-500" },
];

export default function AdminComunicadosPage() {
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: "", mensagem: "", publico: "TODOS", tipo: "info" });
  const [erro, setErro] = useState("");
  const [enviarPush, setEnviarPush] = useState(true);
  const [pushStatus, setPushStatus] = useState("");
  const [testando, setTestando] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/admin/comunicados");
    const d = await res.json().catch(() => null);
    setComunicados(d?.comunicados || []);
    setLoading(false);
  }

  async function salvar() {
    if (!form.titulo || !form.mensagem) { setErro("Título e mensagem obrigatórios."); return; }
    setSalvando(true); setErro("");
    const res = await fetch("/api/admin/comunicados", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) { setErro(d?.error || "Erro ao enviar."); setSalvando(false); return; }

    // Dispara push notification se marcado
    if (enviarPush) {
      const pushRes = await fetch("/api/push/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.titulo, body: form.mensagem, url: "/", publico: form.publico }),
      });
      const pushData = await pushRes.json().catch(() => null);
      setPushStatus(pushData?.enviados > 0 ? `🔔 Push enviado para ${pushData.enviados} dispositivo(s)` : "🔔 Push enviado (nenhum dispositivo registrado ainda)");
      setTimeout(() => setPushStatus(""), 5000);
    }

    await carregar(); setShowForm(false); setSalvando(false);
    setForm({ titulo: "", mensagem: "", publico: "TODOS", tipo: "info" });
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await fetch("/api/admin/comunicados", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ativo: !ativo }),
    });
    await carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este comunicado?")) return;
    await fetch("/api/admin/comunicados", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    await carregar();
  }

    async function testarPush() {
    setTestando(true);
    const res = await fetch("/api/push/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "?? Teste MascPRO", body: "Push funcionando! Suas notifica��es est�o ativas.", url: "/", publico: "TODOS" }),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) setPushStatus(`? Teste enviado para ${d.enviados} dispositivo(s). Verifique o celular!`);
    else setPushStatus(`? Erro: ${d?.error || "Falha no envio. Verifique as vari�veis VAPID no Vercel."}`);
    setTimeout(() => setPushStatus(""), 8000);
    setTestando(false);
  }

  const publicoInfo = (p: string) => PUBLICOS.find(x => x.value === p) || PUBLICOS[0];
  const tipoInfo = (t: string) => TIPOS.find(x => x.value === t) || TIPOS[0];

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="text-[#C9A66B]" size={26} />
            <div>
              <h1 className="text-2xl font-black uppercase italic">Comunicados <span className="text-[#C9A66B]">& Recados</span></h1>
              <p className="text-zinc-500 text-xs">Mensagens segmentadas por tipo de membro</p>
            </div>
          </div>
          <button onClick={() => { setShowForm(true); setErro(""); }} className="flex items-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black uppercase text-xs tracking-widest px-5 py-3 rounded-xl transition-all">
            <Plus size={16} /> Novo Comunicado
          </button>
        </div>

        {pushStatus && (
          <div className="mb-4 flex items-center gap-2 bg-[#C9A66B]/10 border border-[#C9A66B]/30 rounded-xl px-4 py-3 text-sm text-[#C9A66B] font-bold">
            {pushStatus}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#C9A66B]" size={32} /></div>
        ) : comunicados.length === 0 ? (
          <div className="text-center mt-20 text-zinc-600">
            <Bell size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold uppercase text-sm tracking-widest">Nenhum comunicado enviado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comunicados.map(c => {
              const pub = publicoInfo(c.publico);
              const tip = tipoInfo(c.tipo);
              const PubIcon = pub.icon;
              return (
                <div key={c.id} className={`bg-zinc-900/60 border rounded-2xl p-5 transition-all ${c.ativo ? "border-zinc-800" : "border-zinc-900 opacity-50"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded text-black ${tip.cor}`}>{tip.label}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1 ${pub.cor}`}>
                          <PubIcon size={9} /> {pub.label}
                        </span>
                        {!c.ativo && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-500">INATIVO</span>}
                      </div>
                      <p className="font-black text-sm mb-1">{c.titulo}</p>
                      <p className="text-sm text-zinc-400 leading-relaxed">{c.mensagem}</p>
                      <p className="text-[10px] text-zinc-600 mt-2">
                        {new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => toggleAtivo(c.id, c.ativo)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-[#C9A66B]">
                        {c.ativo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button onClick={() => excluir(c.id)} className="p-2 rounded-lg bg-zinc-800 hover:bg-red-900/40 text-zinc-400 hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL */}
        {showForm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="font-black uppercase text-sm tracking-widest">Novo Comunicado</h2>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-zinc-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Público-alvo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PUBLICOS.map(p => {
                      const Icon = p.icon;
                      return (
                        <button key={p.value} onClick={() => setForm(f => ({ ...f, publico: p.value }))}
                          className={`flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${form.publico === p.value ? `${p.cor} border-current` : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}>
                          <Icon size={14} /> {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Tipo</label>
                  <div className="flex gap-2">
                    {TIPOS.map(t => (
                      <button key={t.value} onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all ${form.tipo === t.value ? `${t.cor} text-black border-transparent` : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Título</label>
                  <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C9A66B]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Mensagem</label>
                  <textarea rows={4} value={form.mensagem} onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C9A66B] resize-none" />
                </div>
                {/* Toggle Push */}
                <button onClick={() => setEnviarPush(v => !v)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${enviarPush ? "bg-[#C9A66B]/10 border-[#C9A66B]/40 text-[#C9A66B]" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}>
                  <div className="flex items-center gap-2 text-xs font-black uppercase">
                    <Bell size={14} /> Enviar push notification no celular
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${enviarPush ? "bg-[#C9A66B] text-black" : "bg-zinc-800 text-zinc-600"}`}>
                    {enviarPush ? "ON" : "OFF"}
                  </span>
                </button>

                {erro && <p className="text-red-400 text-xs">{erro}</p>}
                <button onClick={salvar} disabled={salvando} className="w-full bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2">
                  {salvando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {salvando ? "Enviando..." : "Publicar Comunicado"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


