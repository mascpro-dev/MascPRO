"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import { ShoppingBag, Plus, Loader2, Pencil, Trash2, ToggleLeft, ToggleRight, X, Image as ImageIcon, Video } from "lucide-react";

type Produto = {
  id: string; title: string; description: string | null; how_to_use: string | null;
  image_url: string | null; video_url: string | null; volume: string | null;
  price_hairdresser: number; price_ambassador: number; price_distributor: number;
  stock: number; ativo: boolean;
};

const EMPTY = {
  title: "", description: "", how_to_use: "", image_url: "", video_url: "",
  volume: "", price_hairdresser: "", price_ambassador: "", price_distributor: "",
  stock: "0", ativo: true,
};

export default function AdminProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/admin/produtos");
    const d = await res.json().catch(() => null);
    setProdutos(d?.products || []);
    setLoading(false);
  }

  function abrirNovo() {
    setEditando(null); setForm({ ...EMPTY }); setErro(""); setShowForm(true);
  }

  function abrirEditar(p: Produto) {
    setEditando(p);
    setForm({
      title: p.title, description: p.description || "", how_to_use: p.how_to_use || "",
      image_url: p.image_url || "", video_url: p.video_url || "", volume: p.volume || "",
      price_hairdresser: String(p.price_hairdresser), price_ambassador: String(p.price_ambassador),
      price_distributor: String(p.price_distributor), stock: String(p.stock), ativo: p.ativo,
    });
    setErro(""); setShowForm(true);
  }

  async function salvar() {
    if (!form.title) { setErro("Título obrigatório."); return; }
    setSalvando(true); setErro("");
    const method = editando ? "PATCH" : "POST";
    const body = editando ? { id: editando.id, ...form } : form;
    const res = await fetch("/api/admin/produtos", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) { setErro(d?.error || "Erro ao salvar."); setSalvando(false); return; }
    await carregar(); setShowForm(false); setSalvando(false);
  }

  async function toggleAtivo(p: Produto) {
    await fetch("/api/admin/produtos", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, ativo: !p.ativo }),
    });
    await carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este produto permanentemente?")) return;
    await fetch("/api/admin/produtos", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    await carregar();
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const moeda = (v: number) => `R$ ${Number(v).toFixed(2)}`;

  const filtrados = produtos.filter(p =>
    p.title.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-[#C9A66B]" size={26} />
            <div>
              <h1 className="text-2xl font-black uppercase italic">Produtos <span className="text-[#C9A66B]">da Loja</span></h1>
              <p className="text-zinc-500 text-xs">{produtos.length} produto(s) cadastrados</p>
            </div>
          </div>
          <button onClick={abrirNovo} className="flex items-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black uppercase text-xs tracking-widest px-5 py-3 rounded-xl transition-all">
            <Plus size={16} /> Novo Produto
          </button>
        </div>

        {/* BUSCA */}
        <input
          type="text" placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)}
          className="w-full mb-6 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C9A66B]"
        />

        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#C9A66B]" size={32} /></div>
        ) : filtrados.length === 0 ? (
          <p className="text-zinc-600 text-center mt-20">Nenhum produto encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
                  <th className="text-left pb-3 pr-4">Produto</th>
                  <th className="text-right pb-3 pr-4">Cabeleireiro</th>
                  <th className="text-right pb-3 pr-4">Embaixador</th>
                  <th className="text-right pb-3 pr-4">Distribuidor</th>
                  <th className="text-center pb-3 pr-4">Estoque</th>
                  <th className="text-center pb-3 pr-4">Status</th>
                  <th className="text-center pb-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr key={p.id} className={`border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors ${!p.ativo ? "opacity-40" : ""}`}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                            <ImageIcon size={16} className="text-zinc-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm leading-tight">{p.title}</p>
                          {p.volume && <p className="text-[10px] text-zinc-500">{p.volume}</p>}
                          {p.video_url && <span className="text-[9px] text-blue-400 flex items-center gap-1"><Video size={9} /> tutorial</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-bold text-[#C9A66B]">{moeda(p.price_hairdresser)}</td>
                    <td className="py-3 pr-4 text-right text-zinc-300">{moeda(p.price_ambassador)}</td>
                    <td className="py-3 pr-4 text-right text-zinc-300">{moeda(p.price_distributor)}</td>
                    <td className="py-3 pr-4 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.stock <= 0 ? "bg-red-900/30 text-red-400" : p.stock <= 5 ? "bg-yellow-900/30 text-yellow-400" : "bg-green-900/20 text-green-400"}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <button onClick={() => toggleAtivo(p)} className={`text-[9px] font-black uppercase px-2 py-1 rounded flex items-center gap-1 mx-auto ${p.ativo ? "text-green-400 bg-green-900/20" : "text-zinc-500 bg-zinc-800"}`}>
                        {p.ativo ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        {p.ativo ? "ATIVO" : "INATIVO"}
                      </button>
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => abrirEditar(p)} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => excluir(p.id)} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-900/40 text-zinc-300 hover:text-red-400 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL */}
        {showForm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
                <h2 className="font-black uppercase text-sm tracking-widest">{editando ? "Editar Produto" : "Novo Produto"}</h2>
                <button onClick={() => setShowForm(false)}><X size={20} className="text-zinc-500 hover:text-white" /></button>
              </div>
              <div className="p-6 space-y-4">
                {/* Preview imagem */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">URL da Foto do Produto</label>
                    <input type="url" value={form.image_url} onChange={e => set("image_url", e.target.value)} placeholder="https://..." className="input" />
                  </div>
                  <div>
                    <label className="label">URL do Vídeo Tutorial</label>
                    <input type="url" value={form.video_url} onChange={e => set("video_url", e.target.value)} placeholder="https://youtube.com/..." className="input" />
                  </div>
                </div>
                {form.image_url && (
                  <img src={form.image_url} alt="preview" className="h-32 rounded-xl object-cover w-full" onError={e => (e.currentTarget.style.display = "none")} />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Título do Produto *</label>
                    <input type="text" value={form.title} onChange={e => set("title", e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Volume / Tamanho</label>
                    <input type="text" placeholder="Ex: 500ml" value={form.volume} onChange={e => set("volume", e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Estoque (unidades)</label>
                    <input type="number" min="0" value={form.stock} onChange={e => set("stock", e.target.value)} className="input" />
                  </div>
                </div>

                <div>
                  <label className="label">Descrição</label>
                  <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)} className="input resize-none" />
                </div>
                <div>
                  <label className="label">Como usar / Passo a passo</label>
                  <textarea rows={3} value={form.how_to_use} onChange={e => set("how_to_use", e.target.value)} className="input resize-none" />
                </div>

                {/* TABELAS DE PREÇO */}
                <div className="bg-zinc-900 rounded-xl p-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Tabelas de Preço</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label text-[#C9A66B]">Cabeleireiro</label>
                      <input type="number" step="0.01" min="0" value={form.price_hairdresser} onChange={e => set("price_hairdresser", e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="label text-blue-400">Embaixador</label>
                      <input type="number" step="0.01" min="0" value={form.price_ambassador} onChange={e => set("price_ambassador", e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="label text-purple-400">Distribuidor</label>
                      <input type="number" step="0.01" min="0" value={form.price_distributor} onChange={e => set("price_distributor", e.target.value)} className="input" />
                    </div>
                  </div>
                </div>

                {erro && <p className="text-red-400 text-xs">{erro}</p>}
                <button onClick={salvar} disabled={salvando} className="w-full bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                  {salvando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {salvando ? "Salvando..." : editando ? "Salvar Alterações" : "Criar Produto"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <style jsx global>{`
        .label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; margin-bottom: 4px; }
        .input { width: 100%; background: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 10px 14px; font-size: 13px; color: white; outline: none; }
        .input:focus { border-color: #C9A66B; }
      `}</style>
    </div>
  );
}
