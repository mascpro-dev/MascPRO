"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, Heart, MessageSquare, Send, Loader2, ImageIcon, Crown, Medal } from "lucide-react";

export default function ComunidadePage() {
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState<'ranking' | 'feed'>('ranking');
  const [ranking, setRanking] = useState<any[]>([]); 
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentsData, setCommentsData] = useState<Record<string, any[]>>({});
  
  // States para Feed e @
  const [newPostText, setNewPostText] = useState("");
  const [commentText, setCommentText] = useState(""); 
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionTarget, setMentionTarget] = useState<'post' | 'comment' | null>(null);

  // Formatação segura (Resolve erro image_2c853e)
  const formatNumber = (n: any) => {
    if (n === undefined || n === null) return "0";
    return Number(n).toLocaleString('pt-BR');
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      const { data: rankingData } = await supabase.from("v_ranking_global").select("*").order('pontos_totais', { ascending: false });
      if (rankingData) setRanking(rankingData);
      await refreshFeed();
    } finally { setLoading(false); }
  }

  async function refreshFeed() {
    const { data } = await supabase.from("posts").select(`*, profiles:posts_author_fkey(full_name, avatar_url)`).order("created_at", { ascending: false });
    if (data) setPosts(data);
  }

  // Funções de interação do Feed
  const toggleComments = (postId: string) => {
    if (openComments === postId) setOpenComments(null);
    else { setOpenComments(postId); loadComments(postId); }
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase.from("comments").select(`*, profiles(full_name, avatar_url)`).eq("post_id", postId).order("created_at", { ascending: true });
    if (data) setCommentsData(prev => ({ ...prev, [postId]: data }));
  };

  const handleTyping = (text: string, target: 'post' | 'comment') => {
    target === 'post' ? setNewPostText(text) : setCommentText(text);
    const words = text.split(" ");
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith("@")) { setMentionQuery(lastWord.substring(1)); setMentionTarget(target); } 
    else { setMentionQuery(null); }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-black text-white font-sans pb-20 relative">
      <div className="mb-8">
        <h1 className="text-3xl font-black italic uppercase italic">COMUNIDADE <span className="text-[#C9A66B]">PRO</span></h1>
      </div>

      <div className="flex bg-zinc-900/50 p-1 rounded-xl mb-10 border border-white/5">
        <button onClick={() => setActiveTab('ranking')} className={`flex-1 py-3 text-xs font-black uppercase rounded-lg ${activeTab === 'ranking' ? "bg-[#C9A66B] text-black" : "text-zinc-500"}`}>Ranking</button>
        <button onClick={() => setActiveTab('feed')} className={`flex-1 py-3 text-xs font-black uppercase rounded-lg ${activeTab === 'feed' ? "bg-[#C9A66B] text-black" : "text-zinc-500"}`}>Feed Social</button>
      </div>

      {activeTab === 'ranking' && (
        <div className="max-w-3xl mx-auto space-y-2">
          {ranking.map((profile, index) => (
            <div key={profile.id} className={`p-4 rounded-2xl border ${profile.id === currentUser?.id ? "border-[#C9A66B] bg-[#C9A66B]/5" : "border-white/5 bg-zinc-900/30"}`}>
              {/* Espaçamento reduzido para mb-1 */}
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-3">
                  <span className="font-black text-zinc-700 italic">#{index + 1}</span>
                  <p className="font-black text-sm uppercase">{profile.full_name}</p>
                </div>
                {/* Valor Total Grande */}
                <p className="text-[#C9A66B] font-black text-3xl italic tracking-tighter">{formatNumber(profile.pontos_totais)} <span className="text-xs">PRO</span></p>
              </div>

              {/* Espaçamento reduzido para pt-1 e títulos sem bold */}
              <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-white/5">
                <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] text-zinc-500 uppercase font-normal mb-1">Meritocracia</p>
                  <p className="text-2xl font-black text-white italic">{formatNumber(profile.pontos_merito)} <span className="text-[10px] text-zinc-600 font-bold">PRO</span></p>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] text-zinc-500 uppercase font-normal mb-1">Residual Rede</p>
                  <p className="text-2xl font-black text-green-500 italic">{formatNumber(profile.pontos_residual)} <span className="text-[10px] text-zinc-800 font-bold">PRO</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'feed' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl relative">
            <textarea value={newPostText} onChange={(e) => handleTyping(e.target.value, 'post')} placeholder="Use @ para marcar..." className="w-full bg-transparent text-sm outline-none h-20" />
            {mentionQuery !== null && (
              <div className="absolute z-50 bg-[#1a1a1a] border border-[#333] w-64 bottom-full mb-2 rounded-xl shadow-2xl overflow-hidden">
                {ranking.filter(u => u.full_name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5).map(u => (
                  <button key={u.id} onClick={() => { 
                    const words = newPostText.split(" "); words.pop();
                    setNewPostText([...words, `@${u.full_name} `].join(" "));
                    setMentionQuery(null);
                  }} className="w-full text-left p-3 hover:bg-[#333] text-sm font-bold text-gray-300 border-b border-[#222] last:border-0">{u.full_name}</button>
                ))}
              </div>
            )}
            <div className="flex justify-end"><button className="bg-[#C9A66B] text-black px-6 py-2 rounded-xl font-black text-[10px] italic">POSTAR</button></div>
          </div>
          {posts.map((post) => (
            <div key={post.id} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">{post.profiles?.avatar_url && <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />}</div>
                <p className="font-black text-xs text-[#C9A66B] uppercase">{post.profiles?.full_name}</p>
              </div>
              <p className="text-sm text-zinc-300 mb-4">{post.content}</p>
              <div className="flex gap-6 border-t border-white/5 pt-3">
                <button className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase"><Heart size={18} /> {post.likes_count || 0}</button>
                <button onClick={() => toggleComments(post.id)} className="flex items-center gap-2 text-[10px] font-black text-[#C9A66B] uppercase"><MessageSquare size={18} /> Comentar</button>
              </div>
              {openComments === post.id && (
                <div className="mt-4 pt-4 border-t border-white/5">
                   {commentsData[post.id]?.map(c => (
                    <div key={c.id} className="text-[11px] mb-2"><span className="font-black text-[#C9A66B] mr-2 uppercase">{c.profiles?.full_name}:</span>{c.content}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
