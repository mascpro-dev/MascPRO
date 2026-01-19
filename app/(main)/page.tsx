"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import LoadingRespiro from "@/componentes/LoadingRespiro"; // <--- IMPORTEI AQUI

const PILARES = [
  "Performance que se mantém: Resultado que não ilude, fideliza.",
  "Tecnologia + Método: Não vendemos produto. Sustentamos um sistema.",
  "Experiência Premium: Visual, linguagem e entrega no mesmo nível.",
  "Embaixadores como Escola: Educação contínua, indicação com responsabilidade.",
  "Comunidade e Carreira: Crescimento profissional, não só resultado no cabelo."
];

export default function VisaoGeralPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dailyPillar, setDailyPillar] = useState(PILARES[0]); 
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getData() {
      try {
        const randomIndex = Math.floor(Math.random() * PILARES.length);
        setDailyPillar(PILARES[randomIndex]);

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

  // --- AQUI ESTÁ A MUDANÇA ---
  // Em vez de texto simples, chamamos o componente inteligente
  if (loading) return <LoadingRespiro />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter">
          Olá, {profile?.full_name?.split(' ')[0] || "Membro"}
        </h1>
        
        <div className="mt-3 border-l-2 border-[#C9A66B] pl-4 py-1">
            <p className="text-[#C9A66B] font-medium italic text-sm md:text-base animate-pulse">
              "{dailyPillar}"
            </p>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-2xl relative overflow-hidden">
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
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A66B]" style={{ width: `${Math.min(((profile?.pro_balance || 0) / 10000) * 100, 100)}%` }} /> 
                  </div>
              </div>
              <button className="mt-6 w-full border border-white/10 text-white font-bold py-3 rounded-lg hover:bg-white/5 transition-colors uppercase text-xs tracking-widest">
                  Ver Placas
              </button>
          </div>
      </div>
    </div>
  );
}