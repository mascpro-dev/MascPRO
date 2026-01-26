"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { MessageSquare, Heart, Share2, Send, Crown, Medal, Trophy, Instagram, MessageCircle } from "lucide-react";

export default function ComunidadePage() {
  const [activeTab, setActiveTab] = useState<"feed" | "ranking">("feed");
  const [postContent, setPostContent] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [rankingFilter, setRankingFilter] = useState<"profissionais" | "distribuidores">("profissionais");
  const supabase = createClientComponentClient();

  // Verificar se usuário é Distribuidor (acesso VIP)
  const isDistribuidor = currentProfile?.work_type === "Distribuidor" || 
                         currentProfile?.work_type === "distribuidor" ||
                         currentProfile?.role === "Distribuidor" || 
                         currentProfile?.role === "distribuidor";

  // Carregar perfil do usuário logado
  useEffect(() => {
    async function getCurrentProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setCurrentProfile(data);
      }
    }
    getCurrentProfile();
  }, [supabase]);

  // Carregar posts da comunidade
  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      const { data, error } = await supabase
        .from("community_posts")
        .select("*, profiles(full_name, work_type, avatar_url, specialty)")
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        setPosts(data);
      }
      setLoading(false);
    }
    fetchPosts();
  }, [supabase]);

  // Carregar ranking
  useEffect(() => {
    async function fetchRanking() {
      if (!currentProfile) return;

      let query;

      if (isDistribuidor) {
        if (rankingFilter === "distribuidores") {
          query = supabase
            .from("profiles")
            .select("*, coins, personal_coins")
            .eq("work_type", "Distribuidor");
        } else {
          query = supabase
            .from("profiles")
            .select("*, coins, personal_coins")
            .neq("work_type", "Distribuidor");
        }
      } else {
        query = supabase
          .from("profiles")
          .select("*, coins, personal_coins")
          .neq("work_type", "Distribuidor");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar ranking:", error);
        setRanking([]);
        return;
      }

      if (!data || data.length === 0) {
        setRanking([]);
        return;
      }
      
      // Calcular total_score (coins + personal_coins)
      const rankingDataWithScore = data.map((user: any) => {
        const coins = user.coins || 0;
        const personalCoins = user.personal_coins || 0;
        const totalScore = coins + personalCoins;
        
        return {
          ...user,
          totalScore,
          coins,
          personalCoins,
        };
      });
      
      // Ordenar por total_score (maior para menor)
      rankingDataWithScore.sort((a: any, b: any) => b.totalScore - a.totalScore);
      
      // Adicionar posição
      const rankingData = rankingDataWithScore.map((user: any, index: number) => ({
        ...user,
        position: index + 1,
        totalPros: user.totalScore,
      }));
      
      setRanking(rankingData);
    }
    fetchRanking();
  }, [supabase, currentProfile, isDistribuidor, rankingFilter]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    setPosting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setPosting(false);
      return;
    }

    const { error } = await supabase.from("community_posts").insert([
      {
        content: postContent.trim(),
        user_id: session.user.id,
      },
    ]);

    if (!error) {
      setPostContent("");
      const { data, error: fetchError } = await supabase
        .from("community_posts")
        .select("*, profiles(full_name, work_type, avatar_url, specialty)")
        .order("created_at", { ascending: false });

      if (!fetchError && data) {
        setPosts(data);
      }
    } else {
      console.error("Erro ao postar:", error);
    }
    setPosting(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "M";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
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
    return "Profissional";
  };

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const getInstagramLink = (instagram: string | null) => {
    if (!instagram) return null;
    const handle = instagram.replace(/^@/, "");
    return `https://instagram.com/${handle}`;
  };

  const getWhatsAppLink = (phone: string | null) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\s|\(|\)|-/g, "");
    return `https://wa.me/55${cleanPhone}`;
  };

  const topThree = ranking.slice(0, 3);
  const restOfRanking = ranking.slice(3);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Comunidade <span className="text-[#C9A66B]">MASC</span>
          </h1>
          <p className="text-xs text-[#888] uppercase tracking-wider">
            {activeTab === "feed" ? "Feed" : "Ranking"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-[#222]">
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-6 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === "feed"
                ? "text-[#C9A66B]"
                : "text-[#888] hover:text-white"
            }`}
          >
            Feed
            {activeTab === "feed" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A66B]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("ranking")}
            className={`px-6 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === "ranking"
                ? "text-[#C9A66B]"
                : "text-[#888] hover:text-white"
            }`}
          >
            Ranking
            {activeTab === "ranking" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A66B]" />
            )}
          </button>
        </div>

        {/* Conteúdo */}
        {activeTab === "feed" ? (
          <div className="space-y-4">
            {/* Input de Post */}
            <form
              onSubmit={handlePostSubmit}
              className="bg-[#111] border border-[#222] rounded-xl p-4 sm:p-6"
            >
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="O que está acontecendo no seu salão?"
                className="w-full bg-transparent border-none text-white placeholder:text-[#888] resize-none focus:outline-none min-h-[100px] text-sm"
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#222]">
                <span className="text-xs text-[#888]">
                  {postContent.length}/500
                </span>
                <button 
                  type="submit"
                  disabled={posting || !postContent.trim()}
                  className="bg-[#C9A66B] text-black font-semibold px-6 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity"
                >
                  {posting ? "Postando..." : "Postar"} <Send size={16} />
                </button>
              </div>
            </form>

            {/* Lista de Posts */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center">
                  <p className="text-[#888] text-sm">Carregando feed...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center">
                  <p className="text-[#888] text-sm">
                    Nenhum post ainda. Seja o primeiro a compartilhar!
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-[#111] border border-[#222] rounded-xl p-4 sm:p-6 hover:border-[#333] transition-colors"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#C9A66B] to-amber-200 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                        {post.profiles?.avatar_url ? (
                          <img
                            src={post.profiles.avatar_url}
                            alt={post.profiles.full_name || "User"}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          getInitials(post.profiles?.full_name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {post.profiles?.full_name || "Membro MASC"}
                        </p>
                        <p className="text-xs text-[#888] mt-0.5">
                          {getRoleLabel(post.profiles)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-white leading-relaxed whitespace-pre-wrap mb-4">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-6 pt-4 border-t border-[#222]">
                      <button className="flex items-center gap-2 text-[#888] hover:text-[#C9A66B] transition-colors">
                        <Heart size={16} />
                        <span className="text-xs">0</span>
                      </button>
                      <button className="flex items-center gap-2 text-[#888] hover:text-[#C9A66B] transition-colors">
                        <MessageSquare size={16} />
                        <span className="text-xs">0</span>
                      </button>
                      <button className="flex items-center gap-2 text-[#888] hover:text-[#C9A66B] transition-colors ml-auto">
                        <Share2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filtro de Ranking (apenas para Distribuidores) */}
            {isDistribuidor && (
              <div className="flex gap-2 bg-[#111] border border-[#222] rounded-lg p-1">
                <button
                  onClick={() => setRankingFilter("profissionais")}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                    rankingFilter === "profissionais"
                      ? "bg-[#C9A66B] text-black"
                      : "text-[#888] hover:text-white"
                  }`}
                >
                  Profissionais
                </button>
                <button
                  onClick={() => setRankingFilter("distribuidores")}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                    rankingFilter === "distribuidores"
                      ? "bg-[#C9A66B] text-black"
                      : "text-[#888] hover:text-white"
                  }`}
                >
                  Distribuidores
                </button>
              </div>
            )}

            {loading ? (
              <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center">
                <p className="text-[#888] text-sm">Carregando ranking...</p>
              </div>
            ) : ranking.length === 0 ? (
              <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center">
                <p className="text-[#888] text-sm">
                  Nenhum usuário no ranking ainda.
                </p>
              </div>
            ) : (
              <>
                {/* Pódio - Top 3 */}
                {topThree.length > 0 && (
                  <div className="bg-[#111] border border-[#222] rounded-xl p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-end justify-center gap-4 sm:gap-6 mb-6">
                      {/* 2º Lugar */}
                      {topThree[1] && (
                        <div className="flex flex-col items-center w-full sm:w-auto sm:flex-1 max-w-[200px] order-2 sm:order-1">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-slate-300 to-slate-100 flex items-center justify-center text-black font-bold text-lg sm:text-xl mb-3 border-2 border-slate-400 ring-2 ring-slate-400/20">
                            {topThree[1].avatar_url ? (
                              <img
                                src={topThree[1].avatar_url}
                                alt={topThree[1].full_name || "User"}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              getInitials(topThree[1].full_name)
                            )}
                          </div>
                          <Medal size={24} className="text-slate-400 fill-slate-400 mb-2" />
                          <p className="text-sm font-semibold text-white text-center truncate w-full">
                            {topThree[1].full_name || "Membro MASC"}
                          </p>
                          <p className="text-xs text-[#888] mt-1 text-center">
                            {getRoleLabel(topThree[1])}
                          </p>
                          <p className="text-lg font-bold text-slate-400 mt-2">
                            {formatNumber(topThree[1].totalPros)}
                          </p>
                        </div>
                      )}

                      {/* 1º Lugar */}
                      {topThree[0] && (
                        <div className="flex flex-col items-center w-full sm:w-auto sm:flex-1 max-w-[240px] order-1 sm:order-2">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-[#C9A66B] to-amber-200 flex items-center justify-center text-black font-bold text-xl sm:text-2xl mb-3 border-2 border-[#C9A66B] ring-4 ring-[#C9A66B]/20">
                            {topThree[0].avatar_url ? (
                              <img
                                src={topThree[0].avatar_url}
                                alt={topThree[0].full_name || "User"}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              getInitials(topThree[0].full_name)
                            )}
                          </div>
                          <Crown size={28} className="text-[#C9A66B] fill-[#C9A66B] mb-2" />
                          <p className="text-base font-bold text-[#C9A66B] text-center truncate w-full">
                            {topThree[0].full_name || "Membro MASC"}
                          </p>
                          <p className="text-xs text-[#888] mt-1 text-center">
                            {getRoleLabel(topThree[0])}
                          </p>
                          <p className="text-xl font-bold text-[#C9A66B] mt-2">
                            {formatNumber(topThree[0].totalPros)}
                          </p>
                        </div>
                      )}

                      {/* 3º Lugar */}
                      {topThree[2] && (
                        <div className="flex flex-col items-center w-full sm:w-auto sm:flex-1 max-w-[200px] order-3">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-300 to-amber-100 flex items-center justify-center text-black font-bold text-lg sm:text-xl mb-3 border-2 border-amber-600 ring-2 ring-amber-600/20">
                            {topThree[2].avatar_url ? (
                              <img
                                src={topThree[2].avatar_url}
                                alt={topThree[2].full_name || "User"}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              getInitials(topThree[2].full_name)
                            )}
                          </div>
                          <Trophy size={24} className="text-amber-600 fill-amber-600 mb-2" />
                          <p className="text-sm font-semibold text-white text-center truncate w-full">
                            {topThree[2].full_name || "Membro MASC"}
                          </p>
                          <p className="text-xs text-[#888] mt-1 text-center">
                            {getRoleLabel(topThree[2])}
                          </p>
                          <p className="text-lg font-bold text-amber-600 mt-2">
                            {formatNumber(topThree[2].totalPros)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lista - Do 4º em diante */}
                {restOfRanking.length > 0 && (
                  <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                    <div className="divide-y divide-[#222]">
                      {restOfRanking.map((user, index) => (
                        <div
                          key={user.id}
                          className={`px-4 sm:px-6 py-4 hover:bg-[#0A0A0A] transition-colors ${
                            index % 2 === 0 ? "bg-[#111]" : "bg-[#0F0F0F]"
                          }`}
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            {/* Posição */}
                            <div className="w-8 sm:w-10 text-center flex-shrink-0">
                              <p className="text-xs sm:text-sm font-semibold text-[#888]">
                                #{user.position}
                              </p>
                            </div>

                            {/* Avatar */}
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#C9A66B]/20 to-amber-200/20 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0 border border-[#222]">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.full_name || "User"}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                getInitials(user.full_name)
                              )}
                            </div>

                            {/* Nome e Cargo */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm sm:text-base font-semibold text-white truncate">
                                  {user.full_name || "Membro MASC"}
                                </p>
                                {/* Redes Sociais */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {user.instagram && (
                                    <a
                                      href={getInstagramLink(user.instagram) || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 text-[#888] hover:text-pink-500 transition-colors"
                                      title={`Instagram: @${user.instagram.replace(/^@/, "")}`}
                                    >
                                      <Instagram size={14} />
                                    </a>
                                  )}
                                  {user.phone && (
                                    <a
                                      href={getWhatsAppLink(user.phone) || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 text-[#888] hover:text-emerald-500 transition-colors"
                                      title={`WhatsApp: ${user.phone}`}
                                    >
                                      <MessageCircle size={14} />
                                    </a>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-[#888] mt-0.5 hidden sm:block">
                                {getRoleLabel(user)}
                              </p>
                            </div>

                            {/* Total de Pontos */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm sm:text-base font-bold text-[#C9A66B]">
                                {formatNumber(user.totalPros)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
