"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, Medal, User, Loader2, Crown } from "lucide-react";

export default function RankingPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchRanking();
  }, []);

  async function fetchRanking() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. BUSCAR RANKING DA VIEW CORRETA (v_pro_totals)
      // Ordenado pelo total de moedas (Do maior para o menor)
      const { data, error } = await supabase
        .from("v_pro_totals")
        .select("*")
        .order("pro_total", { ascending: false })
        .limit(50); // Top 50

      if (error) throw error;
      
      setRanking(data || []);

      // Encontrar o usuário atual na lista e calcular sua posição
      if (user && data) {
          const myIndex = data.findIndex((item: any) => item.profile_id === user.id);
          if (myIndex !== -1) {
              setCurrentUser({ ...data[myIndex], position: myIndex + 1 });
          } else {
              // Se não estiver no top 50, buscar dados do usuário separadamente
              const { data: userData } = await supabase
                  .from("v_pro_totals")
                  .select("*")
                  .eq("profile_id", user.id)
                  .single();
              if (userData) {
                  setCurrentUser({ ...userData, position: 50 });
              }
          }
      }

    } catch (error) {
      console.error("Erro ao carregar ranking:", error);
    } finally {
      setLoading(false);
    }
  }

  // Função para definir a cor da medalha
  const getPositionColor = (index: number) => {
      if (index === 0) return "text-yellow-400"; // Ouro
      if (index === 1) return "text-gray-300";   // Prata
      if (index === 2) return "text-amber-600";  // Bronze
      return "text-gray-500";
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-wider">RANKING <span className="text-[#C9A66B]">Geral</span></h1>
            <p className="text-gray-400 text-sm">Os maiores pontuadores da comunidade.</p>
        </div>
        <Trophy size={32} className="text-[#C9A66B]" />
      </div>

      {/* SEU CARD (Fixado no topo para comparação) */}
      {currentUser && (
        <div className="bg-[#111] border border-[#C9A66B]/30 p-4 rounded-xl mb-8 flex items-center justify-between shadow-[0_0_15px_rgba(201,166,107,0.1)]">
            <div className="flex items-center gap-4">
                <div className="bg-[#C9A66B] w-10 h-10 rounded-full flex items-center justify-center font-bold text-black text-sm">
                   #{currentUser.position || '?'}
                </div>
                <div>
                    <h3 className="font-bold text-white">Você</h3>
                    <p className="text-xs text-[#C9A66B]">Sua pontuação atual</p>
                </div>
            </div>
            <div className="text-right">
                <span className="text-xl font-bold text-white block">{currentUser.pro_total || 0} PRO</span>
            </div>
        </div>
      )}

      {/* LISTA DO RANKING */}
      <div className="space-y-3">
          {ranking.map((item, index) => (
              <div 
                key={item.profile_id} 
                className={`flex items-center justify-between p-4 rounded-xl border transition-all
                    ${index === 0 ? 'bg-gradient-to-r from-yellow-900/20 to-black border-yellow-500/50' : ''}
                    ${index === 1 ? 'bg-gradient-to-r from-gray-800/20 to-black border-gray-500/50' : ''}
                    ${index === 2 ? 'bg-gradient-to-r from-orange-900/20 to-black border-orange-500/50' : ''}
                    ${index > 2 ? 'bg-[#111] border-[#222]' : ''}
                `}
              >
                  <div className="flex items-center gap-4">
                      {/* Posição */}
                      <div className={`font-bold text-xl w-8 text-center ${getPositionColor(index)}`}>
                          {index === 0 ? <Crown size={24} /> : `#${index + 1}`}
                      </div>

                      {/* Avatar e Nome */}
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
                              {item.avatar_url ? (
                                  <img src={item.avatar_url} alt={item.full_name} className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-500"><User size={20} /></div>
                              )}
                          </div>
                          <div>
                              <h3 className={`font-bold text-sm ${item.profile_id === currentUser?.profile_id ? 'text-[#C9A66B]' : 'text-white'}`}>
                                  {item.full_name || 'Usuário Anônimo'}
                              </h3>
                              {index < 3 && <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Top Player</span>}
                          </div>
                      </div>
                  </div>

                  {/* Pontuação */}
                  <div className="text-right">
                      <span className={`block font-bold ${index < 3 ? 'text-white text-lg' : 'text-gray-300'}`}>
                          {item.pro_total}
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase">PROs</span>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
}
