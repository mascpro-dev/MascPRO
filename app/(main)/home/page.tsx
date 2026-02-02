"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Trophy, Target, TrendingUp, Award, Activity, AlertTriangle } from "lucide-react";

const PLACAS = [
  { limit: 0, title: "Iniciante", color: "text-gray-400", border: "border-gray-600", bg: "bg-gray-500" },
  { limit: 10000, title: "Profissional em Construção", color: "text-green-500", border: "border-green-500", bg: "bg-green-500" },
  { limit: 50000, title: "Profissional Validado", color: "text-blue-500", border: "border-blue-500", bg: "bg-blue-500" },
  { limit: 150000, title: "Referência Técnica", color: "text-purple-500", border: "border-purple-500", bg: "bg-purple-500" },
  { limit: 250000, title: "Formador de Profissionais", color: "text-orange-500", border: "border-orange-500", bg: "bg-orange-500" },
  { limit: 500000, title: "Educador Masc Pro", color: "text-red-600", border: "border-red-600", bg: "bg-red-600" },
];

export default function HomePage() {
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Placas
  const [currentRank, setCurrentRank] = useState(PLACAS[0]);
  const [nextRank, setNextRank] = useState(PLACAS[1]);
  const [progress, setProgress] = useState(0);

  // Cálculos da Nova Regra
  const [totalPro, setTotalPro] = useState(0);
  const [activePro, setActivePro] = useState(0);
  const [passivePro, setPassivePro] = useState(0);
  const [passiveLimit, setPassiveLimit] = useState(0);

  useEffect(() => {
    async function initSystem() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 1. Avisa o sistema que estou ONLINE (Regra do Padrinho Ativo)
          await supabase.rpc('ping_activity');

          // 2. Busca dados
          const { data } = await supabase
            .from("profiles")
            .select("*, active_pro, passive_pro")
            .eq("id", user.id)
            .single();
          
          if (data) {
            setProfile(data);
            
            const active = data.active_pro || 0;
            const passive = data.passive_pro || 0;
            const total = active + passive;
            
            // Regra dos 70%
            const limit = Math.floor(active * 0.70);

            setActivePro(active);
            setPassivePro(passive);
            setTotalPro(total);
            setPassiveLimit(limit);

            calcularRanking(total);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    }
    initSystem();
  }, [supabase]);

  function calcularRanking(total: number) {
    let rank = PLACAS[0];
    let next = PLACAS[1];
    for (let i = 0; i < PLACAS.length; i++) {
      if (total >= PLACAS[i].limit) {
        rank = PLACAS[i];
        next = PLACAS[i + 1] || null;
      }
    }
    setCurrentRank(rank);
    setNextRank(next);
    if (next) {
      const range = next.limit - rank.limit;
      const current = total - rank.limit;
      setProgress(Math.min(100, Math.max(0, (current / range) * 100)));
    } else {
      setProgress(100);
    }
  }

  // Alerta de Teto Passivo
  const isCapped = passivePro >= passiveLimit && activePro > 0;
  const passiveProgress = activePro > 0 ? (passivePro / passiveLimit) * 100 : 0;

  return (
    <div className="p-6 md:p-10 min-h-screen bg-[#000000] text-white font-sans">
      
      {/* 1. CARD PLACA PRINCIPAL */}
      <div className={`relative overflow-hidden rounded-2xl border ${currentRank.border} bg-[#0A0A0A] p-6 mb-8 transition-all duration-500`}>
        <div className={`absolute -top-10 -right-10 w-40 h-40 ${currentRank.bg} opacity-10 blur-[80px] rounded-full`}></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-1">Status Oficial</p>
              <h2 className={`text-2xl md:text-3xl font-black italic tracking-wide ${currentRank.color}`}>
                {currentRank.title.toUpperCase()}
              </h2>
            </div>
            <Award className={`w-10 h-10 ${currentRank.color}`} />
          </div>

          <div className="mb-6">
            {loading ? (
              <div className="flex items-center gap-2">
                <span className="inline-block h-12 w-32 bg-white/10 rounded animate-pulse" />
                <span className="text-[#C9A66B] text-sm font-bold ml-2">PRO TOTAL</span>
              </div>
            ) : (
              <>
                <span className="text-5xl font-bold text-white tracking-tighter">{totalPro}</span>
                <span className="text-[#C9A66B] text-sm font-bold ml-2">PRO TOTAL</span>
              </>
            )}
          </div>

          {/* Barra Placa */}
          {nextRank && !loading && (
            <div className="mb-2">
              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-1">
                <span>Próximo Nível</span>
                <span>{nextRank.limit.toLocaleString('pt-BR')} PRO</span>
              </div>
              <div className="h-1.5 w-full bg-[#222] rounded-full overflow-hidden">
                <div className={`h-full ${currentRank.bg} transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. PAINEL DE ENGENHARIA (ATIVO vs PASSIVO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        
        {/* Card Ativo */}
        <div className="bg-[#111] border border-[#222] p-4 rounded-xl flex items-center gap-4">
          <div className="bg-green-500/10 p-3 rounded-full text-green-500">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold">PRO Ativo (Seu esforço)</p>
            {loading ? (
              <span className="inline-block h-6 w-16 bg-white/10 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-bold text-white">{activePro}</p>
            )}
            <p className="text-[10px] text-gray-600">Compras + Aulas assistidas</p>
          </div>
        </div>

        {/* Card Passivo (Com Alerta de Trava) */}
        <div className={`border p-4 rounded-xl flex flex-col justify-center ${isCapped ? "bg-red-900/10 border-red-900/50" : "bg-[#111] border-[#222]"}`}>
          <div className="flex justify-between items-start mb-2">
             <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isCapped ? "bg-red-500 text-black" : "bg-blue-500/10 text-blue-500"}`}>
                  {isCapped ? <AlertTriangle size={24} /> : <TrendingUp size={24} />}
                </div>
                <div>
                  <p className={`text-xs uppercase font-bold ${isCapped ? "text-red-400" : "text-gray-500"}`}>PRO Passivo (Rede)</p>
                  {loading ? (
                    <span className="inline-block h-6 w-24 bg-white/10 rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-xl font-bold text-white">{passivePro} <span className="text-xs text-gray-600 font-normal">/ limite {passiveLimit}</span></p>
                  )}
                </div>
             </div>
          </div>
          
          {/* Barra de Limite 70% */}
          {!loading && (
            <>
              <div className="w-full h-1.5 bg-[#000] rounded-full overflow-hidden mt-2 relative">
                 <div 
                   className={`h-full transition-all ${isCapped ? "bg-red-500" : "bg-blue-500"}`} 
                   style={{ width: `${Math.min(100, passiveProgress)}%` }} 
                 />
              </div>
              <p className="text-[10px] text-right mt-1 font-mono text-gray-500">
                {isCapped ? "LIMITE ATINGIDO. GERE MAIS PRO ATIVO." : `Capacidade da rede: ${Math.floor(passiveProgress)}%`}
              </p>
            </>
          )}
        </div>

      </div>

      {/* 3. MENU */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/evolucao" className="bg-[#111] border border-[#222] p-5 rounded-xl hover:border-[#C9A66B] transition-all group">
          <TrendingUp className="w-8 h-8 text-gray-500 group-hover:text-[#C9A66B] mb-3" />
          <h3 className="font-bold text-lg">Evolução</h3>
          <p className="text-xs text-gray-500">Gerar PRO Ativo</p>
        </Link>
        
        <Link href="/jornada" className="bg-[#111] border border-[#222] p-5 rounded-xl hover:border-[#C9A66B] transition-all group">
          <Target className="w-8 h-8 text-gray-500 group-hover:text-[#C9A66B] mb-3" />
          <h3 className="font-bold text-lg">Minha Jornada</h3>
          <p className="text-xs text-gray-500">Ver Carreira</p>
        </Link>
      </div>

    </div>
  );
}
