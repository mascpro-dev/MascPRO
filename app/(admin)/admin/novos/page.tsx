"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/componentes/AdminSidebar";

export default function NovosMembrosPage() {
  const supabase = createClientComponentClient();
  const [membros, setMembros] = useState<any[]>([]);
  const [prazo, setPrazo] = useState(7);

  useEffect(() => {
    async function buscar() {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - prazo);
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .gte('created_at', dataLimite.toISOString())
        .order('created_at', { ascending: false });
      
      if (data) setMembros(data);
    }
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prazo]);

  return (
    <div className="flex min-h-screen bg-black">
      <AdminSidebar />
      <main className="flex-1 p-8 text-white">
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
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
                  {m.avatar_url && <img src={m.avatar_url} className="w-full h-full object-cover" />}
                </div>
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
