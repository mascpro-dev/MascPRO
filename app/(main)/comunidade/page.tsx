"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, Users, Medal, Search, Crown } from "lucide-react";

export default function ComunidadePage() {
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState<'ranking' | 'feed'>('ranking');
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [rankingFilter, setRankingFilter] = useState<"Profissional" | "Distribuidor">("Profissional");

  // Verificar se usuário é Distribuidor
  const isDistribuidor = currentProfile?.work_type === "Distribuidor" || 
                         currentProfile?.work_type === "distribuidor" ||
                         currentProfile?.role === "Distribuidor" || 
                         currentProfile?.role === "distribuidor";

  // Busca os dados do Ranking
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // 1. Pega ID do usuário atual e perfil
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user.id);
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          setCurrentProfile(profile);
        }

        // 2. Busca perfis com filtro
        let query = supabase
          .from("profiles")
          .select("id, full_name, avatar_url, coins, personal_coins, role, work_type, specialty");

        // Aplicar filtro se for distribuidor
        if (isDistribuidor) {
          if (rankingFilter === "Distribuidor") {
            query = query.eq("work_type", "Distribuidor");
          } else {
            query = query.neq("work_type", "Distribuidor");
          }
        } else {
          // Se não é distribuidor, excluir distribuidores
          query = query.neq("work_type", "Distribuidor");
        }

        const { data: profiles, error } = await query;

        if (error) throw error;

        if (profiles) {
          // Calcula saldo total e ordena (Maior para o menor)
          const sortedProfiles = profiles.map(p => ({
            ...p,
            total_coins: (p.coins || 0) + (p.personal_coins || 0),
            name: p.full_name || "Usuário Anônimo"
          })).sort((a, b) => b.total_coins - a.total_coins);

          setRanking(sortedProfiles);
        }

      } catch (error: any) {
        console.error("Erro ao carregar ranking:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase, rankingFilter, isDistribuidor]);

  const getRoleLabel = (profile: any) => {
    if (!profile) return "Membro";
    const isDist = profile.work_type === "distribuidor" || profile.role === "distribuidor";
    if (isDist) return "Distribuidor";
    if (profile.specialty) {
      const specialties: { [key: string]: string } = {
        cabeleireiro: "Cabeleireiro",
        barbeiro: "Barbeiro",
        esteticista: "Esteticista",
        manicure: "Manicure",
        outro: "Profissional",
      };
      return specialties[profile.specialty] || "Profissional";
    }
    return "Profissional";
  };

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <div className="p-6 md:p-10 min-h-screen bg-[#000000] text-white font-sans">
      
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold italic tracking-wide">
          COMUNIDADE <span className="text-[#C9A66B]">PRO</span>
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          Conecte-se e veja quem está liderando a evolução.
        </p>
      </div>

      {/* Abas */}
      <div className="flex gap-6 border-b border-[#222] mb-8">
        <button
          onClick={() => setActiveTab('ranking')}
          className={`pb-3 text-sm font-bold tracking-widest uppercase transition-all ${
            activeTab === 'ranking' 
              ? "border-b-2 border-[#C9A66B] text-[#C9A66B]" 
              : "text-gray-500 hover:text-white"
          }`}
        >
          Ranking
        </button>
        <button
          onClick={() => setActiveTab('feed')}
          className={`pb-3 text-sm font-bold tracking-widest uppercase transition-all ${
            activeTab === 'feed' 
              ? "border-b-2 border-[#C9A66B] text-[#C9A66B]" 
              : "text-gray-500 hover:text-white"
          }`}
        >
          Feed (Em Breve)
        </button>
      </div>

      {/* CONTEÚDO: RANKING */}
      {activeTab === 'ranking' && (
        <div className="max-w-3xl">
          {/* Filtro para Distribuidores */}
          {isDistribuidor && (
            <div className="flex justify-center bg-[#111] p-1 rounded-lg w-fit mb-6 border border-[#222]">
              <button 
                onClick={() => setRankingFilter("Profissional")}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                  rankingFilter === "Profissional" 
                    ? "bg-[#C9A66B] text-black" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Profissionais
              </button>
              <button 
                onClick={() => setRankingFilter("Distribuidor")}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                  rankingFilter === "Distribuidor" 
                    ? "bg-[#C9A66B] text-black" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Distribuidores
              </button>
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-10 text-gray-500 animate-pulse">
              Carregando líderes...
            </div>
          ) : (
            <div className="space-y-3">
              {ranking.map((profile, index) => {
                const isMe = profile.id === currentUser;
                const position = index + 1;
                
                // Cores das Medalhas
                let medalColor = "text-gray-500"; // Padrão
                let MedalIcon = Medal;
                if (position === 1) {
                  medalColor = "text-yellow-400";
                  MedalIcon = Crown;
                }
                if (position === 2) medalColor = "text-gray-300";   // Prata
                if (position === 3) medalColor = "text-amber-700";  // Bronze

                return (
                  <div 
                    key={profile.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isMe 
                        ? "bg-[#C9A66B]/10 border-[#C9A66B] shadow-[0_0_15px_rgba(201,166,107,0.1)]" 
                        : "bg-[#111] border-[#222] hover:border-[#333]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Posição / Medalha */}
                      <div className={`w-8 font-bold text-center text-lg ${medalColor}`}>
                        {position <= 3 ? (
                          <MedalIcon className={`w-6 h-6 mx-auto ${position === 1 ? "fill-yellow-400" : ""}`} />
                        ) : (
                          `#${position}`
                        )}
                      </div>

                      {/* Avatar e Nome */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#222] border border-[#333] flex items-center justify-center overflow-hidden">
                           {profile.avatar_url ? (
                             <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                           ) : (
                             <span className="text-xs font-bold text-gray-500">
                               {profile.name.substring(0,2).toUpperCase()}
                             </span>
                           )}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${isMe ? "text-[#C9A66B]" : "text-white"}`}>
                            {profile.name} {isMe && "(Você)"}
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                            {getRoleLabel(profile)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Saldo */}
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                      <Trophy className="w-4 h-4 text-[#C9A66B]" />
                      <span className="font-bold text-white text-sm">{formatNumber(profile.total_coins)}</span>
                    </div>
                  </div>
                );
              })}

              {ranking.length === 0 && (
                 <div className="text-center py-10 text-gray-500">
                    Nenhum membro encontrado.
                 </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO: FEED (Placeholder) */}
      {activeTab === 'feed' && (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#222] rounded-xl bg-[#0a0a0a]">
          <Users className="w-12 h-12 text-[#222] mb-4" />
          <h3 className="text-lg font-bold text-gray-400">Comunidade em Construção</h3>
          <p className="text-sm text-gray-600 mt-2 text-center max-w-md">
            Em breve você poderá compartilhar seus resultados e interagir com outros membros aqui.
          </p>
        </div>
      )}

    </div>
  );
}
