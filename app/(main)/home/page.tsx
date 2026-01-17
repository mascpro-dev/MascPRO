export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";
import { Trophy, ArrowRight, Layout, Copy } from "lucide-react";

export default async function HomePage() {
  const supabase = createServerComponentClient({ cookies });

  // 1. Quem é o usuário?
  const { data: { session } } = await supabase.auth.getSession();

  // 2. Busca os dados no Banco
  let balance = 0;
  let userName = "Membro MASC";
  let referralCode = "gerando...";

  if (session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    
    if (profile) {
      balance = profile.pro_balance || 0;
      userName = profile.full_name || "Membro MASC";
      referralCode = profile.referral_code || "masc-pro";
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* CABEÇALHO */}
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
          Olá, {userName}
        </h1>
        <p className="text-slate-400 mt-2">
          Seu progresso é recompensado.
        </p>
      </div>

      {/* PLACARES (GRID) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARTÃO DE SALDO (O cofre) */}
        <div className="bg-gradient-to-br from-slate-900 to-black border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-[#C9A66B]/30 transition-colors">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy size={120} />
            </div>
            
            <div className="relative z-10">
                <div className="inline-flex items-center gap-2 border border-white/20 bg-white/5 rounded-full px-3 py-1 mb-6">
                    <Trophy size={14} className="text-white" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">MASC COIN</span>
                </div>

                <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-black text-white tracking-tighter">
                        {balance}
                    </span>
                    <span className="text-xl font-bold text-slate-500">PRO</span>
                </div>
                
                <p className="text-slate-500 text-sm mt-2 font-medium">
                  ↗ Seu poder de compra na loja.
                </p>
            </div>
        </div>

        {/* CARTÃO DE METAS */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 flex flex-col justify-between hover:bg-slate-900 transition-colors">
            <div>
                <h3 className="text-white font-bold text-lg mb-1">Próxima Placa</h3>
                <p className="text-slate-400 text-sm">Marco de 10k</p>
            </div>

            <div className="space-y-2 mt-8">
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                    <span>{balance} PRO</span>
                    <span>10.000 PRO</span>
                </div>
                {/* Barra de Progresso */}
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-[#C9A66B]" 
                        style={{ width: `${Math.min((balance / 10000) * 100, 100)}%` }}
                    />
                </div>
                
                {/* BOTÃO CLEAN (OUTLINE) */}
                <button className="w-full mt-4 bg-transparent border border-white/10 hover:border-white/30 hover:bg-white/5 text-slate-300 text-xs font-bold py-3 rounded-xl uppercase tracking-widest transition-all">
                    Ver Placas
                </button>
            </div>
        </div>
      </div>

      {/* CONVITE */}
      <div className="bg-black border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
            <h3 className="text-white font-bold text-sm">Convite Exclusivo</h3>
            <p className="text-slate-500 text-xs mt-1">Ganhe PROs convidando profissionais.</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="bg-slate-900 border border-white/10 px-4 py-3 rounded-xl font-mono text-xs text-white flex-1 md:flex-none text-center">
                mascpro.app/ref/{referralCode}
            </div>
            
            {/* BOTÃO CLEAN (OUTLINE DOURADO) */}
            <button className="bg-[#C9A66B]/10 border border-[#C9A66B]/50 text-[#C9A66B] hover:bg-[#C9A66B]/20 font-bold text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-2">
                <Copy size={14} />
                Copiar
            </button>
        </div>
      </div>
    </div>
  );
}