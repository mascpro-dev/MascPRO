"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy } from "lucide-react";
import { getProBreakdown } from "@/lib/proScore";

export default function RankingComunidade() {
  const supabase = createClientComponentClient();
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getTotalProfissional = (profile: any) => {
    return getProBreakdown(profile || {}).total;
  };

  useEffect(() => {
    async function fetchRanking() {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, personal_coins, network_coins, total_compras_proprias, total_compras_rede, pro_total")
        .limit(50);

      if (!error && data) {
        const rankingNormalizado = data
          .map((profile) => ({
            ...profile,
            pontos_totais: getTotalProfissional(profile),
          }))
          .sort((a, b) => b.pontos_totais - a.pontos_totais);

        setRanking(rankingNormalizado);
      }
      setLoading(false);
    }
    fetchRanking();
  }, []);

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
                {user.pontos_totais?.toLocaleString()} PRO
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
