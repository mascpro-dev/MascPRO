"use client";
import { useEffect, useState, useCallback } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import { Search, Users, Instagram, MessageCircle, Loader2, ShoppingBag, Star } from "lucide-react";

type Membro = {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string | null;
  instagram: string | null;
  role: string;
  created_at: string;
  indicado_por: string | null;
  moedas_pro_acumuladas: number;
  network_coins: number;
  total_compras_rede: number;
  indicador?: { full_name: string } | null;
  pedidos_count?: number;
  tem_compra?: boolean;
};

export default function AdminMembrosPage() {
  const [membros, setMembros] = useState<Membro[]>([]);
  const [filtrado, setFiltrado] = useState<Membro[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtroRole, setFiltroRole] = useState("todos");

  useEffect(() => {
    async function carregar() {
      const res = await fetch("/api/admin/membros");
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setMembros(data.membros || []);
        setFiltrado(data.membros || []);
      }
      setLoading(false);
    }
    carregar();
  }, []);

  const filtrar = useCallback((termo: string, role: string) => {
    const t = termo.toLowerCase().trim();
    let lista = membros;
    if (role !== "todos") lista = lista.filter((m) => m.role === role);
    if (t) {
      lista = lista.filter(
        (m) =>
          m.full_name?.toLowerCase().includes(t) ||
          m.email?.toLowerCase().includes(t) ||
          m.whatsapp?.includes(t) ||
          m.instagram?.toLowerCase().includes(t)
      );
    }
    setFiltrado(lista);
  }, [membros]);

  useEffect(() => { filtrar(busca, filtroRole); }, [busca, filtroRole, filtrar]);

  const roles = ["todos", ...Array.from(new Set(membros.map((m) => m.role).filter(Boolean)))];

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-[#C9A66B]" size={26} />
          <div>
            <h1 className="text-2xl font-black uppercase italic">
              Membros <span className="text-[#C9A66B]">da Rede</span>
            </h1>
            <p className="text-zinc-500 text-xs">Busque, filtre e gerencie todos os membros</p>
          </div>
        </div>

        {/* BUSCA + FILTROS */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, WhatsApp ou Instagram..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-[#C9A66B]/50 transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => setFiltroRole(r)}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${
                  filtroRole === r
                    ? "bg-[#C9A66B] text-black border-[#C9A66B]"
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"
                }`}
              >
                {r === "todos" ? `Todos (${membros.length})` : r}
              </button>
            ))}
          </div>
        </div>

        {/* CONTAGEM */}
        <p className="text-xs text-zinc-600 mb-4 font-bold">
          {filtrado.length} membro{filtrado.length !== 1 ? "s" : ""} encontrado{filtrado.length !== 1 ? "s" : ""}
        </p>

        {loading ? (
          <div className="flex justify-center mt-20">
            <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
          </div>
        ) : filtrado.length === 0 ? (
          <p className="text-zinc-500 text-center mt-20">Nenhum membro encontrado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtrado.map((m) => {
              const proTotal = (m.moedas_pro_acumuladas || 0) + (m.network_coins || 0) + (m.total_compras_rede || 0);
              return (
                <div
                  key={m.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  {/* AVATAR + INFO */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 flex items-center justify-center font-black text-[#C9A66B] text-sm shrink-0">
                      {m.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">{m.full_name}</p>
                      <p className="text-[10px] text-zinc-500">{m.email}</p>
                      {m.indicador && (
                        <p className="text-[10px] text-zinc-600">
                          Indicado por: <span className="text-zinc-400 font-bold">{m.indicador.full_name}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* MÉTRICAS */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* PRO COINS */}
                    <div className="text-center">
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest">PRO Coins</p>
                      <p className="text-sm font-black text-[#C9A66B]">{proTotal.toLocaleString("pt-BR")}</p>
                    </div>

                    {/* COMPRAS NA REDE */}
                    <div className="text-center">
                      <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Compras Rede</p>
                      <p className="text-sm font-black text-emerald-400">
                        R$ {Number(m.total_compras_rede || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </p>
                    </div>

                    {/* LINKS SOCIAIS */}
                    <div className="flex gap-2">
                      {m.whatsapp ? (
                        <a
                          href={`https://wa.me/55${m.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={m.whatsapp}
                        >
                          <MessageCircle size={18} className="text-green-400 hover:text-green-300" />
                        </a>
                      ) : (
                        <MessageCircle size={18} className="text-zinc-700" />
                      )}
                      {m.instagram ? (
                        <a
                          href={`https://instagram.com/${m.instagram.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`@${m.instagram}`}
                        >
                          <Instagram size={18} className="text-pink-400 hover:text-pink-300" />
                        </a>
                      ) : (
                        <Instagram size={18} className="text-zinc-700" />
                      )}
                    </div>

                    {/* ROLE + DATA */}
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {m.role}
                      </span>
                      <p className="text-[9px] text-zinc-700 mt-1">
                        {new Date(m.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>

                    {/* STATUS ATIVO */}
                    {m.tem_compra ? (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                        <ShoppingBag size={10} /> ATIVO
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-zinc-900 text-zinc-600 border border-zinc-800">
                        INATIVO
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
