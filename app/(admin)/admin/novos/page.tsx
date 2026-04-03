"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import AdminMemberAvatar from "@/componentes/AdminMemberAvatar";

export default function NovosMembrosPage() {
  const [membros, setMembros] = useState<any[]>([]);
  const [prazo, setPrazo] = useState(7);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function buscar() {
      setErro("");
      const res = await fetch(`/api/admin/novos?days=${prazo}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErro(data?.error || "Erro ao carregar novos membros.");
        setMembros([]);
        return;
      }
      setMembros(data.membros || []);
    }
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prazo]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-black italic uppercase">Radar: <span className="text-[#C9A66B]">Novos Membros</span></h1>
          <select 
            value={prazo} 
            onChange={(e) => setPrazo(Number(e.target.value))}
            className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none text-[#C9A66B]"
          >
            <option value={7}>Últimos 07 dias</option>
            <option value={15}>Últimos 15 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>
        </div>
        {erro && (
          <div className="mb-4 rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 text-xs text-red-300">
            {erro}
          </div>
        )}

        {membros.length === 0 ? (
          <div className="bg-zinc-900/30 p-12 rounded-2xl border border-white/5 text-center">
            <p className="text-zinc-500 font-black uppercase tracking-widest">
              Nenhum novo membro nos últimos {prazo} dias
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {membros.map(m => (
              <div key={m.id} className="bg-zinc-900/30 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                <AdminMemberAvatar avatarUrl={m.avatar_url} name={m.full_name} className="rounded-full border-white/10" />
                <div>
                  <p className="font-bold text-sm uppercase">{m.full_name}</p>
                  <p className="text-[10px] text-zinc-500 italic">Entrou em: {new Date(m.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
