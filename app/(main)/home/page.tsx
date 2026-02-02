"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, Users, ShoppingBag, Loader2, Lock } from "lucide-react";

// COMPONENTE VISUAL: GRÁFICO DE VELOCÍMETRO (CORRIGIDO)
const GaugeChart = ({ value, max, label, color = "#C9A66B", subLabel }: any) => {
    // Garante que não ultrapasse 100%
    const percentage = Math.min((value / max) * 100, 100);
    
    // Configurações do Arco
    const radius = 40;
    const circumference = Math.PI * radius; // Pi * R (Semicírculo)
    const dashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center bg-[#111] border border-[#222] rounded-2xl p-6 w-full relative overflow-hidden group hover:border-[#333] transition-colors">
            {/* Título do Gráfico */}
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{label}</h3>
            
            {/* O Gráfico SVG (Desvirado) */}
            <div className="relative w-48 h-24 flex items-end justify-center mb-1">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50">
                    {/* Fundo do arco (Cinza) - Desenha um arco de 10,50 até 90,50 */}
                    <path 
                        d="M10,50 A40,40 0 0,1 90,50" 
                        fill="none" 
                        stroke="#222" 
                        strokeWidth="8" 
                        strokeLinecap="round" 
                    />
                    
                    {/* Arco de Progresso (Colorido) */}
                    <path 
                        d="M10,50 A40,40 0 0,1 90,50" 
                        fill="none" 
                        stroke={color} 
                        strokeWidth="8" 
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashoffset}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>

                {/* Valor Central (Na Base) */}
                <div className="absolute bottom-0 translate-y-2 flex flex-col items-center">
                    <span className="text-3xl font-bold text-white leading-none tracking-tighter shadow-black drop-shadow-lg">{value}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase mt-1">Meta: {max}</span>
                </div>
            </div>

            {/* Texto Inferior */}
            <div className="text-center mt-4">
                <p className="text-[10px] text-gray-400">{subLabel}</p>
                {percentage >= 100 && <span className="text-green-500 text-xs font-bold mt-1 block">Conquistado! 🏆</span>}
            </div>
        </div>
    );
};

export default function HomePage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Mestre");
  
  const [stats, setStats] = useState({
    total: 0,
    own: 0,
    network: 0,
    store: 0
  });

  const NEXT_LEVEL_TARGET = 3000; 
  const NETWORK_TARGET = 1500;
  // const STORE_TARGET = 2000; 

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        if (profile?.full_name) setUserName(profile.full_name.split(' ')[0]);

        const { data } = await supabase
          .from("v_pro_totals")
          .select("*")
          .eq("profile_id", user.id)
          .single();

        if (data) {
          setStats({
            total: data.pro_total || 0,
            own: data.pro_own || 0,
            network: data.pro_network || 0,
            store: data.pro_store || 0
          });
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      {/* CABEÇALHO */}
      <div className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-white">Olá, {userName}</h1>
            <p className="text-gray-400 text-sm">Painel de Controle</p>
        </div>
        <div className="hidden md:block bg-[#C9A66B]/10 px-4 py-1 rounded-full border border-[#C9A66B]/20">
             <span className="text-[#C9A66B] text-xs font-bold uppercase">Nível Atual: PRO</span>
        </div>
      </div>

      {/* DASHBOARD GRÁFICOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* 1. GRÁFICO DA PLACA (O Principal) */}
          <GaugeChart 
            label="Rumo à Placa Black" 
            value={stats.total} 
            max={NEXT_LEVEL_TARGET} 
            color="#C9A66B" // Dourado
            subLabel={`${(stats.total / NEXT_LEVEL_TARGET * 100).toFixed(0)}% do objetivo concluído`}
          />

          {/* 2. GRÁFICO DA REDE */}
          <GaugeChart 
            label="Potencial da Rede" 
            value={stats.network} 
            max={NETWORK_TARGET} 
            color="#22c55e" // Verde
            subLabel="Ganhos por indicação"
          />

           {/* 3. GRÁFICO EVOLUÇÃO */}
           <GaugeChart 
            label="Evolução Técnica" 
            value={stats.own} 
            max={2000} // Meta Pessoal
            color="#3b82f6" // Azul
            subLabel="Seu esforço pessoal"
          />
      </div>

      {/* BANNER DE INCENTIVO */}
      <div className="relative group overflow-hidden rounded-xl border border-[#222] bg-[#0a0a0a]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#C9A66B]/10 to-transparent opacity-50 group-hover:opacity-70 transition-opacity"></div>
          <div className="relative p-6 flex items-center justify-between">
            <div>
                <h3 className="font-bold text-white text-lg">Próxima Recompensa</h3>
                <p className="text-gray-400 text-sm mt-1">Ainja 3.000 PRO para desbloquear a <strong>Mentoria Black</strong>.</p>
            </div>
            <div className="bg-[#111] p-3 rounded-full border border-[#333] shadow-xl">
                <Lock size={24} className="text-[#C9A66B]" />
            </div>
          </div>
      </div>

    </div>
  );
}
