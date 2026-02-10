"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, Heart, MessageSquare, Send, Loader2 } from "lucide-react";

export default function ComunidadePage() {
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState<'ranking' | 'feed'>('ranking');
  const [ranking, setRanking] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  // RESOLVE ERRO IMAGE_2C853E: Formatação segura
  const formatNumber = (n: any) => (Number(n) || 0).toLocaleString('pt-BR');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        setCurrentUser(data);
      }
      const { data: rank } = await supabase.from("v_ranking_global").select("*").order('pontos_totais', { ascending: false });
      if (rank) setRanking(rank);
      const { data: feeds } = await supabase.from("posts").select("*, profiles:posts_author_fkey(full_name, avatar_url)").order("created_at", { ascending: false });
      if (feeds) setPosts(feeds);
    }
    load();
  }, []);

  return (
    <> {/* RESOLVE ERRO IMAGE_0E9C44: Wrap em fragment */}
      <div className="p-4 md:p-8 min-h-screen bg-black text-white font-sans">
        <h1 className="text-3xl font-black italic uppercase mb-8">COMUNIDADE <span className="text-[#C9A66B]">PRO</span></h1>

        <div className="flex bg-zinc-900/50 p-1 rounded-2xl mb-10 border border-white/5">
          <button onClick={() => setActiveTab('ranking')} className={`flex-1 py-3 text-xs font-black uppercase rounded-xl ${activeTab === 'ranking' ? "bg-[#C9A66B] text-black" : "text-zinc-500"}`}>Ranking</button>
          <button onClick={() => setActiveTab('feed')} className={`flex-1 py-3 text-xs font-black uppercase rounded-xl ${activeTab === 'feed' ? "bg-[#C9A66B] text-black" : "text-zinc-500"}`}>Feed Social</button>
        </div>

        {activeTab === 'ranking' && (
          <div className="max-w-3xl mx-auto space-y-2">
            {ranking.map((profile, index) => (
              <div key={profile.id} className={`p-5 rounded-2xl border ${profile.id === currentUser?.id ? "border-[#C9A66B] bg-[#C9A66B]/5" : "border-white/5 bg-zinc-900/30"}`}>
                <div className="flex justify-between items-center mb-1"> {/* mb-1: BLOCOS COLADOS */}
                  <div className="flex items-center gap-3">
                    <span className="font-black text-zinc-700 italic">#{index + 1}</span>
                    <p className="font-black text-sm uppercase">{profile.full_name}</p>
                  </div>
                  <p className="text-[#C9A66B] font-black text-2xl italic tracking-tighter">{formatNumber(profile.pontos_totais)} <span className="text-xs">PRO</span></p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1 pt-1 border-t border-white/5"> {/* pt-1: BLOCOS COLADOS */}
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase font-normal mb-1">Meritocracia</p>
                    <p className="text-xl font-black text-white italic">{formatNumber(profile.pontos_merito)} <span className="text-[10px] text-zinc-600 font-bold">PRO</span></p>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase font-normal mb-1">Residual Rede</p>
                    <p className="text-xl font-black text-green-500 italic">{formatNumber(profile.pontos_residual)} <span className="text-[10px] text-zinc-800 font-bold">PRO</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FEED COM @ MENTION E COMENTÁRIOS */}
        {activeTab === 'feed' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4">
                <p className="font-black text-xs text-[#C9A66B] mb-2 uppercase">{post.profiles?.full_name}</p>
                <p className="text-sm text-zinc-300 mb-4">{post.content}</p>
                <div className="flex gap-4 border-t border-white/5 pt-3">
                   <button className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase"><Heart size={16} /> {post.likes_count}</button>
                   <button onClick={() => setOpenComments(post.id)} className="flex items-center gap-2 text-[10px] font-black text-[#C9A66B] uppercase"><MessageSquare size={16} /> Comentar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
