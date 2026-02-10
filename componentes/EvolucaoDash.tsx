"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function EvolucaoDash() {
  const supabase = createClientComponentClient();
  const [pontos, setPontos] = useState(0);

  useEffect(() => {
    async function loadStats() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('moedas_pro_acumuladas')
          .eq('id', session.user.id)
          .single();
        setPontos(Number(data?.moedas_pro_acumuladas || 0));
      }
    }
    loadStats();
  }, []);

  const niveis = [
    { nome: "CERTIFIED", meta: 10000, cor: "#22C55E", label: "🟢" },
    { nome: "EXPERT", meta: 50000, cor: "#3B82F6", label: "🔵" },
    { nome: "MASTER TECH", meta: 100000, cor: "#A855F7", label: "🟣" },
    { nome: "EDUCADOR", meta: 250000, cor: "#EF4444", label: "🔴" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {niveis.map((nivel) => {
        const progresso = Math.min((pontos / nivel.meta) * 100, 100);
        const raio = 36;
        const circunferencia = 2 * Math.PI * raio;
        const offset = circunferencia - (progresso / 100) * circunferencia;

        return (
          <div key={nivel.nome} className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex flex-col items-center gap-4 relative overflow-hidden group">
            <div className="relative w-24 h-24">
              {/* Círculo de Fundo */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r={raio} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-zinc-800" />
                {/* Círculo de Progresso */}
                <circle 
                  cx="48" cy="48" r={raio} stroke={nivel.cor} strokeWidth="6" fill="transparent" 
                  strokeDasharray={circunferencia}
                  style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s ease-in-out' }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-[10px] font-black text-white">{Math.floor(progresso)}%</span>
              </div>
            </div>
            
            <div className="text-center">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{nivel.nome}</p>
                <p className="text-xs font-black text-white mt-1">{nivel.meta.toLocaleString()} PRO</p>
            </div>
            
            {progresso >= 100 && (
                <div 
                  className="absolute top-2 right-2 w-2 h-2 rounded-full" 
                  style={{ 
                    backgroundColor: nivel.cor,
                    boxShadow: `0 0 10px ${nivel.cor}` // O nome correto é boxShadow
                  }} 
                />
            )}
          </div>
        );
      })}
    </div>
  );
}
