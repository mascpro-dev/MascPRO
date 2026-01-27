"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, Medal, MessageSquare, Heart, Share2, ImageIcon, MoreHorizontal, Crown } from "lucide-react";

export default function ComunidadePage() {
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState<'ranking' | 'feed'>('ranking');
  
  // Estados de Dados
  const [ranking, setRanking] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [rankingFilter, setRankingFilter] = useState<"Profissional" | "Distribuidor">("Profissional");

  // Verificar se usuário é Distribuidor
  const isDistribuidor = currentProfile?.work_type === "Distribuidor" || 
                         currentProfile?.work_type === "distribuidor" ||
                         currentProfile?.role === "Distribuidor" || 
                         currentProfile?.role === "distribuidor";

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
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

        // --- BUSCA RANKING ---
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

        const { data: profiles, error: rankError } = await query;

        if (!rankError && profiles) {
          const sortedProfiles = profiles.map(p => ({
            ...p,
            total_coins: (p.coins || 0) + (p.personal_coins || 0),
            name: p.full_name || "Membro MASC"
          })).sort((a, b) => b.total_coins - a.total_coins);
          setRanking(sortedProfiles);
        }

        // --- BUSCA FEED (Posts Reais) ---
        const { data: postsData, error: feedError } = await supabase
          .from("posts")
          .select(`
            id, content, image_url, created_at, likes_count,
            profiles (full_name, avatar_url, role)
          `)
          .order("created_at", { ascending: false });

        if (!feedError && postsData) {
          setPosts(postsData);
        }

      } catch (error) {
        console.error("Erro geral:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase, rankingFilter, isDistribuidor]);

  // Função para formatar data relativa (Ex: "há 2 horas")
  const timeAgo = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return "agora mesmo";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

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
    return profile.role || "Membro";
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#000000] text-white font-sans pb-20">
      
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold italic tracking-wide">
          COMUNIDADE <span className="text-[#C9A66B]">PRO</span>
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          Onde os melhores profissionais se encontram.
        </p>
      </div>

      {/* Navegação (Abas) */}
      <div className="flex w-full bg-[#111] p-1 rounded-xl mb-8 border border-[#222]">
        <button
          onClick={() => setActiveTab('ranking')}
          className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'ranking' 
              ? "bg-[#C9A66B] text-black shadow-lg" 
              : "text-gray-500 hover:text-white"
          }`}
        >
          Ranking Geral
        </button>
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'feed' 
              ? "bg-[#C9A66B] text-black shadow-lg" 
              : "text-gray-500 hover:text-white"
          }`}
        >
          Feed Social
        </button>
      </div>

      {/* --- ABA RANKING --- */}
      {activeTab === 'ranking' && (
        <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
          {/* Filtro para Distribuidores */}
          {isDistribuidor && (
            <div className="flex justify-center bg-[#111] p-1 rounded-lg w-fit mx-auto mb-6 border border-[#222]">
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
                
                // Cores Especiais para Top 3
                let medalColor = "text-gray-600"; 
                let borderClass = "border-[#222]";
                let MedalIcon = Medal;
                if (position === 1) { 
                  medalColor = "text-yellow-400"; 
                  borderClass = "border-yellow-400/30 bg-yellow-400/5";
                  MedalIcon = Crown;
                }
                if (position === 2) { 
                  medalColor = "text-gray-300"; 
                  borderClass = "border-gray-300/30 bg-white/5"; 
                }
                if (position === 3) { 
                  medalColor = "text-amber-700"; 
                  borderClass = "border-amber-700/30 bg-amber-700/5"; 
                }

                return (
                  <div 
                    key={profile.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isMe ? "border-[#C9A66B] bg-[#C9A66B]/10" : borderClass
                    } ${!isMe && position > 3 ? "bg-[#111] hover:border-[#333]" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 font-black text-center text-xl ${medalColor}`}>
                        {position <= 3 ? (
                          <MedalIcon className={`w-6 h-6 mx-auto ${position === 1 ? "fill-yellow-400" : ""}`} />
                        ) : (
                          `#${position}`
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#222] border border-[#333] overflow-hidden">
                           {profile.avatar_url ? (
                             <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.name} />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                               {profile.name.substring(0,2).toUpperCase()}
                             </div>
                           )}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${isMe ? "text-[#C9A66B]" : "text-white"}`}>
                            {profile.name} {isMe && "(Você)"}
                          </p>
                          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                            {getRoleLabel(profile)}
                          </p>
                        </div>
                      </div>
                    </div>

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

      {/* --- ABA FEED --- */}
      {activeTab === 'feed' && (
        <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
          
          {/* Criar Post (Mock Visual) */}
          <div className="bg-[#111] border border-[#222] p-4 rounded-xl mb-6 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-[#222] shrink-0 border border-[#333]" />
            <div className="flex-1">
                <input 
                    type="text" 
                    placeholder="Compartilhe sua evolução..." 
                    className="w-full bg-transparent text-sm text-white placeholder-gray-600 outline-none mb-3"
                />
                <div className="flex justify-between items-center border-t border-[#222] pt-3">
                    <button className="text-gray-500 hover:text-[#C9A66B] transition-colors">
                        <ImageIcon size={20} />
                    </button>
                    <button className="bg-[#C9A66B] text-black text-xs font-bold px-4 py-1.5 rounded-full hover:bg-[#b08d55]">
                        PUBLICAR
                    </button>
                </div>
            </div>
          </div>

          {/* Lista de Posts */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-10 text-gray-500 animate-pulse">
                Carregando feed...
              </div>
            ) : posts.length === 0 ? (
                <div className="text-center py-10 text-gray-600">
                    <p>Ainda não há publicações.</p>
                    <p className="text-xs">Seja o primeiro a postar!</p>
                </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  {/* Header Post */}
                  <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#222] overflow-hidden border border-[#333]">
                              {post.profiles?.avatar_url ? (
                                <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt={post.profiles.full_name || "User"} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                  {post.profiles?.full_name?.substring(0,2).toUpperCase() || "U"}
                                </div>
                              )}
                          </div>
                          <div>
                              <p className="text-sm font-bold text-white">{post.profiles?.full_name || "Usuário"}</p>
                              <p className="text-[10px] text-gray-500">{timeAgo(post.created_at)}</p>
                          </div>
                      </div>
                      <button className="text-gray-600 hover:text-white"><MoreHorizontal size={20}/></button>
                  </div>

                  {/* Conteúdo */}
                  {post.content && (
                    <div className="px-4 pb-3 text-sm text-gray-300 leading-relaxed">{post.content}</div>
                  )}
                  {post.image_url && (
                      <div className="w-full h-64 bg-black relative">
                          <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                      </div>
                  )}

                  {/* Ações */}
                  <div className="p-4 border-t border-[#222] flex items-center gap-6 text-gray-500">
                      <button className="flex items-center gap-2 hover:text-red-500 transition-colors">
                          <Heart size={20} /> <span className="text-xs font-bold">{post.likes_count || 0}</span>
                      </button>
                      <button className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                          <MessageSquare size={20} /> <span className="text-xs font-bold">Comentar</span>
                      </button>
                      <button className="ml-auto hover:text-white transition-colors">
                          <Share2 size={20} />
                      </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
