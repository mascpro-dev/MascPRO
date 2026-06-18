"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { 
  Trophy, Heart, MessageSquare, Send, Loader2, 
  ImageIcon, Trash2, MessageCircle, Zap, Users, Video,
} from "lucide-react";
import Link from "next/link";
import { getProBreakdown } from "@/lib/proScore";

export default function ComunidadePage() {
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState<'feed' | 'ranking' | 'conquistas'>('feed');
  const [conquistas, setConquistas] = useState<any[]>([]);
  const [loadingConquistas, setLoadingConquistas] = useState(false);
  
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
  const [mediaKind, setMediaKind] = useState<"image" | "video" | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadErro, setUploadErro] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isAdmin =
    String(currentUser?.role || "").trim().toUpperCase() === "ADMIN";

  const clearMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setArquivo(null);
    setMediaKind(null);
    setMediaPreview(null);
    setUploadErro("");
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handlePickFile = (file: File | undefined, kind: "image" | "video") => {
    if (!file) return;
    setUploadErro("");
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setArquivo(file);
    setMediaKind(kind);
    setMediaPreview(URL.createObjectURL(file));
  };

  const deletePost = async (postId: string) => {
    if (!isAdmin || !confirm("Apagar este post da comunidade?")) return;
    setDeletingId(postId);
    try {
      const res = await fetch("/api/comunidade/moderacao", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "post", id: postId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Não foi possível apagar o post.");
        return;
      }
      if (openComments === postId) setOpenComments(null);
      await refreshFeed();
    } finally {
      setDeletingId(null);
    }
  };

  const deleteComment = async (commentId: string, postId: string) => {
    if (!isAdmin || !confirm("Apagar este comentário?")) return;
    setDeletingId(commentId);
    try {
      const res = await fetch("/api/comunidade/moderacao", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "comment", id: commentId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Não foi possível apagar o comentário.");
        return;
      }
      const { data: refreshed } = await supabase
        .from("comments")
        .select(`*, profiles(full_name, avatar_url)`)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (refreshed) {
        setCommentsData((prev) => ({ ...prev, [postId]: refreshed }));
        setCommentCounts((prev) => ({ ...prev, [postId]: refreshed.length }));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const getTotalProfissional = (profile: any) => {
    return getProBreakdown(profile || {}).total;
  };

  // Corretor de Segurança (toLocaleString)
  const formatNumber = (n: any) => {
    if (n === undefined || n === null) return "0";
    return Number(n).toLocaleString('pt-BR');
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

  useEffect(() => {
    if (activeTab === "conquistas" && conquistas.length === 0) {
      setLoadingConquistas(true);
      fetch("/api/conquistas").then(r => r.json()).then(d => {
        setConquistas(d.eventos || []);
      }).finally(() => setLoadingConquistas(false));
    }
  }, [activeTab]);

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
        .select("id, full_name, personal_coins, network_coins, total_compras_proprias, total_compras_rede, pro_total");

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

  const uploadMedia = async (
    file: File | null,
    kind: "image" | "video" | null
  ): Promise<{ url: string; media_type: "image" | "video" } | null> => {
    if (!file) return null;
    const fd = new FormData();
    fd.append("file", file, file.name || (kind === "video" ? "video.mp4" : "foto.jpg"));
    const res = await fetch("/api/comunidade/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok || !data?.url) {
      setUploadErro(data?.error || "Falha ao enviar mídia. Tente outra foto/vídeo.");
      return null;
    }
    return { url: data.url, media_type: data.media_type === "video" ? "video" : "image" };
  };

  const handlePublish = async () => {
    if ((!newPostText.trim() && !arquivo) || !currentUser) return;
    setPosting(true);
    setUploadErro("");
    try {
      let mediaUrl: string | null = null;
      let mediaType: "image" | "video" | null = null;

      if (arquivo) {
        const uploaded = await uploadMedia(arquivo, mediaKind);
        if (!uploaded) {
          if (!newPostText.trim()) return;
        } else {
          mediaUrl = uploaded.url;
          mediaType = uploaded.media_type;
        }
      }

      const { error } = await supabase.from("community_posts").insert({
        user_id: currentUser.id,
        content: newPostText.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
      });

      if (error) {
        console.error("Erro ao publicar post no Supabase:", error);
        alert("Não foi possível publicar seu post. Veja o console (F12) para detalhes.");
        return;
      }

      setNewPostText("");
      clearMedia();
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
        <div className="flex bg-zinc-900/50 p-1 rounded-2xl mb-8 border border-white/5">
          {[
            { key: "feed", label: "Feed Social" },
            { key: "ranking", label: "Ranking" },
            { key: "conquistas", label: "⚡ Atividade" },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${activeTab === t.key ? "bg-[#C9A66B] text-black shadow-lg" : "text-zinc-500"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* LINK REDE DE PROFISSIONAIS */}
        <Link href="/profissionais" className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 hover:border-[#C9A66B]/40 rounded-2xl px-5 py-3 mb-6 transition-all group">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-[#C9A66B]" />
            <div>
              <p className="text-sm font-black uppercase">Rede de Profissionais</p>
              <p className="text-[10px] text-zinc-500">Encontre profissionais perto de você</p>
            </div>
          </div>
          <span className="text-[10px] text-zinc-600 group-hover:text-[#C9A66B] font-bold uppercase">Ver →</span>
        </Link>

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

        {/* CONQUISTAS / ATIVIDADE */}
        {activeTab === "conquistas" && (
          <div className="max-w-2xl mx-auto">
            {loadingConquistas ? (
              <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-[#C9A66B]" size={28} /></div>
            ) : conquistas.length === 0 ? (
              <p className="text-zinc-600 text-center mt-10">Nenhuma atividade recente.</p>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-zinc-800" />
                <div className="space-y-4">
                  {conquistas.map(e => (
                    <div key={e.id} className="relative">
                      <div className="absolute -left-4 top-3 w-3 h-3 rounded-full border-2 border-[#C9A66B] bg-black" />
                      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className="text-xl shrink-0">{e.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold leading-tight">{e.titulo}</p>
                            {e.subtitulo && <p className="text-[11px] text-zinc-500 mt-0.5">{e.subtitulo}</p>}
                          </div>
                          <span className="text-[9px] text-zinc-700 font-bold shrink-0">
                            {new Date(e.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
              {mediaPreview && (
                <div className="relative mt-3 mb-2 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                  {mediaKind === "video" ? (
                    <video src={mediaPreview} controls className="w-full max-h-56 object-contain" />
                  ) : (
                    <img src={mediaPreview} alt="Prévia" className="w-full max-h-56 object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={clearMedia}
                    className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-lg"
                  >
                    Remover
                  </button>
                </div>
              )}
              {uploadErro && (
                <p className="text-[11px] text-red-400 mt-2">{uploadErro}</p>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
                onChange={(e) => {
                  handlePickFile(e.target.files?.[0], "image");
                  e.target.value = "";
                }}
                className="hidden"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/3gpp,.mp4,.mov"
                onChange={(e) => {
                  handlePickFile(e.target.files?.[0], "video");
                  e.target.value = "";
                }}
                className="hidden"
              />
              <div className="flex justify-between items-center pt-2 border-t border-white/5 gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="flex items-center gap-1 p-2 hover:bg-zinc-800 rounded-full text-[10px] font-bold uppercase text-zinc-400"
                  >
                    <ImageIcon size={18} /> Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="flex items-center gap-1 p-2 hover:bg-zinc-800 rounded-full text-[10px] font-bold uppercase text-zinc-400"
                  >
                    <Video size={18} /> Vídeo
                  </button>
                </div>
                <button onClick={handlePublish} disabled={posting} className="bg-[#C9A66B] text-black px-8 py-2 rounded-xl font-black text-[10px] uppercase italic shrink-0">
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
                      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden shrink-0">
                        {post.profiles?.avatar_url && <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />}
                      </div>
                      <p className="font-black text-xs text-[#C9A66B] uppercase italic flex-1 min-w-0 truncate">{post.profiles?.full_name}</p>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => deletePost(post.id)}
                          disabled={deletingId === post.id}
                          className="text-red-400/80 hover:text-red-400 p-2 rounded-lg hover:bg-red-950/30 shrink-0"
                          title="Apagar post (admin)"
                        >
                          {deletingId === post.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
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
                            <div key={c.id} className="bg-white/5 p-3 rounded-xl flex gap-2 items-start">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-[#C9A66B] uppercase mb-1">{c.profiles?.full_name}</p>
                                <p className="text-xs text-zinc-400 break-words">{c.content}</p>
                              </div>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => deleteComment(c.id, post.id)}
                                  disabled={deletingId === c.id}
                                  className="text-red-400/70 hover:text-red-400 p-1 shrink-0"
                                  title="Apagar comentário (admin)"
                                >
                                  {deletingId === c.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>
                              )}
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
