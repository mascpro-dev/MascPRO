"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import {
  Calendar, Plus, Loader2, Trash2, ToggleLeft, ToggleRight,
  MapPin, User, DollarSign, Clock, X, Image as ImageIcon, Pencil,
} from "lucide-react";

type Evento = {
  id: string;
  titulo: string;
  descricao: string | null;
  flyer_url: string | null;
  local: string | null;
  cidade: string | null;
  estado: string | null;
  organizador: string | null;
  valor: number | null;
  data_hora: string;
  ativo: boolean;
};

const EMPTY: Omit<Evento, "id" | "ativo"> = {
  titulo: "", descricao: "", flyer_url: "", local: "",
  cidade: "", estado: "", organizador: "", valor: null, data_hora: "",
};

export default function AdminEventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Evento | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [erro, setErro] = useState("");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/admin/eventos");
    const data = await res.json().catch(() => null);
    setEventos(data?.eventos || []);
    setLoading(false);
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ ...EMPTY });
    setErro("");
    setShowForm(true);
  }

  function abrirEditar(e: Evento) {
    setEditando(e);
    setForm({
      titulo: e.titulo, descricao: e.descricao || "", flyer_url: e.flyer_url || "",
      local: e.local || "", cidade: e.cidade || "", estado: e.estado || "",
      organizador: e.organizador || "", valor: e.valor, data_hora: e.data_hora?.slice(0, 16) || "",
    });
    setErro("");
    setShowForm(true);
  }

  async function salvar() {
    if (!form.titulo || !form.data_hora) { setErro("Título e data/hora são obrigatórios."); return; }
    setSalvando(true);
    setErro("");
    const method = editando ? "PATCH" : "POST";
    const body = editando ? { id: editando.id, ...form } : form;
    const res = await fetch("/api/admin/eventos", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) { setErro(data?.error || "Erro ao salvar."); setSalvando(false); return; }
    await carregar();
    setShowForm(false);
    setSalvando(false);
  }

  async function toggleAtivo(e: Evento) {
    await fetch("/api/admin/eventos", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: e.id, ativo: !e.ativo }),
    });
    await carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este evento permanentemente?")) return;
    await fetch("/api/admin/eventos", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await carregar();
  }

  const campo = (key: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div>
      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{label}</label>
      {type === "textarea" ? (
        <textarea
          value={String(form[key] ?? "")}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C9A66B] resize-none"
        />
      ) : (
        <input
          type={type}
          value={String(form[key] ?? "")}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C9A66B]"
        />
      )}
    </div>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Calendar className="text-[#C9A66B]" size={26} />
            <div>
              <h1 className="text-2xl font-black uppercase italic">Eventos <span className="text-[#C9A66B]">PRO</span></h1>
              <p className="text-zinc-500 text-xs">Gerencie os eventos da plataforma</p>
            </div>
          </div>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black uppercase text-xs tracking-widest px-5 py-3 rounded-xl transition-all"
          >
            <Plus size={16} /> Novo Evento
          </button>
        </div>

        {/* LISTA */}
        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#C9A66B]" size={32} /></div>
        ) : eventos.length === 0 ? (
          <div className="text-center mt-20 text-zinc-600">
            <Calendar size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold uppercase text-sm tracking-widest">Nenhum evento cadastrado</p>
            <p className="text-xs mt-1">Clique em "Novo Evento" para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {eventos.map(e => (
              <div key={e.id} className={`bg-zinc-900/60 border rounded-2xl overflow-hidden flex flex-col transition-all ${e.ativo ? "border-zinc-700" : "border-zinc-800 opacity-50"}`}>
                {/* FLYER */}
                <div className="relative aspect-video bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {e.flyer_url ? (
                    <img src={e.flyer_url} alt={e.titulo} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={40} className="text-zinc-600" />
                  )}
                  <span className={`absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${e.ativo ? "bg-green-500 text-black" : "bg-zinc-700 text-zinc-400"}`}>
                    {e.ativo ? "ATIVO" : "INATIVO"}
                  </span>
                </div>

                {/* INFO */}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <p className="font-black text-base leading-tight">{e.titulo}</p>
                  <div className="flex flex-col gap-1 text-xs text-zinc-400">
                    <span className="flex items-center gap-1"><Clock size={11} /> {new Date(e.data_hora).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    {(e.local || e.cidade) && <span className="flex items-center gap-1"><MapPin size={11} /> {[e.local, e.cidade, e.estado].filter(Boolean).join(" · ")}</span>}
                    {e.organizador && <span className="flex items-center gap-1"><User size={11} /> {e.organizador}</span>}
                    {e.valor !== null && <span className="flex items-center gap-1"><DollarSign size={11} /> {e.valor === 0 ? "Gratuito" : `R$ ${Number(e.valor).toFixed(2)}`}</span>}
                  </div>
                </div>

                {/* AÇÕES */}
                <div className="flex border-t border-zinc-800">
                  <button onClick={() => abrirEditar(e)} className="flex-1 flex items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
                    <Pencil size={12} /> Editar
                  </button>
                  <button onClick={() => toggleAtivo(e)} className="flex-1 flex items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase text-zinc-400 hover:text-[#C9A66B] hover:bg-zinc-800 transition-all border-x border-zinc-800">
                    {e.ativo ? <ToggleRight size={14} /> : <ToggleLeft size={14} />} {e.ativo ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => excluir(e.id)} className="flex-1 flex items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-all">
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL FORMULÁRIO */}
        {showForm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="font-black uppercase text-sm tracking-widest">
                  {editando ? "Editar Evento" : "Novo Evento"}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                {campo("flyer_url", "URL do Flyer (imagem)", "url", "https://...")}

                {/* Preview do flyer */}
                {form.flyer_url && (
                  <div className="rounded-xl overflow-hidden aspect-video bg-zinc-900">
                    <img src={form.flyer_url} alt="preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                  </div>
                )}

                {campo("titulo", "Título do Evento *", "text", "Ex: Workshop de Corte Masculino")}
                {campo("descricao", "Descrição", "textarea", "Detalhes sobre o evento...")}

                <div className="grid grid-cols-2 gap-3">
                  {campo("data_hora", "Data e Hora *", "datetime-local")}
                  {campo("valor", "Valor (R$)", "number", "0 para gratuito")}
                </div>

                {campo("local", "Local / Endereço", "text", "Ex: Rua das Flores, 123")}

                <div className="grid grid-cols-2 gap-3">
                  {campo("cidade", "Cidade", "text", "Ex: São Paulo")}
                  {campo("estado", "Estado (UF)", "text", "Ex: SP")}
                </div>

                {campo("organizador", "Quem está fazendo / Organizador", "text", "Ex: MascPRO · Jean")}

                {erro && <p className="text-red-400 text-xs">{erro}</p>}

                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="w-full bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {salvando ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> {editando ? "Salvar Alterações" : "Criar Evento"}</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
