"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, Medal, Crown } from "lucide-react";

export default function RankingComunidade() {
  const supabase = createClientComponentClient();
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      setLoading(true);
      // Buscamos da View que criamos, que já tem a soma e o status certo
      const { data, error } = await supabase
        .from('v_ranking_global')
        .select('*')
        .order('pontos', { ascending: false })
        .limit(50);

      if (!error) setRanking(data);
      setLoading(false);
    }
    fetchRanking();
  }, []);

  // Cores oficiais da sua hierarquia
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'EDUCADOR': return "bg-red-500/10 text-red-500 border-red-500/20";
      case 'MASTER TECH': return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case 'EXPERT': return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case 'CERTIFIED': return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  if (loading) return <div className="p-8 text-zinc-500 animate-pulse font-black uppercase italic">Sincronizando Ranking Elite...</div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <Trophy className="text-[#C9A66B] w-8 h-8" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
          Ranking <span className="text-[#C9A66B]">Elite</span> MascPRO
        </h1>
      </div>

      <div className="grid gap-3">
        {ranking.map((user, index) => (
          <div key={user.id} className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-zinc-600 font-black">#{index + 1}</span>
                <p className="font-bold text-sm uppercase">{user.full_name}</p>
              </div>
              <p className="text-[#C9A66B] font-black">
                {user.pontos?.toLocaleString()} PRO
              </p>
            </div>
            
            {/* BARRA DE DIVISÃO: MERITOCRACIA vs RESIDUAL */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <p className="text-[8px] text-zinc-500 uppercase font-black">Meritocracia</p>
                <p className="text-[10px] font-bold text-white">
                  {user.meritocracia_total?.toLocaleString()} PRO
                </p>
              </div>
              <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                <p className="text-[8px] text-zinc-500 uppercase font-black">Residual Rede</p>
                <p className="text-[10px] font-bold text-green-500">
                  {user.residual_rede_total?.toLocaleString()} PRO
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
