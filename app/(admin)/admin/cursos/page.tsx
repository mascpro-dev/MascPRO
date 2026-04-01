"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import { BookOpen, Plus, Loader2, Pencil, Trash2, X, ChevronDown, ChevronRight, Video, Film } from "lucide-react";

const EMPTY_COURSE = { title: "", description: "", image_url: "", code: "", sequence_order: "1" };
const EMPTY_LESSON = { title: "", description: "", video_url: "", materials: "", coins_reward: "10", sequence_order: "1" };

export default function AdminCursosPage() {
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  // Form Curso
  const [showCurso, setShowCurso] = useState(false);
  const [editandoCurso, setEditandoCurso] = useState<any>(null);
  const [formCurso, setFormCurso] = useState({ ...EMPTY_COURSE });

  // Form Aula
  const [showAula, setShowAula] = useState<string | null>(null); // course_id
  const [editandoAula, setEditandoAula] = useState<any>(null);
  const [formAula, setFormAula] = useState({ ...EMPTY_LESSON });

  const [erro, setErro] = useState("");

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/admin/cursos");
    const d = await res.json().catch(() => null);
    setCursos(d?.courses || []);
    setLoading(false);
  }

  async function salvarCurso() {
    if (!formCurso.title) { setErro("Título obrigatório."); return; }
    setSalvando(true); setErro("");
    const method = editandoCurso ? "PATCH" : "POST";
    const body = editandoCurso ? { id: editandoCurso.id, ...formCurso } : formCurso;
    const res = await fetch("/api/admin/cursos", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) { setErro(d?.error || "Erro ao salvar."); setSalvando(false); return; }
    await carregar(); setShowCurso(false); setSalvando(false);
  }

  async function salvarAula(course_id: string) {
    if (!formAula.title) { setErro("Título obrigatório."); return; }
    setSalvando(true); setErro("");
    const method = editandoAula ? "PATCH" : "POST";
    const body = editandoAula
      ? { id: editandoAula.id, _type: "lesson", ...formAula }
      : { _type: "lesson", course_id, ...formAula };
    const res = await fetch("/api/admin/cursos", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) { setErro(d?.error || "Erro ao salvar."); setSalvando(false); return; }
    await carregar(); setShowAula(null); setEditandoAula(null); setSalvando(false);
  }

  async function excluir(id: string, tipo: "course" | "lesson") {
    if (!confirm(`Excluir este ${tipo === "course" ? "módulo" : "aula"}?`)) return;
    await fetch("/api/admin/cursos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, _type: tipo === "lesson" ? "lesson" : "course" }) });
    await carregar();
  }

  const setC = (k: string, v: string) => setFormCurso(f => ({ ...f, [k]: v }));
  const setA = (k: string, v: string) => setFormAula(f => ({ ...f, [k]: v }));

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="text-[#C9A66B]" size={26} />
            <div>
              <h1 className="text-2xl font-black uppercase italic">Cursos <span className="text-[#C9A66B]">& Aulas</span></h1>
              <p className="text-zinc-500 text-xs">{cursos.length} módulo(s) cadastrados</p>
            </div>
          </div>
          <button onClick={() => { setEditandoCurso(null); setFormCurso({ ...EMPTY_COURSE }); setErro(""); setShowCurso(true); }}
            className="flex items-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black uppercase text-xs tracking-widest px-5 py-3 rounded-xl transition-all">
            <Plus size={16} /> Novo Módulo
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#C9A66B]" size={32} /></div>
        ) : (
          <div className="space-y-3">
            {cursos.map(curso => (
              <div key={curso.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                {/* HEADER MÓDULO */}
                <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandido(expandido === curso.id ? null : curso.id)}>
                  <div className="flex items-center gap-4">
                    {curso.image_url ? (
                      <img src={curso.image_url} className="w-12 h-16 object-cover rounded-lg" alt={curso.title} />
                    ) : (
                      <div className="w-12 h-16 bg-zinc-800 rounded-lg flex items-center justify-center">
                        <Film size={20} className="text-zinc-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-black text-sm">{curso.title}</p>
                      <p className="text-[10px] text-zinc-500">Módulo {curso.sequence_order} · {(curso.lessons || []).length} aula(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); setEditandoCurso(curso); setFormCurso({ title: curso.title, description: curso.description || "", image_url: curso.image_url || "", code: curso.code || "", sequence_order: String(curso.sequence_order) }); setErro(""); setShowCurso(true); }}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white">
                      <Pencil size={14} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); excluir(curso.id, "course"); }}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-red-900/40 text-zinc-400 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                    {expandido === curso.id ? <ChevronDown size={16} className="text-zinc-500" /> : <ChevronRight size={16} className="text-zinc-500" />}
                  </div>
                </div>

                {/* AULAS */}
                {expandido === curso.id && (
                  <div className="border-t border-zinc-800 p-4 space-y-2">
                    {(curso.lessons || [])
                      .sort((a: any, b: any) => a.sequence_order - b.sequence_order)
                      .map((aula: any) => (
                        <div key={aula.id} className="flex items-center justify-between bg-zinc-950 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Video size={14} className="text-[#C9A66B] shrink-0" />
                            <div>
                              <p className="text-sm font-bold">{aula.title}</p>
                              <p className="text-[10px] text-zinc-500">Aula {aula.sequence_order} · {aula.coins_reward || 10} PRO</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setEditandoAula(aula); setFormAula({ title: aula.title, description: aula.description || "", video_url: aula.video_url || "", materials: aula.materials || "", coins_reward: String(aula.coins_reward || 10), sequence_order: String(aula.sequence_order) }); setErro(""); setShowAula(curso.id); }}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => excluir(aula.id, "lesson")}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-900/40 text-zinc-400 hover:text-red-400">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    <button onClick={() => { setEditandoAula(null); setFormAula({ ...EMPTY_LESSON }); setErro(""); setShowAula(curso.id); }}
                      className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-zinc-700 rounded-xl text-[11px] font-bold text-zinc-500 hover:border-[#C9A66B] hover:text-[#C9A66B] transition-all">
                      <Plus size={13} /> Adicionar Aula
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MODAL CURSO */}
        {showCurso && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="font-black uppercase text-sm">{editandoCurso ? "Editar Módulo" : "Novo Módulo"}</h2>
                <button onClick={() => setShowCurso(false)}><X size={20} className="text-zinc-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className="label">Título *</label><input value={formCurso.title} onChange={e => setC("title", e.target.value)} className="input" /></div>
                <div><label className="label">Descrição</label><textarea rows={2} value={formCurso.description} onChange={e => setC("description", e.target.value)} className="input resize-none" /></div>
                <div><label className="label">URL da Imagem (Capa)</label><input value={formCurso.image_url} onChange={e => setC("image_url", e.target.value)} placeholder="https://..." className="input" /></div>
                {formCurso.image_url && <img src={formCurso.image_url} className="h-28 object-cover rounded-xl w-full" onError={e => (e.currentTarget.style.display = "none")} />}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Código (slug)</label><input value={formCurso.code} onChange={e => setC("code", e.target.value)} placeholder="modulo-01" className="input" /></div>
                  <div><label className="label">Ordem</label><input type="number" min="1" value={formCurso.sequence_order} onChange={e => setC("sequence_order", e.target.value)} className="input" /></div>
                </div>
                {erro && <p className="text-red-400 text-xs">{erro}</p>}
                <button onClick={salvarCurso} disabled={salvando} className="w-full bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-xs py-3 rounded-xl flex items-center justify-center gap-2">
                  {salvando ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editandoCurso ? "Salvar" : "Criar Módulo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL AULA */}
        {showAula && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="font-black uppercase text-sm">{editandoAula ? "Editar Aula" : "Nova Aula"}</h2>
                <button onClick={() => { setShowAula(null); setEditandoAula(null); }}><X size={20} className="text-zinc-500" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className="label">Título da Aula *</label><input value={formAula.title} onChange={e => setA("title", e.target.value)} className="input" /></div>
                <div><label className="label">URL do Vídeo (YouTube)</label><input value={formAula.video_url} onChange={e => setA("video_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." className="input" /></div>
                <div><label className="label">Descrição / Sobre a aula</label><textarea rows={3} value={formAula.description} onChange={e => setA("description", e.target.value)} className="input resize-none" /></div>
                <div><label className="label">Materiais de Apoio (links, texto)</label><textarea rows={3} value={formAula.materials} onChange={e => setA("materials", e.target.value)} placeholder="Link do PDF, instruções, etc." className="input resize-none" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Moedas PRO ao concluir</label><input type="number" min="1" value={formAula.coins_reward} onChange={e => setA("coins_reward", e.target.value)} className="input" /></div>
                  <div><label className="label">Ordem na sequência</label><input type="number" min="1" value={formAula.sequence_order} onChange={e => setA("sequence_order", e.target.value)} className="input" /></div>
                </div>
                {erro && <p className="text-red-400 text-xs">{erro}</p>}
                <button onClick={() => salvarAula(showAula)} disabled={salvando} className="w-full bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-xs py-3 rounded-xl flex items-center justify-center gap-2">
                  {salvando ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editandoAula ? "Salvar Alterações" : "Criar Aula"}
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
