export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
// IMPORTANTE: Aqui estão todos os ícones necessários
import { Trophy, Crown, Medal, Shield, TrendingUp } from "lucide-react";

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
      <div className="border-b border-white/10 pb-6">
          <h1 className="text-4xl font-black text-white italic tracking-tighter">
            RANKING <span className="text-[#C9A66B]">ELITE</span>
          </h1>
          <p className="text-slate-400 mt-2">Sua posição define sua autoridade.</p>
      </div>

      {/* PODIUM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-end">
        {/* Top 2 */}
        {profiles && profiles[1] && (
           <div className="order-2 md:order-1 p-6 rounded-2xl border border-white/5 bg-slate-900/50 flex flex-col items-center text-center">
             <Medal className="text-slate-300 mb-2" size={28} />
             <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-300 flex items-center justify-center text-xl font-bold text-slate-500 mb-3">
                {profiles[1].full_name?.charAt(0)}
             </div>
             <p className="text-white font-bold">{profiles[1].full_name}</p>
             <span className="text-xs text-slate-400">{profiles[1].pro_balance} PRO</span>
           </div>
        )}

        {/* Top 1 */}
        {profiles && profiles[0] && (
           <div className="order-1 md:order-2 p-8 rounded-2xl border border-[#C9A66B]/50 bg-gradient-to-b from-[#C9A66B]/20 to-black flex flex-col items-center text-center transform md:-translate-y-4">
             <Crown className="text-[#C9A66B] mb-2 animate-bounce" size={40} />
             <div className="w-20 h-20 rounded-full bg-[#C9A66B] flex items-center justify-center text-2xl font-black text-black mb-3">
                {profiles[0].full_name?.charAt(0)}
             </div>
             <p className="text-white font-black text-lg">{profiles[0].full_name}</p>
             <span className="bg-[#C9A66B] text-black text-xs font-bold px-3 py-1 rounded-full mt-2">
                {profiles[0].pro_balance} PRO
             </span>
           </div>
        )}

        {/* Top 3 */}
        {profiles && profiles[2] && (
           <div className="order-3 p-6 rounded-2xl border border-white/5 bg-slate-900/50 flex flex-col items-center text-center">
             <Medal className="text-amber-700 mb-2" size={28} />
             <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-amber-700 flex items-center justify-center text-xl font-bold text-slate-500 mb-3">
                {profiles[2].full_name?.charAt(0)}
             </div>
             <p className="text-white font-bold">{profiles[2].full_name}</p>
             <span className="text-xs text-slate-400">{profiles[2].pro_balance} PRO</span>
           </div>
        )}
      </div>

      {/* LISTA GERAL */}
      <div className="bg-slate-900/30 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-white/5">
            <Shield size={16} className="text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Classificação Geral</span>
        </div>
        <div className="divide-y divide-white/5">
            {profiles?.slice(3).map((profile, index) => {
                const isMe = profile.id === currentUserId;
                return (
                    <div key={profile.id} className={`flex items-center justify-between p-4 ${isMe ? 'bg-[#C9A66B]/10' : ''}`}>
                        <div className="flex items-center gap-4">
                            <span className="text-slate-500 font-mono w-6 text-center">{index + 4}</span>
                            <p className={`text-sm font-bold ${isMe ? 'text-[#C9A66B]' : 'text-white'}`}>
                                {profile.full_name} {isMe && "(Você)"}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-[#A6CE44]" />
                            <span className="text-white font-mono font-bold">{profile.pro_balance} PRO</span>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}