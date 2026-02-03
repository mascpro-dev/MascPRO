"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, Lock } from "lucide-react";

// --- CONFIGURAÇÃO DOS NÍVEIS ---
const LEVELS = [
  { name: "CERTIFIED", target: 10000, color: "#22c55e" },      // Verde 🟢
  { name: "EXPERT", target: 50000, color: "#3b82f6" },         // Azul 🔵
  { name: "MASTER TÉCNICO", target: 150000, color: "#a855f7" },// Roxo 🟣
  { name: "EDUCADOR MASC PRO", target: 500000, color: "#ef4444" } // Vermelho 🔴
];

// Componente do Gráfico de Velocímetro (Gauge)
const GaugeChart = ({ value, max, label, color, subLabel, icon }: any) => {
    const percentage = Math.min((value / max) * 100, 100);
    const radius = 40;
    const circumference = Math.PI * radius;
    const dashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center bg-[#111] border border-[#222] rounded-2xl p-6 w-full relative overflow-hidden group hover:border-[#333] transition-colors">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{label}</h3>
            <div className="relative w-48 h-24 flex items-end justify-center mb-1">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50">
                    <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="#222" strokeWidth="8" strokeLinecap="round" />
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
                <div className="absolute bottom-0 translate-y-2 flex flex-col items-center">
                    <span className="text-2xl font-bold text-white leading-none tracking-tighter shadow-black drop-shadow-lg">{value}</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase mt-1">Meta: {max.toLocaleString()}</span>
                </div>
            </div>
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
  const [stats, setStats] = useState({ total: 0, own: 0, network: 0, store: 0 });

  // Estado para o Nível Atual
  const [currentLevel, setCurrentLevel] = useState(LEVELS[0]);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        if (profile?.full_name) setUserName(profile.full_name.split(' ')[0]);

        const { data } = await supabase.from("v_pro_totals").select("*").eq("profile_id", user.id).single();

        if (data) {
          const total = data.pro_total || 0;
          setStats({
            total: total,
            own: data.pro_own || 0,
            network: data.pro_network || 0,
            store: data.pro_store || 0
          });

          // Lógica para descobrir qual o próximo nível
          // Encontra o primeiro nível cuja meta é MAIOR que o total atual
          const nextLevel = LEVELS.find(lvl => lvl.target > total) || LEVELS[LEVELS.length - 1];
          setCurrentLevel(nextLevel);
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
        <div className="hidden md:block px-4 py-1 rounded-full border bg-opacity-10" style={{ backgroundColor: `${currentLevel.color}20`, borderColor: `${currentLevel.color}40` }}>
             <span className="text-xs font-bold uppercase" style={{ color: currentLevel.color }}>Rumo ao {currentLevel.name}</span>
        </div>
      </div>

      {/* DASHBOARD GRÁFICOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* 1. GRÁFICO DA PLACA (Dinâmico) */}
          <GaugeChart 
            label={`Rumo ao ${currentLevel.name}`}
            value={stats.total} 
            max={currentLevel.target} 
            color={currentLevel.color}
            subLabel={`${((stats.total / currentLevel.target) * 100).toFixed(1)}% do objetivo`}
          />

          {/* 2. GRÁFICO DA REDE (Meta Fixa ou Proporcional - deixei fixa em 20k para incentivo) */}
          <GaugeChart 
            label="Potencial da Rede" 
            value={stats.network} 
            max={20000} 
            color="#C9A66B" // Dourado padrão
            subLabel="Ganhos por indicação"
          />

           {/* 3. GRÁFICO EVOLUÇÃO (MÉRITO) */}
           <GaugeChart 
            label="Evolução Técnica" 
            value={stats.own} 
            max={currentLevel.target} // Usa a mesma meta da placa para incentivar estudo
            color="#fff" // Branco
            subLabel="Seu esforço pessoal"
          />
      </div>

      {/* BANNER DE PRÓXIMO NÍVEL */}
      <div className="relative group overflow-hidden rounded-xl border border-[#222] bg-[#0a0a0a]">
          <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity" 
               style={{ background: `linear-gradient(to right, ${currentLevel.color}40, transparent)` }}></div>
          <div className="relative p-6 flex items-center justify-between">
            <div>
                <h3 className="font-bold text-white text-lg" style={{ color: currentLevel.color }}>Próxima Placa: {currentLevel.name}</h3>
                <p className="text-gray-400 text-sm mt-1">Atingir <strong className="text-white">{currentLevel.target.toLocaleString()} PRO</strong> para desbloquear este status.</p>
            </div>
            <div className="bg-[#111] p-3 rounded-full border border-[#333] shadow-xl">
                <Lock size={24} style={{ color: currentLevel.color }} />
            </div>
          </div>
      </div>

    </div>
  );
}
