"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/componentes/AdminSidebar";
import { Users, GitMerge, ArrowRight } from "lucide-react";

export default function RadarRedePage() {
  const supabase = createClientComponentClient();
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRedeData() {
      setLoading(true);

      // Buscamos TODOS os perfis. Sem exceção.
      const { data: allUsers } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, indicado_por, moedas_pro_acumuladas, status_embaixador");

      if (allUsers) {
        // Criamos um mapa simples para contar as indicações de TODO MUNDO
        const contagemGeral: Record<string, number> = {};

        allUsers.forEach((user: any) => {
          if (user.indicado_por) {
            contagemGeral[user.indicado_por] = (contagemGeral[user.indicado_por] || 0) + 1;
          }
        });

        // Filtramos quem é líder (tem pelo menos 1 indicado)
        const rankingLideres = allUsers
          .filter((u: any) => contagemGeral[u.id] > 0)
          .map((lider: any) => ({
            ...lider,
            count: contagemGeral[lider.id],
            // Pegamos a lista real de quem ele indicou
            indicados: allUsers.filter((u: any) => u.indicado_por === lider.id),
          }))
          .sort((a: any, b: any) => b.count - a.count);

        setInfluencers(rankingLideres);
      }

      setLoading(false);
    }

    fetchRedeData();
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
            {influencers.map(leader => (
              <div key={leader.id} className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#C9A66B] flex items-center justify-center text-black font-black">
                    {leader.count}
                  </div>
                  <div>
                    <p className="font-black uppercase italic">{leader.full_name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{leader.status_embaixador}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {leader.indicados.map((ind: any) => (
                    <div key={ind.id} title={ind.full_name} className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
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