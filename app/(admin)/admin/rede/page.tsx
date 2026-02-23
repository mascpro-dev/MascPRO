"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/componentes/AdminSidebar";

export default function RadarRedePage() {
  const supabase = createClientComponentClient();
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRedeTotal() {
      setLoading(true);
      
      // 1. Puxa TODOS os perfis sem filtro nenhum
      const { data: todos } = await supabase.from('profiles').select('id, full_name, avatar_url, indicado_por');

      if (todos) {
        const mapa: Record<string, number> = {};
        // 2. Conta no braço quem indicou quem
        todos.forEach(u => {
          if (u.indicado_por) mapa[u.indicado_por] = (mapa[u.indicado_por] || 0) + 1;
        });

        // 3. Monta o ranking (Aqui vai aparecer seus 13 e a Patrícia com as indicações dela)
        const lideres = todos
          .filter(u => mapa[u.id] > 0)
          .map(lider => ({
            ...lider,
            count: mapa[lider.id],
            indicados: todos.filter(i => i.indicado_por === lider.id)
          }))
          .sort((a, b) => b.count - a.count);

        setInfluencers(lideres);
      }
      setLoading(false);
    }
    fetchRedeTotal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen bg-black">
      <AdminSidebar />
      <main className="flex-1 p-8 text-white">
        <h1 className="text-2xl font-black italic uppercase mb-8">Radar de <span className="text-[#C9A66B]">Influência</span></h1>
        
        {loading ? (
          <p className="animate-pulse text-zinc-500 font-black">RASTREAMENTO EM CURSO...</p>
        ) : (
          <div className="space-y-4">
            {influencers.length === 0 && <p className="text-zinc-600">Nenhuma indicação detectada no banco de dados.</p>}
            {influencers.map(lider => (
              <div key={lider.id} className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#C9A66B] flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(201,166,107,0.4)]">
                    {lider.count}
                  </div>
                  <div>
                    <p className="font-black uppercase italic text-lg">{lider.full_name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Líder de Rede</p>
                  </div>
                </div>
                
                {/* Mini fotos dos indicados */}
                <div className="flex -space-x-2 overflow-hidden">
                  {lider.indicados.map((ind: any) => (
                    <div key={ind.id} className="w-8 h-8 rounded-full border-2 border-black bg-zinc-800 overflow-hidden" title={ind.full_name}>
                      {ind.avatar_url && <img src={ind.avatar_url} className="w-full h-full object-cover" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
