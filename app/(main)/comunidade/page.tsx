"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { MessageSquare, Heart, Share2, Send, Crown, Medal, Trophy, Sparkles } from "lucide-react";

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

  // Carregar perfil do usuário logado (apenas para verificar se está logado)
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

  // Carregar posts da comunidade (TODOS os posts, sem filtro)
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

  // Carregar ranking (TODOS os usuários com lógica baseada em work_type)
  useEffect(() => {
    async function fetchRanking() {
      if (!currentProfile) return;

      let query;

      // Cenário A: Se usuário é Distribuidor (acesso VIP)
      if (isDistribuidor) {
        if (rankingFilter === "distribuidores") {
          // Buscar TODOS os Distribuidores
          query = supabase
            .from("profiles")
            .select("*")
            .eq("work_type", "Distribuidor")
            .order("coins", { ascending: false });
        } else {
          // Buscar TODOS os Profissionais (excluir Distribuidores)
          query = supabase
            .from("profiles")
            .select("*")
            .neq("work_type", "Distribuidor")
            .order("coins", { ascending: false });
        }
      } else {
        // Cenário B: Se é Cabeleireiro ou Embaixador
        // Buscar Ranking Geral completo (excluir Distribuidores)
        query = supabase
          .from("profiles")
          .select("*")
          .neq("work_type", "Distribuidor")
          .order("coins", { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao buscar ranking:", error);
        console.log("Detalhes do erro:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        setRanking([]);
        return;
      }

      if (!data || data.length === 0) {
        console.log("Ranking vazio - nenhum usuário encontrado");
        console.log("Filtro aplicado:", {
          isDistribuidor,
          rankingFilter: isDistribuidor ? rankingFilter : "profissionais",
        });
        setRanking([]);
        return;
      }

      console.log(`Ranking carregado: ${data.length} usuários encontrados`);
      
      const rankingData = data.map((user: any, index: number) => ({
        ...user,
        position: index + 1,
        totalPros: user.coins || 0,
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
      // Recarregar posts automaticamente
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
    // Verificar se tem specialty para mostrar profissão
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
    <div className="max-w-[1200px] mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
          Comunidade <span className="text-[#C9A66B]">MASC</span>
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Comunidade {" > "} {activeTab === "feed" ? "Feed" : "Ranking"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#222]">
        <button
          onClick={() => setActiveTab("feed")}
          className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors relative ${
            activeTab === "feed"
              ? "text-[#C9A66B]"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Feed
          {activeTab === "feed" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A66B]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("ranking")}
          className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors relative ${
            activeTab === "ranking"
              ? "text-[#C9A66B]"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Ranking
          {activeTab === "ranking" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A66B]" />
          )}
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      {activeTab === "feed" ? (
        <div className="space-y-4">
          {/* Input de Post */}
          <form
            onSubmit={handlePostSubmit}
            className="bg-[#0A0A0A] border border-[#222] rounded-2xl p-6 space-y-4"
          >
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="O que está acontecendo no seu salão?"
              className="w-full bg-transparent border-none text-white placeholder:text-slate-600 resize-none focus:outline-none min-h-[120px] text-sm"
              maxLength={500}
            />
            <div className="flex justify-between items-center border-t border-[#222] pt-4">
              <span className="text-xs text-slate-500">
                {postContent.length}/500
              </span>
              <button 
                type="submit"
                disabled={posting || !postContent.trim()}
                className="bg-[#C9A66B] text-black font-black px-6 py-2 rounded-xl text-xs uppercase hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-opacity"
              >
                {posting ? "Postando..." : "Postar"} <Send size={14} />
              </button>
            </div>
          </form>

          {/* Lista de Posts */}
          <div className="space-y-4">
            {loading ? (
              <div className="bg-[#0A0A0A] border border-[#222] rounded-2xl p-8 text-center">
                <p className="text-slate-500 text-sm">Carregando feed...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-[#0A0A0A] border border-[#222] rounded-2xl p-8 text-center">
                <p className="text-slate-500 text-sm">
                  Nenhum post ainda. Seja o primeiro a compartilhar!
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-[#0A0A0A] border border-[#222] rounded-2xl p-6 space-y-4 hover:border-[#333] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#C9A66B] to-amber-200 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
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

                    {/* Nome e Cargo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">
                          {post.profiles?.full_name || "Membro MASC"}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 uppercase tracking-tight mt-0.5">
                        {getRoleLabel(post.profiles)}
                      </p>
                    </div>
                  </div>

                  {/* Conteúdo do Post */}
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Ações */}
                  <div className="flex items-center gap-6 pt-4 border-t border-[#222]">
                    <button className="flex items-center gap-2 text-slate-500 hover:text-[#C9A66B] transition-colors group">
                      <Heart
                        size={18}
                        className="group-hover:fill-[#C9A66B] group-hover:stroke-[#C9A66B]"
                      />
                      <span className="text-xs">0</span>
                  </button>
                    <button className="flex items-center gap-2 text-slate-500 hover:text-[#C9A66B] transition-colors group">
                      <MessageSquare size={18} />
                      <span className="text-xs">0</span>
                  </button>
                  <button className="flex items-center gap-2 text-slate-500 hover:text-[#C9A66B] transition-colors ml-auto">
                      <Share2 size={18} />
                  </button>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filtro de Ranking (apenas para Distribuidores - Acesso VIP) */}
          {isDistribuidor && (
            <div className="flex gap-2 bg-[#0A0A0A] border border-[#222] rounded-xl p-2">
              <button
                onClick={() => setRankingFilter("profissionais")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${
                  rankingFilter === "profissionais"
                    ? "bg-[#C9A66B] text-black"
                    : "bg-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                Ranking Profissionais
              </button>
              <button
                onClick={() => setRankingFilter("distribuidores")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${
                  rankingFilter === "distribuidores"
                    ? "bg-[#C9A66B] text-black"
                    : "bg-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                Ranking Distribuidores
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-[#0A0A0A] border border-[#222] rounded-2xl p-8 text-center">
              <p className="text-slate-500 text-sm">Carregando ranking...</p>
            </div>
          ) : ranking.length === 0 ? (
            <div className="bg-[#0A0A0A] border border-[#222] rounded-2xl p-8 text-center">
              <p className="text-slate-500 text-sm">
                Nenhum usuário no ranking ainda.
              </p>
            </div>
          ) : (
            <div className="max-h-[800px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {/* Top 3 - Destaque (Ouro, Prata, Bronze) */}
              {ranking.length > 0 && ranking.slice(0, 3).map((user, index) => {
                const position = index + 1;
                const isFirst = position === 1;
                const isSecond = position === 2;
                const isThird = position === 3;

                return (
                  <div
                    key={user.id}
                    className={`bg-[#0A0A0A] border-2 rounded-2xl p-6 ${
                      isFirst
                        ? "border-[#C9A66B] shadow-lg shadow-[#C9A66B]/20"
                        : isSecond
                        ? "border-slate-400"
                        : isThird
                        ? "border-amber-600"
                        : "border-[#222]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Posição com Ícone */}
                      <div className="flex-shrink-0">
                        {isFirst ? (
                          <div className="relative">
                            <Crown
                              size={32}
                              className="text-[#C9A66B] fill-[#C9A66B]"
                            />
                            <Sparkles
                              size={16}
                              className="absolute -top-1 -right-1 text-[#C9A66B] animate-pulse"
                            />
                          </div>
                        ) : isSecond ? (
                          <Medal size={32} className="text-slate-400 fill-slate-400" />
                        ) : (
                          <Trophy size={32} className="text-amber-600 fill-amber-600" />
                        )}
                      </div>

                      {/* Avatar */}
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-black font-bold text-lg flex-shrink-0 ${
                          isFirst
                            ? "bg-gradient-to-tr from-[#C9A66B] to-amber-200 ring-2 ring-[#C9A66B]"
                            : isSecond
                            ? "bg-gradient-to-tr from-slate-300 to-slate-100 ring-2 ring-slate-400"
                            : "bg-gradient-to-tr from-amber-300 to-amber-100 ring-2 ring-amber-600"
                        }`}
                      >
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

                      {/* Nome e PROs */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-lg font-black ${
                            isFirst ? "text-[#C9A66B]" : "text-white"
                          }`}
                        >
                          {user.full_name || "Membro MASC"}
                        </p>
                        <p className="text-xs text-slate-500 uppercase tracking-tight mt-0.5">
                          {getRoleLabel(user)}
                        </p>
                      </div>

                      {/* Total de PROs */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                          Total PROs
                        </p>
                        <p
                          className={`text-2xl font-black ${
                            isFirst ? "text-[#C9A66B]" : "text-white"
                          }`}
                        >
                          {formatNumber(user.totalPros)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Restante do Ranking (4+) - Lista Compacta - TODOS os itens */}
              {ranking.length > 3 && ranking.slice(3).map((user) => (
                <div
                  key={user.id}
                  className="bg-[#0A0A0A] border border-[#222] rounded-xl p-3 hover:border-[#333] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Posição */}
                    <div className="w-6 text-center flex-shrink-0">
                      <p className="text-xs font-bold text-slate-500">
                        #{user.position}
                      </p>
                    </div>

                    {/* Avatar Pequeno */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#C9A66B]/20 to-amber-200/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 border border-[#222]">
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

                    {/* Nome e Profissão */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">
                        {user.full_name || "Membro MASC"}
                      </p>
                      <p className="text-xs text-slate-500 uppercase tracking-tight mt-0.5">
                        {getRoleLabel(user)}
                      </p>
                    </div>

                    {/* Total de PROs */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-[#C9A66B]">
                        {formatNumber(user.totalPros)} PRO
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
