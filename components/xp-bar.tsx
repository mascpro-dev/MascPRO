"use client"

import { Trophy, Star, TrendingUp } from "lucide-react"

export default function XPBar() {
  // DADOS DE TESTE (Para ver funcionando agora)
  // Futuramente, isso virá do banco de dados
  const userLevel = 2
  const currentXP = 2450
  const nextLevelXP = 3000
  const progress = (currentXP / nextLevelXP) * 100
  const remainingXP = nextLevelXP - currentXP

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-xl border border-slate-700 relative overflow-hidden mb-8">
      
      {/* Detalhe de Fundo (Brilho) */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-blue-500 opacity-10 rounded-full blur-3xl"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          
          {/* Lado Esquerdo: Nível Atual */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400 blur-sm opacity-20 rounded-full"></div>
              <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-800 z-10 relative">
                <Trophy size={20} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-slate-700">
                Lvl {userLevel}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Membro Prata</h3>
              <div className="flex items-center text-xs text-slate-400 gap-1">
                <Star size={12} className="text-yellow-500" />
                <span>Próximo: Membro Ouro</span>
              </div>
            </div>
          </div>

          {/* Lado Direito: XP Restante */}
          <div className="text-right hidden sm:block">
            <p className="text-2xl font-bold text-white tracking-tight">{currentXP}</p>
            <p className="text-xs text-slate-400">XP Total Acumulado</p>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-slate-300">
            <span>Progresso do Nível</span>
            <span className="text-yellow-400 flex items-center gap-1">
              <TrendingUp size={12} />
              Faltam {remainingXP} XP
            </span>
          </div>
          
          <div className="h-4 w-full bg-slate-700/50 rounded-full overflow-hidden backdrop-blur-sm border border-slate-600/30">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-1000 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Efeito de brilho passando na barra */}
              <div className="absolute top-0 bottom-0 right-0 w-full bg-gradient-to-l from-white/20 to-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}