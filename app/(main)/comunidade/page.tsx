"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, Medal, MessageSquare, Heart, ImageIcon, MoreHorizontal, X, Loader2, Send, Crown, CornerDownRight, MessageCircle, Bell, User } from "lucide-react";

export default function ComunidadePage() {
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState<'ranking' | 'feed'>('ranking');
  
  // Dados Principais
  const [ranking, setRanking] = useState<any[]>([]); // Usaremos o ranking como lista de usuários para marcar
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Notificações
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Interação
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentsData, setCommentsData] = useState<Record<string, any[]>>({});
  
  // Inputs e Menções
  const [commentText, setCommentText] = useState("");
  const [newPostText, setNewPostText] = useState("");
  
  // Estado para controlar o MENU DE MENÇÃO (@)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionTargetField, setMentionTargetField] = useState<'post' | 'comment' | null>(null);

  // Upload
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  
  // Respostas
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [sendingComment, setSendingComment] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. CARREGAMENTO INICIAL
  useEffect(() => {
    fetchData();
    
    // Inscreve para notificações em tempo real
    const channel = supabase.channel('realtime_notifications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        if (currentUser && payload.new.user_id === currentUser.id) {
            fetchNotifications(currentUser.id); // Atualiza sininho se for pra mim
        }
    })
    .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [currentUser?.id]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setCurrentUser(myProfile || { id: user.id, full_name: "Eu", avatar_url: null });
        
        // Carrega likes e notificações
        const { data: likesData } = await supabase.from("likes").select("post_id").eq("user_id", user.id);
        if (likesData) setMyLikes(new Set(likesData.map(l => l.post_id)));
        
        fetchNotifications(user.id);
      }

      // Carrega Ranking (Lista de Usuários)
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url, coins, personal_coins, role");
      if (profiles) {
        const sorted = profiles.map(p => ({
          ...p,
          total_coins: (p.coins || 0) + (p.personal_coins || 0),
          name: p.full_name || "Membro"
        })).sort((a, b) => b.total_coins - a.total_coins);
        setRanking(sorted);
      }

      await refreshFeed();
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  async function fetchNotifications(userId: string) {
    const { data } = await supabase.from("notifications").select(`*, profiles:actor_id(full_name, avatar_url)`).eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
    if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.read).length);
    }
  }

  async function markNotificationsAsRead() {
      if (unreadCount > 0) {
          setUnreadCount(0);
          const updated = notifications.map(n => ({ ...n, read: true }));
          setNotifications(updated);
          await supabase.from("notifications").update({ read: true }).eq("user_id", currentUser.id).eq("read", false);
      }
  }

  async function refreshFeed() {
    const { data } = await supabase.from("posts").select(`id, content, image_url, created_at, likes_count, user_id, profiles:posts_author_fkey (full_name, avatar_url, role)`).order("created_at", { ascending: false });
    if (data) setPosts(data);
  }

  // --- LÓGICA DE MENÇÃO (@) ---
  
  // Função que monitora o que você digita para detectar o "@"
  const handleTyping = (text: string, field: 'post' | 'comment') => {
      if (field === 'post') setNewPostText(text);
      else setCommentText(text);

      // Pega a última palavra digitada
      const words = text.split(" ");
      const lastWord = words[words.length - 1];

      if (lastWord.startsWith("@")) {
          setMentionQuery(lastWord.substring(1)); // Remove o @ e busca o nome
          setMentionTargetField(field);
      } else {
          setMentionQuery(null);
          setMentionTargetField(null);
      }
  };

  // Quando clica no nome da lista
  const selectMention = (userName: string) => {
      const textToUpdate = mentionTargetField === 'post' ? newPostText : commentText;
      const words = textToUpdate.split(" ");
      words.pop(); // Remove o "@parcial"
      words.push(`@${userName} `); // Adiciona o "@NomeCompleto "
      
      const newText = words.join(" ");

      if (mentionTargetField === 'post') setNewPostText(newText);
      else setCommentText(newText);
      
      setMentionQuery(null); // Fecha menu
  };

  // Filtra usuários baseados no que foi digitado
  const filteredUsers = mentionQuery 
    ? ranking.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5) 
    : [];

  // --- NOTIFICAÇÕES ---

  const createNotification = async (targetUserId: string, type: string, content: string) => {
      if (!currentUser || targetUserId === currentUser.id) return; 
      await supabase.from("notifications").insert({
          user_id: targetUserId,
          actor_id: currentUser.id,
          type,
          content
      });
  };

  const processMentions = (text: string) => {
      const words = text.split(" ");
      // Pega todas as palavras que começam com @
      const potentialMentions = words.filter(w => w.startsWith("@"));
      
      potentialMentions.forEach(mention => {
          // Remove o @ para buscar no banco
          const nameToFind = mention.substring(1).replace(/[^a-zA-Z0-9À-ÿ ]/g, ""); // Limpa pontuação
          // Procura na lista de ranking (que tem todos os usuarios carregados)
          const userFound = ranking.find(u => u.name === nameToFind || u.name.split(" ")[0] === nameToFind);
          
          if (userFound) {
              createNotification(userFound.id, 'mention', `marcou você: "${text.substring(0, 30)}..."`);
          }
      });
  };

  // --- POSTS E COMENTÁRIOS ---

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewPostImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePublish = async () => {
    if (!newPostText.trim() && !newPostImage) {
      alert("Escreva algo!");
      return;
    }
    if (!currentUser) {
      alert("Erro de sessão.");
      return;
    }
    try {
      setPosting(true);
      let finalImageUrl = null;
      if (newPostImage) {
        const fileName = `${Date.now()}.${newPostImage.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from("feed-images").upload(fileName, newPostImage);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("feed-images").getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
      }
      const { error } = await supabase.from("posts").insert({ user_id: currentUser.id, content: newPostText, image_url: finalImageUrl });
      if (error) throw error;
      
      processMentions(newPostText); // Verifica quem foi marcado

      setNewPostText(""); 
      setNewPostImage(null); 
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      await refreshFeed(); 
      setActiveTab('feed');
    } catch (e: any) { 
      console.error("Erro ao postar:", e);
      alert("Erro: " + e.message); 
    } finally { 
      setPosting(false); 
    }
  };

  const sendComment = async (post: any, parentId: string | null = null) => {
    if (!commentText.trim() || !currentUser) return;
    setSendingComment(true);
    const { error } = await supabase.from("comments").insert({ post_id: post.id, user_id: currentUser.id, content: commentText, parent_id: parentId });
    if (!error) {
        processMentions(commentText); // Verifica menções no comentário

        // Notifica dono do post ou comentário pai
        if (parentId) {
             const parentComment = commentsData[post.id]?.find(c => c.id === parentId);
             if (parentComment) createNotification(parentComment.user_id, 'reply', 'respondeu seu comentário.');
        } else {
             createNotification(post.user_id, 'comment', 'comentou no seu post.');
        }

        setCommentText(""); 
        setReplyingTo(null); 
        loadComments(post.id);
    }
    setSendingComment(false);
  };

  const toggleComments = (postId: string) => {
    if (openComments === postId) setOpenComments(null);
    else { setOpenComments(postId); if (!commentsData[postId]) loadComments(postId); }
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase.from("comments").select(`id, content, created_at, parent_id, user_id, profiles(full_name, avatar_url)`).eq("post_id", postId).order("created_at", { ascending: true });
    if (data) setCommentsData(prev => ({ ...prev, [postId]: data }));
  };

  const handleLike = async (post: any) => {
    if (!currentUser) return;
    const isLiked = myLikes.has(post.id);
    const newSet = new Set(myLikes);
    const updatedPosts = posts.map(p => p.id === post.id ? { ...p, likes_count: isLiked ? Math.max(0, (p.likes_count || 0) - 1) : (p.likes_count || 0) + 1 } : p);
    setPosts(updatedPosts);
    if (isLiked) newSet.delete(post.id);
    else { newSet.add(post.id); createNotification(post.user_id, 'like', 'curtiu seu post.'); }
    setMyLikes(newSet);
    await supabase.rpc('toggle_like', { target_post_id: post.id, target_user_id: currentUser.id });
  };

  // Helpers
  const renderText = (text: string) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((part, index) => {
      if (part.startsWith('@') && part.length > 2) return <span key={index} className="text-[#C9A66B] font-bold cursor-pointer hover:underline">{part}</span>;
      return part;
    });
  };
  const timeAgo = (date: string) => { 
    const diff = (Date.now() - new Date(date).getTime())/1000; 
    if(diff<60) return "agora"; 
    if(diff<3600) return `${Math.floor(diff/60)}m`; 
    if(diff<86400) return `${Math.floor(diff/3600)}h`; 
    return `${Math.floor(diff/86400)}d`; 
  };
  const formatNumber = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#000000] text-white font-sans pb-20 relative">
      
      {/* HEADER E NOTIFICAÇÕES */}
      <div className="flex justify-between items-start mb-8">
        <div>
            <h1 className="text-3xl font-extrabold italic tracking-wide">COMUNIDADE <span className="text-[#C9A66B]">PRO</span></h1>
            <p className="text-gray-400 mt-2 text-sm">Ranking e Networking.</p>
        </div>
        <div className="relative">
            <button onClick={() => { setShowNotifications(!showNotifications); markNotificationsAsRead(); }} className="relative bg-[#111] border border-[#333] p-3 rounded-full hover:bg-[#222] transition-colors">
                <Bell size={20} className={unreadCount > 0 ? "text-[#C9A66B]" : "text-gray-400"} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">{unreadCount}</span>}
            </button>
            {showNotifications && (
                <div className="absolute right-0 top-12 w-72 bg-[#111] border border-[#222] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 border-b border-[#222] font-bold text-xs text-gray-400 uppercase">Notificações</div>
                    <div className="max-h-60 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-center text-xs text-gray-600">Nenhuma notificação.</p>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className={`p-3 border-b border-[#222] flex gap-3 ${n.read ? "opacity-50" : "bg-[#1a1a1a]"}`}>
                                <div className="w-8 h-8 rounded-full bg-[#222] overflow-hidden shrink-0 border border-[#333]">
                                  {n.profiles?.avatar_url && <img src={n.profiles.avatar_url} className="w-full h-full object-cover" alt={n.profiles.full_name || "User"} />}
                                </div>
                                <div>
                                  <p className="text-xs text-gray-300">
                                    <span className="font-bold text-[#C9A66B]">{n.profiles?.full_name}</span> {n.content}
                                  </p>
                                  <p className="text-[9px] text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
                                </div>
                            </div>
                          ))
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>

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

      {activeTab === 'ranking' && (
        <div className="max-w-3xl mx-auto space-y-3">
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
              } 
              else if (position === 2) { 
                medalColor = "text-gray-300"; 
              } 
              else if (position === 3) { 
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
                          {profile.role || "Membro"}
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

      {activeTab === 'feed' && (
        <div className="max-w-2xl mx-auto relative">
          
          {/* MENU FLUTUANTE DE MENÇÃO */}
          {mentionQuery !== null && filteredUsers.length > 0 && (
             <div 
               className="absolute z-50 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl w-64 overflow-hidden animate-in fade-in slide-in-from-bottom-2" 
               style={{ 
                 top: mentionTargetField === 'post' ? '120px' : 'auto', 
                 bottom: mentionTargetField === 'comment' ? '60px' : 'auto' 
               }}
             >
                <div className="p-2 border-b border-[#222] text-[10px] text-gray-500 font-bold uppercase">Marcar Aluno</div>
                {filteredUsers.map(u => (
                    <button 
                      key={u.id} 
                      onClick={() => selectMention(u.name)} 
                      className="w-full text-left p-3 hover:bg-[#333] flex items-center gap-3 transition-colors"
                    >
                        <div className="w-6 h-6 rounded-full bg-[#333] overflow-hidden border border-[#444]">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} className="w-full h-full object-cover" alt={u.name} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500">
                              {u.name.substring(0,2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-300">{u.name}</span>
                    </button>
                ))}
             </div>
          )}

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
                onChange={(e) => handleTyping(e.target.value, 'post')} 
                placeholder="Compartilhe sua evolução... (Use @ para marcar)" 
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
                    }
                    setPreviewUrl(null); 
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
                className="bg-[#C9A66B] text-black text-xs font-bold px-6 py-2 rounded-lg hover:bg-[#b08d55] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {posting ? (
                  <Loader2 size={16} className="animate-spin"/>
                ) : (
                  "POSTAR"
                )}
              </button>
            </div>
          </div>

          {/* POSTS */}
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
              posts.map((post) => {
                const isLiked = myLikes.has(post.id);
                const showComments = openComments === post.id;
                const postComments = commentsData[post.id] || [];
                const rootComments = postComments.filter((c: any) => !c.parent_id);
                const getReplies = (pid: string) => postComments.filter((c: any) => c.parent_id === pid);

                return (
                  <div key={post.id} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                    <div className="p-4 flex justify-between items-center">
                        <div className="flex gap-3 items-center">
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
                        <MoreHorizontal size={20} className="text-gray-600 hover:text-white transition-colors cursor-pointer"/>
                    </div>
                    {post.content && (
                      <div className="px-4 pb-3 text-sm text-gray-300 whitespace-pre-wrap">
                        {renderText(post.content)}
                      </div>
                    )}
                    {post.image_url && (
                      <div className="w-full bg-black">
                        <img src={post.image_url} className="w-full max-h-[500px] object-contain" alt="Post" />
                      </div>
                    )}
                    
                    <div className="p-3 border-t border-[#222] flex gap-6 text-gray-500">
                      <button 
                        onClick={() => handleLike(post)} 
                        className={`flex items-center gap-2 transition-colors ${isLiked ? "text-red-500" : "hover:text-red-500"}`}
                      >
                        <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                        <span className="text-xs font-bold">{post.likes_count || 0}</span>
                      </button>
                      <button 
                        onClick={() => toggleComments(post.id)} 
                        className={`flex items-center gap-2 transition-colors ${showComments ? "text-[#C9A66B]" : "hover:text-[#C9A66B]"}`}
                      >
                        <MessageSquare size={20} />
                        <span className="text-xs font-bold">Comentar</span>
                      </button>
                    </div>

                    {showComments && (
                      <div className="bg-[#0f0f0f] border-t border-[#222] p-4 relative">
                         <div className="flex gap-2 mb-4">
                            <input 
                              type="text" 
                              value={commentText} 
                              onChange={(e) => handleTyping(e.target.value, 'comment')} 
                              onKeyDown={(e) => e.key === 'Enter' && sendComment(post)} 
                              placeholder="Escreva um comentário..." 
                              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-full px-4 py-2 text-xs text-white outline-none focus:border-[#C9A66B] transition-colors" 
                            />
                            <button 
                              onClick={() => sendComment(post)} 
                              disabled={!commentText.trim() || sendingComment} 
                              className="bg-[#C9A66B] text-black p-2 rounded-full hover:bg-[#b08d55] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {sendingComment ? (
                                <Loader2 size={14} className="animate-spin"/>
                              ) : (
                                <Send size={14} />
                              )}
                            </button>
                        </div>
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                            {!commentsData[post.id] && (
                              <p className="text-xs text-gray-600">Carregando...</p>
                            )}
                            {commentsData[post.id]?.length === 0 && (
                              <p className="text-xs text-gray-600">Seja o primeiro a comentar!</p>
                            )}
                            {rootComments.map((comment: any) => (
                                <div key={comment.id}>
                                    <div className="flex gap-2 items-start">
                                        <div className="w-8 h-8 rounded-full bg-[#222] overflow-hidden shrink-0 mt-1 border border-[#333]">
                                          {comment.profiles?.avatar_url ? (
                                            <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" alt={comment.profiles.full_name || "User"} />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
                                              {comment.profiles?.full_name?.substring(0,2).toUpperCase() || "U"}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="bg-[#1a1a1a] rounded-lg p-2 px-3 text-xs text-gray-300">
                                              <span className="font-bold text-[#C9A66B] mr-2">{comment.profiles?.full_name || "Usuário"}</span>
                                              {renderText(comment.content)}
                                            </div>
                                            <button 
                                              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} 
                                              className="ml-1 mt-1 text-[10px] text-gray-500 hover:text-[#C9A66B] font-bold flex gap-1 items-center transition-colors"
                                            >
                                              <MessageCircle size={10} /> Responder
                                            </button>
                                        </div>
                                    </div>
                                    {/* Respostas */}
                                    {getReplies(comment.id).map((reply: any) => (
                                        <div key={reply.id} className="ml-10 mt-2 flex gap-2 items-start">
                                            <div className="w-6 h-6 rounded-full bg-[#222] overflow-hidden shrink-0 mt-1 border border-[#333]">
                                              {reply.profiles?.avatar_url ? (
                                                <img src={reply.profiles.avatar_url} className="w-full h-full object-cover" alt={reply.profiles.full_name || "User"} />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500">
                                                  {reply.profiles?.full_name?.substring(0,2).toUpperCase() || "U"}
                                                </div>
                                              )}
                                            </div>
                                            <div className="bg-[#1a1a1a] rounded-lg p-2 px-3 text-xs text-gray-400 flex-1">
                                              <span className="font-bold text-gray-500 mr-2">{reply.profiles?.full_name || "Usuário"}</span>
                                              {renderText(reply.content)}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Campo Resposta */}
                                    {replyingTo === comment.id && (
                                        <div className="ml-10 mt-2 flex gap-2">
                                          <CornerDownRight size={14} className="text-gray-600 mt-2" />
                                          <input 
                                            autoFocus 
                                            type="text" 
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && sendComment(post, comment.id)} 
                                            placeholder="Responder..." 
                                            className="flex-1 bg-[#111] border border-[#333] rounded px-3 py-1 text-xs text-white focus:border-[#C9A66B] outline-none transition-colors" 
                                          />
                                          <button 
                                            onClick={() => sendComment(post, comment.id)} 
                                            disabled={!commentText.trim() || sendingComment}
                                            className="bg-[#222] text-white px-3 py-1 rounded hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                          >
                                            {sendingComment ? (
                                              <Loader2 size={12} className="animate-spin"/>
                                            ) : (
                                              <Send size={12}/>
                                            )}
                                          </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
