"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Trophy, Zap, Star, Loader2 } from "lucide-react"

export default function XPBar() {
  const supabase = createClientComponentClient()
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getXP = async () => {
      // Valida a sessão para evitar erro 401
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('xp, tipo_usuario')
          .eq('id', user.id)
          .single()
        
        if (!error) setPerfil(data)
      }
      setLoading(false)
    }
    getXP()
  }, [supabase])

  // Lógica de Patentes MASC PRO (Sincronizada com a Sidebar)
  const calcularNivel = (xp: number = 0) => {
    const ehEmbaixador = perfil?.tipo_usuario === 'embaixador' && xp < 30000;
    
    if (xp >= 200000) return { nome: "EDUCADOR", proximo: 0, progresso: 100, cor: "from-amber-400 to-yellow-600" }
    if (xp >= 100000) return { nome: "MASTER", proximo: 200000, progresso: (xp / 200000) * 100, cor: "from-purple-500 to-indigo-600" }
    if (xp >= 50000) return { nome: "EXPERT", proximo: 100000, progresso: (xp / 100000) * 100, cor: "from-red-500 to-orange-600" }
    if (ehEmbaixador || xp >= 10000) return { nome: "CERTIFICADO", proximo: 50000, progresso: (xp / 50000) * 100, cor: "from-blue-600 to-cyan-500" }
    return { nome: "MASC LOVER", proximo: 10000, progresso: (xp / 10000) * 100, cor: "from-pink-500 to-rose-500" }
  }

  const status = calcularNivel(perfil?.xp || 0)

  if (loading) return (
    <div className="h-28 w-full bg-slate-100 animate-pulse rounded-[32px] flex items-center justify-center">
      <Loader2 className="animate-spin text-slate-300" />
    </div>
  )

  return (
    <div className="relative overflow-hidden bg-slate-900 rounded-[32px] p-6 shadow-2xl border border-white/5">
      {/* Detalhe Visual de Fundo */}
      <div className="absolute -top-4 -right-4 opacity-10">
        <Trophy size={120} className="text-white rotate-12" />
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Star size={14} className="fill-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">Status da Patente</span>
            </div>
            <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter leading-none">
              {status.nome}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">XP Atual</p>
            <p className="text-2xl font-black italic text-white leading-none">
              {perfil?.xp || 0} <span className="text-[10px] text-blue-400">pts</span>
            </p>
          </div>
        </div>

        {/* Barra de Progresso com Neon */}
        <div className="space-y-3">
          <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-[2px]">
            <div 
              className={`h-full bg-gradient-to-r ${status.cor} rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.4)]`}
              style={{ width: `${status.progresso}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600/20 p-1 rounded-md">
                <Zap size={10} className="text-blue-400" />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {Math.floor(status.progresso)}% para o próximo nível
              </span>
            </div>
            
            {status.proximo > 0 && (
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Faltam {status.proximo - (perfil?.xp || 0)} XP
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}