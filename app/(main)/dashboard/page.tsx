export const dynamic = "force-dynamic";
export const revalidate = 0;
"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function DashboardPage() {
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Dentro do seu componente, na parte da busca:
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('moedas_pro_acumuladas, meritocracia_total, residual_rede_total')
          .eq('id', session.user.id)
          .single();
        
        // LINHA PARA TESTE: Pressione F12 no seu navegador e veja se aparece o valor certo no console
        console.log("DEBUG MASCPRO:", profileData);
        
        setProfile(profileData);
      }
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  if (loading) return <div className="p-10 text-white font-bold animate-pulse">CARREGANDO DADOS REAIS...</div>;
  if (!profile) return <div className="p-10 text-white font-bold">Nenhum perfil encontrado.</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="p-4 space-y-4">
        {/* CARD PRINCIPAL - RUMO AO CERTIFIED */}
        <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-[#C9A66B]/20">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-1">RUMO AO CERTIFIED</p>
          <h2 className="text-5xl font-black italic text-white tracking-tighter mb-4">
            {Number(profile?.moedas_pro_acumuladas || 0).toLocaleString('pt-BR')} 
            <span className="text-sm text-[#C9A66B] ml-2 font-black italic uppercase">PRO</span>
          </h2>
          {/* Barra de Progresso Real */}
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-[#C9A66B] h-full shadow-[0_0_15px_#C9A66B]" 
              style={{ width: `${Math.min(((profile?.moedas_pro_acumuladas || 0) / 10000) * 100, 100)}%` }} 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          {/* POTENCIAL DA REDE - 700 PRO */}
          <div className="bg-zinc-900/30 p-5 rounded-[1.5rem] border border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-normal">Potencial da REDE</p>
            <p className="text-3xl font-black text-green-500 italic tracking-tighter">
              {Number(profile?.residual_rede_total || 0).toLocaleString('pt-BR')} 
              <span className="text-[10px] text-green-900 ml-1 font-bold italic uppercase tracking-tighter">PRO</span>
            </p>
          </div>

          {/* EVOLUÇÃO TÉCNICA - 3.920 PRO */}
          <div className="bg-zinc-900/30 p-5 rounded-[1.5rem] border border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 font-normal">Evolução Técnica</p>
            <p className="text-3xl font-black text-white italic tracking-tighter">
              {Number(profile?.meritocracia_total || 0).toLocaleString('pt-BR')} 
              <span className="text-[10px] text-zinc-700 ml-1 font-bold italic uppercase tracking-tighter">PRO</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
