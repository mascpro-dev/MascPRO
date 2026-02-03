"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, Users, Loader2 } from "lucide-react";

// --- 1. NÍVEIS TÉCNICOS (Baseado em Moedas PRO) ---
const TECH_LEVELS = [
  { name: "PROFISSIONAL BRONZE", limit: 10000, color: "#22c55e" },   // Verde 🟢
  { name: "PROFISSIONAL PRATA", limit: 50000, color: "#3b82f6" },    // Azul 🔵
  { name: "PROFISSIONAL GOLD", limit: 150000, color: "#a855f7" },   // Roxo 🟣
  { name: "PROFISSIONAL BLACK", limit: 500000, color: "#ef4444" }   // Vermelho 🔴
];

// --- 2. NÍVEIS DE EMBAIXADOR (Baseado em Pessoas indicadas) ---
const AMBASSADOR_LEVELS = [
  { name: "EMBAIXADOR CERTIFIED", limit: 15, color: "#22c55e" },     // Verde 🟢 (0-15)
  { name: "EMBAIXADOR EXPERT", limit: 50, color: "#3b82f6" },        // Azul 🔵 (16-50)
  { name: "EMBAIXADOR MASTER", limit: 150, color: "#a855f7" },       // Roxo 🟣 (51-150)
  { name: "EMBAIXADOR EDUCADOR", limit: 999999, color: "#ef4444" }   // Vermelho 🔴 (+150)
];

export default function JornadaPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  
  // Dados do Usuário
  const [stats, setStats] = useState({ total: 0, referralCount: 0 });
  const [currentTech, setCurrentTech] = useState(TECH_LEVELS[0]);
  const [currentAmbassador, setCurrentAmbassador] = useState(AMBASSADOR_LEVELS[0]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Busca os totais da nossa View (que já conta pessoas e moedas)
      const { data: totals } = await supabase.from("v_pro_totals").select("*").eq("profile_id", user.id).single();

      if (totals) {
          const totalCoins = totals.pro_total || 0;
          const totalPeople = totals.referral_count || 0;

          setStats({ total: totalCoins, referralCount: totalPeople });

          // Lógica Nível Técnico (Moedas)
          // Procura o primeiro nível cuja meta é maior que o total atual
          const tech = TECH_LEVELS.find(lvl => lvl.limit > totalCoins) || TECH_LEVELS[TECH_LEVELS.length - 1];
          setCurrentTech(tech);

          // Lógica Nível Embaixador (Pessoas)
          // Procura o nível baseado na quantidade de indicados
          let amb = AMBASSADOR_LEVELS[0];
          if (totalPeople > 15) amb = AMBASSADOR_LEVELS[1];
          if (totalPeople > 50) amb = AMBASSADOR_LEVELS[2];
          if (totalPeople > 150) amb = AMBASSADOR_LEVELS[3];
          setCurrentAmbassador(amb);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      
      {/* CABEÇALHO */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wider">MINHA JORNADA</h1>
        <p className="text-gray-400 text-sm">Acompanhe sua evolução profissional e de liderança.</p>
      </div>

      {/* GRID DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* CARD 1: MÉRITOCRACIA TÉCNICA */}
          <div className="bg-[#111] border border-[#222] p-6 rounded-2xl relative overflow-hidden group hover:border-gray-700 transition-colors">
              {/* Ícone Gigante de Fundo (Efeito Visual) */}
              <div className="absolute -top-4 -right-4 opacity-10 rotate-12 transition-all group-hover:opacity-20 group-hover:rotate-0">
                  <Trophy size={140} color={currentTech.color} />
              </div>
              
              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                        <Trophy size={28} style={{ color: currentTech.color }} />
                      </div>
                      <div>
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Mérito Técnico</h3>
                          <p className="text-[10px] text-gray-500">Baseado em PROs Acumulados</p>
                      </div>
                  </div>
                  
                  <div className="mb-8">
                      <span className="text-5xl font-bold text-white block tracking-tighter">{stats.total.toLocaleString()}</span>
                      <span className="text-xs uppercase font-bold mt-1 block" style={{ color: currentTech.color }}>
                          Rumo ao {currentTech.name}
                      </span>
                  </div>
                  
                  {/* Barra de Progresso */}
                  <div className="w-full h-4 bg-[#000] rounded-full mb-2 overflow-hidden border border-[#333]">
                      <div 
                        className="h-full transition-all duration-1000 relative" 
                        style={{ width: `${Math.min((stats.total / currentTech.limit) * 100, 100)}%`, backgroundColor: currentTech.color }}
                      >
                          {/* Brilho na barra */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full skew-x-12 opacity-50"></div>
                      </div>
                  </div>
                  
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <span>Progresso Atual</span>
                      <span>Meta: {currentTech.limit.toLocaleString()} PRO</span>
                  </div>
              </div>
          </div>

          {/* CARD 2: NÍVEIS DE EMBAIXADOR */}
          <div className="bg-[#111] border border-[#222] p-6 rounded-2xl relative overflow-hidden group hover:border-gray-700 transition-colors">
              {/* Ícone Gigante de Fundo */}
              <div className="absolute -top-4 -right-4 opacity-10 rotate-12 transition-all group-hover:opacity-20 group-hover:rotate-0">
                  <Users size={140} color={currentAmbassador.color} />
              </div>
              
              <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                        <Users size={28} style={{ color: currentAmbassador.color }} />
                      </div>
                      <div>
                          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Embaixador</h3>
                          <p className="text-[10px] text-gray-500">Baseado em sua Rede</p>
                      </div>
                  </div>
                  
                  <div className="mb-8">
                      <span className="text-5xl font-bold text-white block tracking-tighter">{stats.referralCount}</span>
                      <span className="text-xs uppercase font-bold mt-1 block" style={{ color: currentAmbassador.color }}>
                          {currentAmbassador.name}
                      </span>
                  </div>
                  
                  {/* Barra de Progresso */}
                  <div className="w-full h-4 bg-[#000] rounded-full mb-2 overflow-hidden border border-[#333]">
                      <div 
                        className="h-full transition-all duration-1000 relative" 
                        style={{ width: `${Math.min((stats.referralCount / currentAmbassador.limit) * 100, 100)}%`, backgroundColor: currentAmbassador.color }}
                      >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full skew-x-12 opacity-50"></div>
                      </div>
                  </div>
                  
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <span>{stats.referralCount} Pessoas</span>
                      <span>Próx. Nível: {currentAmbassador.limit}</span>
                  </div>
              </div>
          </div>

      </div>
    </div>
  );
}
