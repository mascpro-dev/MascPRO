"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, Users, ShoppingBag, Loader2, ArrowUpRight } from "lucide-react";

// COMPONENTE VISUAL: GRÁFICO DE VELOCÍMETRO (SEMICÍRCULO)
const GaugeChart = ({ value, max, label, color = "#C9A66B", subLabel }: any) => {
    // Cálculo da porcentagem para o arco (máximo 100)
    const percentage = Math.min((value / max) * 100, 100);
    // Raio do círculo
    const radius = 35;
    // Circunferência de um semicírculo (PI * R)
    const circumference = Math.PI * radius;
    // O quanto preencher baseado na porcentagem
    const dashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center bg-[#111] border border-[#222] rounded-2xl p-4 w-full relative overflow-hidden group hover:border-[#333] transition-colors">
            {/* Título do Gráfico */}
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</h3>
            
            {/* O Gráfico SVG */}
            <div className="relative w-40 h-24 flex items-end justify-center mb-2">
                <svg className="w-full h-full overflow-visible transform rotate-180" viewBox="0 0 100 50">
                    {/* Fundo do arco (cinza escuro) */}
                    <path d="M10,50 A35,35 0 0,1 90,50" fill="none" stroke="#222" strokeWidth="8" strokeLinecap="round" />
                    {/* Arco de progresso (colorido) */}
                    <path 
                        d="M10,50 A35,35 0 0,1 90,50" 
                        fill="none" 
                        stroke={color} 
                        strokeWidth="8" 
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashoffset}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                {/* Valor Central */}
                <div className="absolute bottom-0 flex flex-col items-center">
                    <span className="text-2xl font-bold text-white leading-none">{value}</span>
                    <span className="text-[10px] text-gray-500 font-bold mt-1">/ {max}</span>
                </div>
            </div>

            {/* Texto Inferior */}
            <div className="text-center">
                <p className="text-[#C9A66B] text-xs font-bold flex items-center justify-center gap-1">
                    {percentage.toFixed(0)}% <span className="text-gray-600 font-normal">do objetivo</span>
                </p>
                {subLabel && <p className="text-[10px] text-gray-500 mt-1">{subLabel}</p>}
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

  // Metas do sistema (Exemplo: Próxima placa é 3.000, Meta de rede é 1000)
  const NEXT_LEVEL_TARGET = 3000; 
  const NETWORK_TARGET = 1500;
  const STORE_TARGET = 2000; // Meta simbólica para compras

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Pegar nome
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        if (profile?.full_name) setUserName(profile.full_name.split(' ')[0]);

        // Pegar Totais da VIEW blindada
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Olá, {userName}</h1>
        <p className="text-gray-400 text-sm flex items-center gap-2">
            Visão geral da sua performance
        </p>
      </div>

      {/* ÁREA DOS GRÁFICOS (DASHBOARD) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          
          {/* 1. GRÁFICO DA PLACA (O Mais Importante) */}
          <GaugeChart 
            label="Rumo à Placa Black" 
            value={stats.total} 
            max={NEXT_LEVEL_TARGET} 
            color="#C9A66B" // Dourado
            subLabel={stats.total >= NEXT_LEVEL_TARGET ? "Meta Atingida! 🏆" : `Faltam ${NEXT_LEVEL_TARGET - stats.total} PRO`}
          />

          {/* 2. GRÁFICO DA REDE */}
          <GaugeChart 
            label="Potencial da Rede" 
            value={stats.network} 
            max={NETWORK_TARGET} 
            color="#22c55e" // Verde
            subLabel="Ganhos por indicação"
          />

           {/* 3. GRÁFICO EVOLUÇÃO (MÉRITO) */}
           <GaugeChart 
            label="Evolução Técnica" 
            value={stats.own} 
            max={2000} // Meta de estudo
            color="#3b82f6" // Azul
            subLabel="Seu esforço pessoal"
          />
      </div>

      {/* BANNER INFORMATIVO ABAIXO */}
      <div className="bg-gradient-to-r from-[#111] to-[#1a1a1a] border border-[#222] rounded-xl p-6 relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-center">
            <div>
                <h3 className="font-bold text-white text-lg mb-1">Próximo Nível: BLACK</h3>
                <p className="text-gray-400 text-xs max-w-[200px]">Ao atingir 3.000 PRO, você desbloqueia mentorias exclusivas.</p>
            </div>
            <div className="bg-[#C9A66B] text-black p-3 rounded-full">
                <Trophy size={24} />
            </div>
          </div>
          {/* Brilho de fundo */}
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#C9A66B] blur-[80px] opacity-20"></div>
      </div>

    </div>
  );
}
