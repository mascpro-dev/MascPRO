"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, Medal, MessageSquare, Heart, ImageIcon, MoreHorizontal, X, Loader2, Send, Crown } from "lucide-react";

export default function ComunidadePage() {
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState<'ranking' | 'feed'>('ranking');
  
  // Dados
  const [ranking, setRanking] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [rankingFilter, setRankingFilter] = useState<"Profissional" | "Distribuidor">("Profissional");

  // Estado do Post
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar se usuário é Distribuidor
  const isDistribuidor = currentProfile?.work_type === "Distribuidor" || 
                         currentProfile?.work_type === "distribuidor" ||
                         currentProfile?.role === "Distribuidor" || 
                         currentProfile?.role === "distribuidor";

  useEffect(() => {
    fetchData();
  }, [rankingFilter, isDistribuidor]);

  async function fetchData() {
    try {
      setLoading(true);
      
      // 1. Identificar Usuário Atual
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setCurrentProfile(myProfile);
        setCurrentUser(myProfile || { id: user.id, full_name: "Eu", avatar_url: null });
      }

      // 2. Buscar Ranking com filtro
      let query = supabase
        .from("profiles")
        .select("id, full_name, avatar_url, coins, personal_coins, role, work_type, specialty");

      if (isDistribuidor) {
        if (rankingFilter === "Distribuidor") {
          query = query.eq("work_type", "Distribuidor");
        } else {
          query = query.neq("work_type", "Distribuidor");
        }
      } else {
        query = query.neq("work_type", "Distribuidor");
      }

      const { data: profiles } = await query;

      if (profiles) {
        const sortedProfiles = profiles.map(p => ({
          ...p,
          total_coins: (p.coins || 0) + (p.personal_coins || 0),
          name: p.full_name || "Membro MASC"
        })).sort((a, b) => b.total_coins - a.total_coins);
        setRanking(sortedProfiles);
      }

      // 3. Buscar Feed
      await refreshFeed();

    } catch (error) {
      console.error("Erro ao carregar:", error);
    } finally {
      setLoading(false);
    }
  }

  async function refreshFeed() {
    const { data: postsData } = await supabase
      .from("posts")
      .select(`
        id, content, image_url, created_at, likes_count,
        profiles (full_name, avatar_url, role)
      `)
      .order("created_at", { ascending: false });

    if (postsData) setPosts(postsData);
  }

  // --- POSTAR ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewPostImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePublish = async () => {
    if (!newPostText.trim() && !newPostImage) {
      alert("Escreva algo ou adicione uma foto!");
      return;
    }
    if (!currentUser) {
      alert("Erro: Usuário não identificado. Faça login novamente.");
      return;
    }

    try {
      setPosting(true);
      let finalImageUrl = null;

      // Upload da Foto
      if (newPostImage) {
        const fileExt = newPostImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("feed-images")
          .upload(fileName, newPostImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("feed-images")
          .getPublicUrl(fileName);
        
        finalImageUrl = publicUrl;
      }

      // Salvar no Banco
      const { error: dbError } = await supabase.from("posts").insert({
        user_id: currentUser.id,
        content: newPostText,
        image_url: finalImageUrl
      });

      if (dbError) throw dbError;

      // Limpar formulário
      setNewPostText("");
      setNewPostImage(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      await refreshFeed();
      
    } catch (error: any) {
      console.error(error);
      alert("Não foi possível postar: " + (error.message || "Erro desconhecido"));
    } finally {
      setPosting(false);
    }
  };

  // Renderizar @Menções
  const renderText = (text: string) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((part, index) => {
      if (part.startsWith('@') && part.length > 1) {
        return <span key={index} className="text-[#C9A66B] font-bold cursor-pointer">{part}</span>;
      }
      return part;
    });
  };

  const timeAgo = (dateString: string) => {
    const diff = (new Date().getTime() - new Date(dateString).getTime()) / 1000;
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
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
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold italic tracking-wide">
          COMUNIDADE <span className="text-[#C9A66B]">PRO</span>
        </h1>
        <p className="text-gray-400 mt-2 text-sm">Ranking e Networking.</p>
      </div>

      {/* Abas */}
      <div className="flex w-full bg-[#111] p-1 rounded-xl mb-6 border border-[#222]">
        <button 
          onClick={() => setActiveTab('ranking')} 
          className={`flex-1 py-3 text-xs md:text-sm font-bold uppercase rounded-lg transition-all ${
            activeTab === 'ranking' 
              ? "bg-[#C9A66B] text-black" 
              : "text-gray-500 hover:text-white"
          }`}
        >
          Ranking
        </button>
        <button 
          onClick={() => setActiveTab('feed')} 
          className={`flex-1 py-3 text-xs md:text-sm font-bold uppercase rounded-lg transition-all ${
            activeTab === 'feed' 
              ? "bg-[#C9A66B] text-black" 
              : "text-gray-500 hover:text-white"
          }`}
        >
          Feed Social
        </button>
      </div>

      {/* === RANKING === */}
      {activeTab === 'ranking' && (
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Filtro para Distribuidores */}
          {isDistribuidor && (
            <div className="flex justify-center bg-[#111] p-1 rounded-lg w-fit mx-auto mb-4 border border-[#222]">
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
            <div className="text-center text-gray-500 py-10 animate-pulse">
              Carregando ranking...
            </div>
          ) : ranking.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              Ninguém no ranking ainda.
            </div>
          ) : (
            ranking.map((profile, index) => {
              const isMe = currentUser && profile.id === currentUser.id;
              const position = index + 1;
              let MedalIcon = Medal;
              let medalColor = "text-gray-600";
              
              if (position === 1) {
                MedalIcon = Crown;
                medalColor = "text-yellow-400";
              } else if (position === 2) {
                medalColor = "text-gray-300";
              } else if (position === 3) {
                medalColor = "text-amber-700";
              }

              return (
                <div 
                  key={profile.id} 
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isMe 
                      ? "border-[#C9A66B] bg-[#C9A66B]/10" 
                      : "border-[#222] bg-[#111] hover:border-[#333]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`font-black text-lg w-8 text-center ${medalColor}`}>
                      {position <= 3 ? (
                        <MedalIcon className={`w-6 h-6 mx-auto ${position === 1 ? "fill-yellow-400" : ""}`} />
                      ) : (
                        `#${position}`
                      )}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#222] overflow-hidden border border-[#333]">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                            {profile.name.substring(0,2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isMe ? "text-[#C9A66B]" : "text-white"}`}>
                          {profile.name} {isMe && "(Você)"}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">
                          {getRoleLabel(profile)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                    <Trophy className="w-3 h-3 text-[#C9A66B]" />
                    <span className="font-bold text-sm">{formatNumber(profile.total_coins)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* === FEED === */}
      {activeTab === 'feed' && (
        <div className="max-w-2xl mx-auto">
          
          {/* CRIAR POST */}
          <div className="bg-[#111] border border-[#222] p-4 rounded-xl mb-6">
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#222] shrink-0 overflow-hidden border border-[#333]">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                    {currentUser?.full_name?.substring(0,2).toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <textarea 
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Compartilhe sua evolução... Use @ para marcar."
                className="w-full bg-transparent text-sm text-white placeholder-gray-600 outline-none resize-none h-20"
              />
            </div>

            {previewUrl && (
              <div className="relative mb-3 w-fit">
                <img src={previewUrl} className="h-40 rounded-lg border border-[#333]" alt="Preview" />
                <button 
                  onClick={() => { 
                    setNewPostImage(null); 
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }
                  }} 
                  className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                >
                  <X size={12}/>
                </button>
              </div>
            )}

            <div className="flex justify-between items-center border-t border-[#222] pt-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageSelect} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="text-gray-400 hover:text-white flex items-center gap-2 text-xs font-bold transition-colors"
              >
                <ImageIcon size={18} /> FOTO
              </button>
              <button 
                onClick={handlePublish} 
                disabled={posting || (!newPostText.trim() && !newPostImage)} 
                className="bg-[#C9A66B] text-black text-xs font-bold px-6 py-2 rounded-lg hover:bg-[#b08d55] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {posting ? (
                  <Loader2 size={16} className="animate-spin"/>
                ) : (
                  <>
                    <Send size={14}/> POSTAR
                  </>
                )}
              </button>
            </div>
          </div>

          {/* LISTA POSTS */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center text-gray-500 py-10 animate-pulse">
                Carregando feed...
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                <p>Ainda não há publicações.</p>
                <p className="text-xs mt-2">Seja o primeiro a postar!</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
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
                        <p className="text-sm font-bold text-white">{post.profiles?.full_name || "Membro"}</p>
                        <p className="text-[10px] text-gray-500">{timeAgo(post.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {post.content && (
                    <div className="px-4 pb-3 text-sm text-gray-300 whitespace-pre-wrap">
                      {renderText(post.content)}
                    </div>
                  )}
                  
                  {post.image_url && (
                    <div className="w-full bg-black">
                      <img src={post.image_url} className="w-full h-auto max-h-[500px] object-contain" alt="Post" />
                    </div>
                  )}

                  <div className="p-3 border-t border-[#222] flex gap-4 text-gray-500">
                    <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                      <Heart size={18}/> 
                      <span className="text-xs">{post.likes_count || 0}</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                      <MessageSquare size={18}/> 
                      <span className="text-xs">Comentar</span>
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
