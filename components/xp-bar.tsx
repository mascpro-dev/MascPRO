"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Trophy, Star } from "lucide-react"

export default function XPBar() {
  const supabase = createClientComponentClient()
  const [xp, setXp] = useState(0)
  const [nivel, setNivel] = useState(1)

  useEffect(() => {
    const fetchXP = async () => {
      // Contamos quantos agendamentos o usuário já fez
      const { count } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
      
      if (count !== null) {
        // Cada agendamento dá 20 de XP. Se chegar em 100, sobe de nível.
        const totalXP = count * 20
        const novoNivel = Math.floor(totalXP / 100) + 1
        const xpAtualNoNivel = totalXP % 100

        setXp(xpAtualNoNivel)
        setNivel(novoNivel)
      }
    }
    fetchXP()
  }, [])

  return (
    <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl p-6 shadow-xl border border-white/10 relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex justify-between items-end mb-4">
          <div>
            <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-[0.2em] mb-1">
              <Star size={14} className="fill-blue-400" /> Nível atual
            </div>
            <h2 className="text-4xl font-black text-white italic">LVL {nivel}</h2>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Progresso</span>
            <div className="text-white font-black text-xl">{xp}%</div>
          </div>
        </div>

        {/* BARRA DE PROGRESSO */}
        <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out"
            style={{ width: `${xp}%` }}
          />
        </div>
        
        <p className="text-slate-400 text-[10px] mt-3 font-medium uppercase tracking-wider">
          Faltam {100 - xp} XP para o próximo nível. Continue agendando!
        </p>
      </div>
      
      {/* Decoração de fundo */}
      <Trophy className="absolute -right-4 -bottom-4 text-white/5 w-32 h-32 rotate-12" />
    </div>
  )
}