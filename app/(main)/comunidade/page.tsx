export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Trophy, Crown, Medal, Shield, TrendingUp, User } from "lucide-react";

export default async function ComunidadePage() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("pro_balance", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter">
            RANKING <span className="text-[#C9A66B]">ELITE</span>
          </h1>
          <p className="text-slate-400 mt-2">
            Sua posição define sua autoridade.
          </p>
        </div>
      </div>

      {/* PODIUM (Top 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-end">
        
        {/* 2º Lugar */}
        {profiles && profiles[1] && (
           <div className="order-2 md:order-1 relative p-6 rounded-2xl border border-white/5 bg-slate-900/50 flex flex-col items-center text-center">
             <Medal className="text-slate-300 mb-2" size={28} />
             <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-300 flex items-center justify-center text-xl font-bold text-slate-500 mb-3 uppercase overflow-hidden">
                {profiles[1].avatar_url ? <img src={profiles[1].avatar_url} className="w-full h-full object-cover" /> : profiles[1].full_name?.charAt(0)}
             </div>
             <h3 className="text-white font-bold truncate w-full">{profiles[1].full_name}</h3>
             <div className="bg-black/50 px-3 py-1 rounded-full border border-white/10 text-slate-300 font-mono font-bold mt-2 text-sm">
                {profiles[1].pro_balance} PRO
             </div>
           </div>
        )}

        {/* 1º Lugar */}
        {profiles && profiles[0] && (
           <div className="order-1 md:order-2 relative p-8 rounded-2xl border border-[#C9A66B]/50 bg-gradient-to-b from-[#C9A66B]/20 to-black flex flex-col items-center text-center shadow-[0_0_40px_rgba(201,166,107,0.15)] transform md:-translate-y-4">
             <Crown className="text-[#C9A66B] mb-2 animate-bounce" size={40} fill="currentColor" />
             <div className="w-20 h-20 rounded-full bg-[#C9A66B] border-4 border-[#C9A66B]/30 flex items-center justify-center text-2xl font-black text-black mb-3 uppercase overflow-hidden">
                {profiles[0].avatar_url ? <img src={profiles[0].avatar_url} className="w-full h-full object-cover" /> : profiles[0].full_name?.charAt(0)}
             </div>
             <h3 className="text-white text-lg font-black truncate w-full">{profiles[0].full_name}</h3>
             <div className="bg-[#C9A66B] px-4 py-1.5 rounded-full text-black font-mono font-bold mt-1 shadow-lg">
                {profiles[0].pro_balance} PRO
             </div>
           </div>
        )}

        {/* 3º Lugar */}
        {profiles && profiles[2] && (
           <div className="order-3 relative p-6 rounded-2xl border border-white/5 bg-slate-900/50 flex flex-col items-center text-center">
             <Medal className="text-amber-700 mb-2" size={28} />
             <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-amber-700 flex items-center justify-center text-xl font-bold text-slate-500 mb-3 uppercase overflow-hidden">
                {profiles[2].avatar_url ? <img src={profiles[2].avatar_url} className="w-full h-full object-cover" /> : profiles[2].full_name?.charAt(0)}
             </div>
             <h3 className="text-white font-bold truncate w-full">{profiles[2].full_name}</h3>
             <div className="bg-black/50 px-3 py-1 rounded-full border border-white/10 text-amber-700 font-mono font-bold mt-2 text-sm">
                {profiles[2].pro_balance} PRO
             </div>
           </div>
        )}
      </div>

      {/* LISTA COMPLETA (Rank 4+) */}
      <div className="bg-slate-900/30 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-white/5">
            <Shield size={16} className="text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Classificação Geral</span>
        </div>

        <div className="divide-y divide-white/5">
            {profiles?.slice(3).map((profile, index) => {
                const isMe = profile.id === currentUserId;
                return (
                    <div 
                        key={profile.id} 
                        className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${isMe ? 'bg-[#C9A66B]/10 border-l-2 border-[#C9A66B]' : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-slate-500 font-mono font-bold w-6 text-center text-sm">
                                {index + 4}
                            </span>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold uppercase overflow-hidden ${isMe ? 'bg-[#C9A66B] text-black' : 'bg-slate-800 text-slate-400'}`}>
                                {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : (profile.full_name?.charAt(0) || "U")}
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${isMe ? 'text-[#C9A66B]' : 'text-white'}`}>
                                    {profile.full_name} {isMe && "(Você)"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-[#A6CE44]" />
                            <span className="text-white font-mono font-bold">{profile.pro_balance}</span>
                            <span className="text-[10px] text-[#C9A66B] font-bold">PRO</span>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}