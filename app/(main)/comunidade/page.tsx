"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { 
  Trophy, Heart, MessageSquare, Send, Loader2, 
  ImageIcon, MoreHorizontal, MessageCircle 
} from "lucide-react";

export default function ComunidadePage() {
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState<'ranking' | 'feed'>('feed');
  
  // Estados de Dados
  const [ranking, setRanking] = useState<any[]>([]); 
  const [posts, setPosts] = useState<any[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados de Interação
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentsData, setCommentsData] = useState<Record<string, any[]>>({});
  
  // Inputs e @ Mentions
  const [newPostText, setNewPostText] = useState("");
  const [commentText, setCommentText] = useState(""); 
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionTarget, setMentionTarget] = useState<'post' | 'comment' | null>(null);
  const [posting, setPosting] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mentionResults, setMentionResults] = useState<any[]>([]);

  const getTotalProfissional = (profile: any) => {
    const totalBase = Number(profile?.moedas_pro_acumuladas || 0);
    const moedasTecnicas = Number(profile?.personal_coins || 0);
    return totalBase + moedasTecnicas;
  };

  // Corretor de Segurança (toLocaleString)
  const formatNumber = (n: any) => {
    if (n === undefined || n === null) return "0";
    return Number(n).toLocaleString('pt-BR');
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Busca de usuários para o @ mention
  useEffect(() => {
    const buscarUsuarios = async () => {
      if (!mentionQuery || !mentionQuery.trim()) {
        setMentionResults([]);
        return;
      }

      const termoPesquisado = mentionQuery.trim();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name") // O @ precisa desses dois campos
        .ilike("full_name", `%${termoPesquisado}%`);

      setMentionResults(data || []);
    };

    buscarUsuarios();
  }, [mentionQuery]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        setCurrentUser(profile);
        
        const { data: likesData } = await supabase.from("likes").select("post_id").eq("user_id", session.user.id);
        if (likesData) setMyLikes(new Set(likesData.map(l => l.post_id)));
      }

      const { data: rankingData } = await supabase
        .from("profiles")
        .select("id, full_name, moedas_pro_acumuladas, personal_coins");

      if (rankingData) {
        const rankingNormalizado = rankingData
          .map((profile) => ({
            ...profile,
            pontos_totais: getTotalProfissional(profile),
          }))
          .sort((a, b) => b.pontos_totais - a.pontos_totais);

        setRanking(rankingNormalizado);
      }
      await refreshFeed();
    } finally {
      setLoading(false);
    }
  }

  async function refreshFeed() {
    const { data, error } = await supabase
      .from("community_posts")
      .select(`
        id,
        content,
        media_url,
        media_type,
        likes_count,
        created_at,
        user_id,
        profiles!community_posts_user_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar feed de community_posts:", error);
      return;
    }

    if (data) {
      setPosts(data);

      // Pré-carrega contagem de comentários por post para exibir o número sempre
      const postIds = data.map((p: any) => p.id);
      if (postIds.length) {
        const { data: allComments } = await supabase
          .from("comments")
          .select("id, post_id")
          .in("post_id", postIds);

        const counts: Record<string, number> = {};
        (allComments || []).forEach((c: any) => {
          counts[c.post_id] = (counts[c.post_id] || 0) + 1;
        });
        setCommentCounts(counts);
      } else {
        setCommentCounts({});
      }
    }
  }

  // Lógica de @ Mention
  const handleTyping = (text: string, target: 'post' | 'comment') => {
    target === 'post' ? setNewPostText(text) : setCommentText(text);
    const words = text.split(/\s/);
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith("@") && lastWord.length > 1) {
      setMentionQuery(lastWord.substring(1));
      setMentionTarget(target);
    } else {
      setMentionQuery(null);
    }
  };

  const selectMention = (userName: string) => {
    const text = mentionTarget === 'post' ? newPostText : commentText;
    const words = text.split(/\s/);
    words.pop();
    const newText = [...words, `@${userName} `].join(" ");
    mentionTarget === 'post' ? setNewPostText(newText) : setCommentText(newText);
    setMentionQuery(null);
  };

  const MentionMenu = () => {
    if (!mentionQuery) return null;
    if (!mentionResults.length) return null;
    return (
      <div className="absolute z-[100] bg-zinc-900 border border-white/10 w-64 rounded-xl shadow-2xl overflow-hidden mb-2 bottom-full">
        {mentionResults.slice(0, 5).map((u: any) => (
          <button key={u.id} onClick={() => selectMention(u.full_name)} className="w-full text-left p-3 hover:bg-zinc-800 text-xs font-bold border-b border-white/5 last:border-0 text-white">
            {u.full_name}
          </button>
        ))}
      </div>
    );
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    const isLiked = myLikes.has(postId);
    const newLikes = new Set(myLikes);
    if (isLiked) newLikes.delete(postId); else newLikes.add(postId);
    setMyLikes(newLikes);

    setPosts(posts.map(p => p.id === postId ? { ...p, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 } : p));
  const { error } = await supabase.rpc('toggle_like', { p_post_id: postId, p_user_id: currentUser.id });
    if (error) {
      console.error("Erro ao registrar like no Supabase:", error);
    }
  };

  const toggleComments = async (postId: string) => {
    if (openComments === postId) {
      setOpenComments(null);
    } else {
      setOpenComments(postId);
      const { data } = await supabase.from("comments").select(`*, profiles(full_name, avatar_url)`).eq("post_id", postId).order("created_at", { ascending: true });
      if (data) setCommentsData(prev => ({ ...prev, [postId]: data }));
    }
  };

  const sendComment = async (postId: string) => {
    if (!commentText.trim() || !currentUser) return;
    const texto = commentText.trim();

    // Salva o comentário
    const { error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: currentUser.id, content: texto });

    if (error) {
      console.error("Erro ao salvar comentário no Supabase:", error);
      alert("Não foi possível salvar seu comentário. Veja o console (F12) para detalhes.");
      return;
    }

    setCommentText("");
    const { data } = await supabase
      .from("comments")
      .select(`*, profiles(full_name, avatar_url)`)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (data) {
      setCommentsData(prev => ({ ...prev, [postId]: data }));
      setCommentCounts(prev => ({ ...prev, [postId]: data.length }));
    }

    // Notificação para o dono do post (resposta ao post)
    const postOriginal = posts.find(p => p.id === postId);
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (postOriginal && user && postOriginal.user_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: postOriginal.user_id,      // Dono do post
        actor_id: user.id,                 // Quem respondeu
        type: "reply",
        content: `respondeu ao seu post na comunidade: "${texto.substring(0, 20)}..."`,
        link: "/comunidade",
        read: false,
      });
    }
  };

  // Upload de mídia para o Storage
  const uploadMedia = async (file: File | null): Promise<string | null> => {
    if (!file) return null;
    const fileName = `${Math.random()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("community-media")
      .upload(fileName, file);

    if (error || !data) return null;

    const publicUrl = supabase.storage
      .from("community-media")
      .getPublicUrl(fileName).data.publicUrl;

    return publicUrl || null;
  };

  const handlePublish = async () => {
    if ((!newPostText.trim() && !arquivo) || !currentUser) return;
    setPosting(true);
    try {
      let mediaUrl: string | null = null;

      if (arquivo) {
        mediaUrl = await uploadMedia(arquivo);
      }

      const { error } = await supabase
        .from("community_posts")
        .insert({
        user_id: currentUser.id,
        content: newPostText.trim() || null,
        media_url: mediaUrl,
        media_type: arquivo ? (arquivo.type.includes("video") ? "video" : "image") : null,
      });

      if (error) {
        console.error("Erro ao publicar post no Supabase:", error);
        alert("Não foi possível publicar seu post. Veja o console (F12) para detalhes.");
        return;
      }

      setNewPostText("");
      setArquivo(null);
      await refreshFeed();
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      <div className="p-4 md:p-8 min-h-screen bg-black text-white font-sans pb-24">
        <h1 className="text-3xl font-black italic uppercase mb-8">COMUNIDADE <span className="text-[#C9A66B]">PRO</span></h1>

        {/* TABS */}
        <div className="flex bg-zinc-900/50 p-1 rounded-2xl mb-10 border border-white/5">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${
              activeTab === 'feed' ? "bg-[#C9A66B] text-black shadow-lg" : "text-zinc-500"
            }`}
          >
            Feed Social
          </button>
              <button 
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${
              activeTab === 'ranking' ? "bg-[#C9A66B] text-black shadow-lg" : "text-zinc-500"
            }`}
          >
            Ranking
              </button>
            </div>

        {/* RANKING */}
        {activeTab === 'ranking' && (
          <div className="max-w-3xl mx-auto space-y-2">
            {ranking.map((profile, index) => (
              <div key={profile.id} className={`p-4 rounded-2xl border ${profile.id === currentUser?.id ? "border-[#C9A66B] bg-[#C9A66B]/5" : "border-white/5 bg-zinc-900/30"}`}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-zinc-700 italic">#{index + 1}</span>
                    <p className="font-black text-sm uppercase tracking-tight">{profile.full_name}</p>
                  </div>
                  <p className="text-[#C9A66B] font-black text-2xl italic tracking-tighter">{formatNumber(profile.pontos_totais)} <span className="text-xs font-bold">PRO</span></p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FEED SOCIAL */}
        {activeTab === 'feed' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* CAMPO DE POSTAR */}
            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl relative">
              <textarea 
                value={newPostText} 
                onChange={(e) => handleTyping(e.target.value, 'post')} 
                placeholder="No que você está trabalhando hoje? (Use @)" 
                className="w-full bg-transparent text-sm outline-none h-24 resize-none" 
              />
              {mentionTarget === 'post' && <MentionMenu />}
              {/* Upload de mídia */}
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                className="hidden"
                id="file-upload"
              />
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer p-2 hover:bg-zinc-800 rounded-full text-sm text-zinc-400"
                >
                  📷
                </label>
                <button onClick={handlePublish} disabled={posting} className="bg-[#C9A66B] text-black px-8 py-2 rounded-xl font-black text-[10px] uppercase italic">
                  {posting ? <Loader2 className="animate-spin" size={14}/> : "POSTAR"}
                </button>
              </div>
            </div>

            {/* LISTA DE POSTS */}
            <div className="space-y-4">
              {posts.map((post) => {
                const isLiked = myLikes.has(post.id);
                const commentCount = commentCounts[post.id] ?? commentsData[post.id]?.length ?? 0;
                return (
                  <div key={post.id} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
                        {post.profiles?.avatar_url && <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />}
                      </div>
                      <p className="font-black text-xs text-[#C9A66B] uppercase italic">{post.profiles?.full_name}</p>
                    </div>
                    {post.content && (
                      <p className="text-sm text-zinc-300 mb-4 leading-relaxed">
                        {post.content.split(" ").map((word: string, i: number) => 
                          word.startsWith("@") ? <span key={i} className="text-[#C9A66B] font-bold">{word} </span> : word + " "
                        )}
                      </p>
                    )}
                    {post.media_url && post.media_type === "image" && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-white/10">
                        <img src={post.media_url} className="w-full max-h-[420px] object-cover" />
                      </div>
                    )}
                    {post.media_url && post.media_type === "video" && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-white/10">
                        <video src={post.media_url} controls className="w-full max-h-[420px] object-contain bg-black" />
                      </div>
                    )}
                    <div className="flex gap-8 border-t border-white/5 pt-4">
                      <button onClick={() => handleLike(post.id)} className={`flex items-center gap-2 text-[10px] font-black uppercase transition-all ${isLiked ? "text-red-500 scale-110" : "text-zinc-500"}`}>
                        <Heart size={20} fill={isLiked ? "currentColor" : "none"} /> {post.likes_count || 0}
                      </button>
                      <button onClick={() => toggleComments(post.id)} className={`flex items-center gap-2 text-[10px] font-black uppercase ${openComments === post.id ? "text-[#C9A66B]" : "text-zinc-500"}`}>
                        <MessageSquare size={20} /> {commentCount > 0 ? `Comentários (${commentCount})` : "Comentar"}
                      </button>
        </div>

                    {/* SEÇÃO DE COMENTÁRIOS */}
                    {openComments === post.id && (
                      <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                        <div className="relative flex gap-2">
                          <input 
                            value={commentText} 
                            onChange={(e) => handleTyping(e.target.value, 'comment')}
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none" 
                            placeholder="Adicione um comentário... (@)"
                          />
                          <button onClick={() => sendComment(post.id)} className="bg-[#C9A66B] p-3 rounded-xl text-black">
                            <Send size={18}/>
                          </button>
                          {mentionTarget === 'comment' && <MentionMenu />}
                        </div>
                        <div className="space-y-3">
                          {commentsData[post.id]?.map((c: any) => (
                            <div key={c.id} className="bg-white/5 p-3 rounded-xl">
                              <p className="text-[10px] font-black text-[#C9A66B] uppercase mb-1">{c.profiles?.full_name}</p>
                              <p className="text-xs text-zinc-400">{c.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
