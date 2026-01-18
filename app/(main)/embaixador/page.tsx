"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

export default function VisaoGeralPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          
          setProfile(data);
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [supabase]);

  if (loading) return <div className="p-12 text-slate-500">Carregando painel...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter">
          Olá, {profile?.full_name?.split(' ')[0] || "Membro"}
        </h1>
        <p className="text-slate-400 mt-1">Seu progresso é recompensado.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CARD 1: SALDO (MASC COIN) */}
          <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-2xl relative overflow-hidden">
             {/* Efeito de luz no fundo */}
             <div className="absolute top-0 right-0 p-20 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>
             
             <div className="relative z-10">
                 <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 rounded-full px-3 py-1 mb-4">
                    <Trophy size={12} className="text-slate-300"/>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Masc Coin</span>
                 </div>
                 <h2 className="text-5xl font-black text-white mb-2 tracking-tighter">
                    {profile?.pro_balance || 0} <span className="text-2xl text-slate-600">PRO</span>
                 </h2>
                 <p className="text-slate-500 text-sm font-medium">Seu poder de compra na loja.</p>
             </div>
          </div>

          {/* CARD 2: META (PLACAS) */}
          <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-2xl flex flex-col justify-between">
              <div>
                  <h3 className="text-xl font-bold text-white mb-1">Próxima Placa</h3>
                  <p className="text-slate-500 text-sm">Marco de 10k</p>
              </div>
              
              <div className="mt-8">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                      <span>{profile?.pro_balance || 0} PRO</span>
                      <span>10.000 PRO</span>
                  </div>
                  {/* Barra de Progresso */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#C9A66B]" 
                        style={{ width: `${Math.min(((profile?.pro_balance || 0) / 10000) * 100, 100)}%` }} 
                      /> 
                  </div>
              </div>

              <button className="mt-6 w-full border border-white/10 text-white font-bold py-3 rounded-lg hover:bg-white/5 transition-colors uppercase text-xs tracking-widest">
                  Ver Placas
              </button>
          </div>
      </div>

      {/* ESPAÇO LIVRE:
          Aqui retiramos o card de "Convite".
          Futuramente podemos colocar "Últimas Aulas", "Avisos" ou "Ranking Rápido".
      */}

    </div>
  );
}