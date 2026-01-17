export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Trophy } from "lucide-react";
import InviteCard from "../../componentes/InviteCard"; // Importando o novo card inteligente

export default async function VisaoGeralPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
      return <div className="p-8 text-white">Carregando...</div>
  }

  // Busca dados do perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">
            Olá, {profile?.full_name?.split(' ')[0] || "Membro Elite"}
          </h1>
          <p className="text-slate-400 mt-1">Seu progresso é recompensado.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CARD DE SALDO */}
          <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl flex flex-col justify-center relative overflow-hidden group hover:border-[#C9A66B]/50 transition-colors">
             <div className="absolute top-0 right-0 p-16 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>
             <div className="relative z-10">
                 <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-3 py-1 mb-4">
                    <Trophy size={14} className="text-slate-300"/>
                    <span className="text-xs font-bold text-slate-300 uppercase">Masc Coin</span>
                 </div>
                 <h2 className="text-5xl font-black text-white mb-2">
                    {profile?.pro_balance || 0} <span className="text-xl text-slate-500">PRO</span>
                 </h2>
                 <p className="text-slate-500 text-sm">Seu poder de compra na loja.</p>
             </div>
             <Trophy className="absolute right-8 bottom-8 text-slate-800 opacity-50 group-hover:scale-110 transition-transform duration-500" size={120} />
          </div>

          {/* CARD PRÓXIMA PLACA */}
          <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl flex flex-col justify-between hover:border-[#C9A66B]/50 transition-colors">
              <div>
                  <h3 className="text-xl font-bold text-white mb-1">Próxima Placa</h3>
                  <p className="text-slate-400 text-sm">Marco de 10k</p>
              </div>
              
              <div className="mt-8">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                      <span>{profile?.pro_balance || 0} PRO</span>
                      <span>10.000 PRO</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A66B]" style={{ width: `${Math.min(((profile?.pro_balance || 0) / 10000) * 100, 100)}%` }} /> 
                  </div>
              </div>

              <button className="mt-6 w-full border border-white/10 text-white font-bold py-3 rounded-lg hover:bg-white/5 transition-colors uppercase text-sm tracking-widest">
                  Ver Placas
              </button>
          </div>
      </div>

      {/* --- NOVO CARD DE CONVITE INTELIGENTE --- */}
      {/* Ele gera o link sozinho e tem botão de teste que abre em nova aba */}
      <InviteCard userId={session.user.id} />

    </div>
  );
}