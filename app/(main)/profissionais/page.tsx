"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Search, MapPin, Instagram, Phone, Users, Loader2 } from "lucide-react";

type Pro = {
  id: string; full_name: string; city: string | null; state: string | null;
  instagram: string | null; whatsapp: string | null; role: string;
  barber_shop: string | null; experience: string | null;
};

export default function ProfissionaisPage() {
  const supabase = createClientComponentClient();
  const [todos, setTodos] = useState<Pro[]>([]);
  const [filtrado, setFiltrado] = useState<Pro[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState("todos");
  const [estados, setEstados] = useState<string[]>([]);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, city, state, instagram, whatsapp, role, barber_shop, experience")
        .not("city", "is", null)
        .order("full_name");
      const lista = (data || []).filter((p: any) => p.full_name);
      setTodos(lista);
      setFiltrado(lista);
      const ufs = Array.from(new Set(lista.map((p: any) => p.state).filter(Boolean))).sort() as string[];
      setEstados(ufs);
      setLoading(false);
    }
    carregar();
  }, []);

  useEffect(() => {
    const t = busca.toLowerCase().trim();
    let lista = todos;
    if (estado !== "todos") lista = lista.filter(p => p.state === estado);
    if (t) lista = lista.filter(p =>
      p.full_name?.toLowerCase().includes(t) ||
      p.city?.toLowerCase().includes(t) ||
      p.barber_shop?.toLowerCase().includes(t)
    );
    setFiltrado(lista);
  }, [busca, estado, todos]);

  // Agrupa por estado
  const porEstado = filtrado.reduce((acc: Record<string, Pro[]>, p) => {
    const uf = p.state || "Outros";
    if (!acc[uf]) acc[uf] = [];
    acc[uf].push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-28">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/20 flex items-center justify-center">
            <Users className="text-[#C9A66B]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Rede de <span className="text-[#C9A66B]">Profissionais</span></h1>
            <p className="text-xs text-zinc-500">{todos.length} profissional(is) na plataforma</p>
          </div>
        </div>

        {/* BUSCA + FILTRO UF */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input type="text" placeholder="Buscar por nome, cidade ou salão..."
              value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-[#C9A66B]" />
          </div>
          <select value={estado} onChange={e => setEstado(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#C9A66B]">
            <option value="todos">Todos os estados</option>
            {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#C9A66B]" size={32} /></div>
        ) : filtrado.length === 0 ? (
          <div className="text-center mt-20 text-zinc-600">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-bold uppercase text-sm">Nenhum profissional encontrado</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(porEstado).sort(([a], [b]) => a.localeCompare(b)).map(([uf, lista]) => (
              <div key={uf}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} className="text-[#C9A66B]" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {uf} · {lista.length} profissional(is)
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lista.map(p => (
                    <div key={p.id} className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 flex items-center justify-between gap-3 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 flex items-center justify-center font-black text-[#C9A66B] shrink-0">
                          {p.full_name?.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{p.full_name}</p>
                          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <MapPin size={9} />
                            <span>{[p.city, p.state].filter(Boolean).join(", ")}</span>
                          </div>
                          {p.barber_shop && <p className="text-[10px] text-zinc-600 truncate">{p.barber_shop}</p>}
                          {p.experience && <p className="text-[10px] text-zinc-600">{p.experience}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {p.whatsapp && (
                          <a href={`https://wa.me/55${p.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-green-900/20 border border-green-800/30 hover:bg-green-900/40 transition-all">
                            <Phone size={14} className="text-green-400" />
                          </a>
                        )}
                        {p.instagram && (
                          <a href={`https://instagram.com/${p.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-pink-900/20 border border-pink-800/30 hover:bg-pink-900/40 transition-all">
                            <Instagram size={14} className="text-pink-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
