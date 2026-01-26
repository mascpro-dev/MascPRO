"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { MessageSquare, Heart, Share2, Send, Crown, Medal, Trophy, Instagram, MessageCircle, Phone } from "lucide-react";

export default function ComunidadePage() {
  const [activeTab, setActiveTab] = useState<"feed" | "ranking">("ranking");
  const [postContent, setPostContent] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [rankingFilter, setRankingFilter] = useState<"Profissional" | "Distribuidor">("Profissional");
  const supabase = createClientComponentClient();

  // Verificar se usuário é Distribuidor
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

  // Carregar dados (ranking e posts)
  useEffect(() => {
    fetchData();
  }, [rankingFilter, currentProfile]);

  async function fetchData() {
    setLoading(true);
    
    // 1. Buscar Ranking
    let query = supabase.from("profiles").select("*, coins, personal_coins");

    if (isDistribuidor) {
      if (rankingFilter === "Distribuidor") {
        query = query.eq("work_type", "Distribuidor");
      } else {
        query = query.neq("work_type", "Distribuidor");
      }
    } else {
      query = query.neq("work_type", "Distribuidor");
    }

    const { data: profilesData } = await query;

    if (profilesData) {
      const sorted = profilesData.map((p: any) => ({
        ...p,
        total_score: (p.coins || 0) + (p.personal_coins || 0)
      })).sort((a: any, b: any) => b.total_score - a.total_score);

      const rankingData = sorted.map((user: any, index: number) => ({
        ...user,
        position: index + 1,
        totalPros: user.total_score,
      }));

      setRanking(rankingData);
    }

    // 2. Buscar Posts
    const { data: postsData } = await supabase
      .from("community_posts")
      .select("*, profiles(full_name, avatar_url, work_type, specialty)")
      .order("created_at", { ascending: false });
      
    if (postsData) setPosts(postsData);

    setLoading(false);
  }

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

  const formatPhone = (phone: string | null) => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  const formatInsta = (insta: string | null) => {
    if (!insta) return "";
    return insta.replace(/^@/, "");
  };

  // Componente do Pódio
  const PodiumItem = ({ profile, place }: { profile: any, place: number }) => {
    if (!profile) return null;
    
    const isFirst = place === 1;
    const borderColor = isFirst ? "border-[#C9A66B]" : place === 2 ? "border-slate-400" : "border-amber-600";
    const iconColor = isFirst ? "text-[#C9A66B]" : place === 2 ? "text-slate-400" : "text-amber-600";
    const bgColor = isFirst ? "bg-[#C9A66B]" : place === 2 ? "bg-slate-400" : "bg-amber-600";
    const size = isFirst ? "w-20 h-20 md:w-28 md:h-28" : "w-16 h-16 md:w-20 md:h-20";
    const crownSize = isFirst ? "w-8 h-8" : "w-6 h-6";

    return (
      <div className={`flex flex-col items-center ${isFirst ? "-mt-4 md:-mt-8 order-2" : place === 2 ? "order-1" : "order-3"}`}>
        {isFirst && <Crown className={`${crownSize} ${iconColor} mb-1`} />}
        
        <div className={`relative ${size} rounded-full border-4 ${borderColor} p-1 bg-[#111]`}>
          {profile.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt={profile.full_name || "User"} 
              className="w-full h-full rounded-full object-cover" 
            />
          ) : (
            <div className="w-full h-full rounded-full bg-[#222] flex items-center justify-center text-white font-bold text-xl">
              {getInitials(profile.full_name)}
            </div>
          )}
          
          {/* Badge de Posição */}
          <div className={`absolute -bottom-2 inset-x-0 mx-auto w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full text-xs md:text-sm font-bold text-black ${bgColor}`}>
            {place}
          </div>
        </div>

        <div className="text-center mt-3">
          <p className="font-bold text-white text-xs md:text-base max-w-[80px] md:max-w-[120px] truncate mx-auto">
            {profile.full_name?.split(' ')[0] || "Membro"}
          </p>
          <p className={`font-bold text-sm md:text-lg ${iconColor} mt-1`}>
            {formatNumber(profile.totalPros)}
            <span className="text-[10px] md:text-xs text-[#888] ml-1">PRO</span>
          </p>
        </div>
      </div>
    );
  };

  const topThree = ranking.slice(0, 3);
  const restOfRanking = ranking.slice(3);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-20 md:pb-0">
      {/* Header Fixo */}
      <div className="sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#222] px-4 pt-4 pb-2">
        <h1 className="text-xl md:text-2xl font-bold mb-4">
          COMUNIDADE <span className="text-[#C9A66B]">MASC</span>
        </h1>
        
        {/* Abas */}
        <div className="flex gap-6 border-b border-[#222]">
          <button 
            onClick={() => setActiveTab("ranking")}
            className={`pb-2 text-sm font-bold tracking-wider transition-colors ${
              activeTab === "ranking" 
                ? "text-[#C9A66B] border-b-2 border-[#C9A66B]" 
                : "text-[#888] hover:text-white"
            }`}
          >
            RANKING
          </button>
          <button 
            onClick={() => setActiveTab("feed")}
            className={`pb-2 text-sm font-bold tracking-wider transition-colors ${
              activeTab === "feed" 
                ? "text-[#C9A66B] border-b-2 border-[#C9A66B]" 
                : "text-[#888] hover:text-white"
            }`}
          >
            FEED
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {/* CONTEÚDO RANKING */}
        {activeTab === "ranking" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Filtro para Distribuidores */}
            {isDistribuidor && (
              <div className="flex justify-center bg-[#111] p-1 rounded-lg w-fit mx-auto border border-[#222]">
                <button 
                  onClick={() => setRankingFilter("Profissional")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    rankingFilter === "Profissional" 
                      ? "bg-[#C9A66B] text-black" 
                      : "text-[#888] hover:text-white"
                  }`}
                >
                  Profissionais
                </button>
                <button 
                  onClick={() => setRankingFilter("Distribuidor")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    rankingFilter === "Distribuidor" 
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
                {/* O PÓDIO (Top 3) */}
                <div className="flex justify-center items-end gap-2 md:gap-8 py-4 mb-8">
                  {topThree[1] && <PodiumItem profile={topThree[1]} place={2} />}
                  {topThree[0] && <PodiumItem profile={topThree[0]} place={1} />}
                  {topThree[2] && <PodiumItem profile={topThree[2]} place={3} />}
                </div>

                {/* A LISTA (Resto) */}
                {restOfRanking.length > 0 && (
                  <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
                    {restOfRanking.map((profile, index) => (
                      <div 
                        key={profile.id} 
                        className="flex items-center justify-between p-3 md:p-4 border-b border-[#222] last:border-0 hover:bg-white/5 transition-colors"
                      >
                        {/* Lado Esquerdo: Posição + Foto + Nome */}
                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden flex-1 min-w-0">
                          <span className="text-[#888] font-bold w-6 text-center text-sm md:text-base flex-shrink-0">
                            {index + 4}
                          </span>
                          
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#222] flex-shrink-0 overflow-hidden border border-[#333]">
                            {profile.avatar_url ? (
                              <img 
                                src={profile.avatar_url} 
                                alt={profile.full_name || "User"} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-[#888]">
                                {getInitials(profile.full_name)}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold text-sm md:text-base truncate">
                                {profile.full_name || "Membro MASC"}
                              </span>
                              {/* Redes Sociais (Mobile - abaixo do nome) */}
                              <div className="flex items-center gap-2 mt-1 md:mt-0 md:hidden flex-shrink-0">
                                {profile.instagram && (
                                  <a 
                                    href={`https://instagram.com/${formatInsta(profile.instagram)}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-pink-500"
                                  >
                                    <Instagram size={12} />
                                  </a>
                                )}
                                {profile.phone && (
                                  <a 
                                    href={`https://wa.me/55${formatPhone(profile.phone)}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-emerald-500"
                                  >
                                    <Phone size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                            {/* Cargo (Desktop) */}
                            <span className="text-xs text-[#888] hidden md:block">
                              {getRoleLabel(profile)}
                            </span>
                          </div>
                        </div>

                        {/* Lado Direito: Ações (Desktop) e Pontos */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {/* Redes Sociais (Só Desktop) */}
                          <div className="hidden md:flex items-center gap-2">
                            {profile.instagram && (
                              <a 
                                href={`https://instagram.com/${formatInsta(profile.instagram)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-pink-500/20 rounded-full text-[#888] hover:text-pink-500 transition-colors"
                              >
                                <Instagram size={16} />
                              </a>
                            )}
                            {profile.phone && (
                              <a 
                                href={`https://wa.me/55${formatPhone(profile.phone)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-emerald-500/20 rounded-full text-[#888] hover:text-emerald-500 transition-colors"
                              >
                                <Phone size={16} />
                              </a>
                            )}
                          </div>

                          {/* Pontos */}
                          <div className="text-right">
                            <span className="block text-[#C9A66B] font-bold text-sm md:text-lg">
                              {formatNumber(profile.totalPros)}
                            </span>
                            <span className="text-[10px] text-[#888] uppercase">PRO</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {restOfRanking.length === 0 && (
                      <div className="p-8 text-center text-[#888] text-sm">
                        Fim da lista.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* CONTEÚDO FEED */}
        {activeTab === "feed" && (
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
        )}
      </div>
    </div>
  );
}
