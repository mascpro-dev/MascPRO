"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Trophy, Star, Crown, Zap } from "lucide-react"

export default function XPBar() {
  const supabase = createClientComponentClient()
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPerfil = async () => {
      // CORREÇÃO ERRO 01: Usando a forma correta de pegar a sessão/usuário
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (data) setPerfil(data)
      }
      setLoading(false)
    }

    fetchPerfil()

    // CORREÇÃO ERRO 02: Tipando o payload como 'any' explicitamente para o TS não reclamar
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles' }, 
        (payload: any) => {
          setPerfil(payload.new)
        }
      )
      .subscribe()

    return () => { 
      supabase.removeChannel(channel) 
    }
  }, [supabase])

  if (loading) return <div className="h-32 w-full bg-slate-100 animate-pulse rounded-[32px]" />

  // Lógica de Nível
  const xpTotal = perfil?.xp || 0
  const nivel = Math.floor(xpTotal / 1000) + 1
  const xpNoNivelAtual = xpTotal % 1000
  const progressoPorcentagem = (xpNoNivelAtual / 1000) * 100

  const isEmbaixador = perfil?.tipo_usuario === 'embaixador'
  const corPrimaria = isEmbaixador ? "from-amber-500 to-yellow-300" : "from-blue-600 to-cyan-400"

  return (
    <div className="bg-slate-900 rounded-[32px] p-6 shadow-2xl border border-white/10 relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${corPrimaria} flex items-center justify-center shadow-lg`}>
              {isEmbaixador ? <Crown className="text-slate-900" size={32} /> : <Trophy className="text-white" size={30} />}
            </div>
            <div>
              <div className="flex items-center gap-2 text-yellow-500 font-black text-[10px] uppercase tracking-[0.2em]">
                <Zap size={12} className="fill-yellow-500" /> {perfil?.tipo_usuario || 'Membro'} Masc PRO
              </div>
              <h2 className="text-3xl font-black text-white italic leading-none">LVL {nivel}</h2>
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total XP</span>
            <div className="text-white font-black text-xl leading-none">{xpTotal.toLocaleString()}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
            <span className="text-slate-400">Progresso do Nível</span>
            <span className="text-white">{Math.floor(progressoPorcentagem)}%</span>
          </div>
          <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden border border-white/5 p-[2px]">
            <div 
              className={`h-full bg-gradient-to-r ${corPrimaria} rounded-full transition-all duration-1000`}
              style={{ width: `${progressoPorcentagem}%` }}
            />
          </div>
        </div>
        
        <p className="text-slate-500 text-[9px] mt-4 font-bold uppercase tracking-[0.1em] text-center">
          {isEmbaixador ? "Você ganha 50% de XP em todas as atividades" : "Evolua para subir de cargo"}
        </p>
      </div>
      
      <Star className="absolute -right-4 -top-4 text-white/5 w-24 h-24 rotate-12" />
    </div>
  )
}