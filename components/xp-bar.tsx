"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Trophy, Star, Crown, Zap, Loader2, CheckCircle2, Award, ShieldCheck } from "lucide-react"

export default function XPBar() {
  const supabase = createClientComponentClient()
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (data) setPerfil(data)
        }
      } catch (error) {
        console.error("Erro ao carregar XP:", error)
      } finally {
        setLoading(false)
      }
    }

    carregarDados()

    const channel = supabase
      .channel('xp-realtime')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles' }, 
        (payload: any) => {
          setPerfil(payload.new)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  if (loading) return (
    <div className="h-32 w-full bg-slate-900/50 animate-pulse rounded-[32px] flex items-center justify-center">
      <Loader2 className="animate-spin text-slate-500" />
    </div>
  )

  // LOGICA DE PATENTES MASC PRO
  const xpTotal = perfil?.xp || 0
  
  const getPatente = (xp: number) => {
    if (xp >= 30000) return { 
        nome: "MASTER EDUCADOR", 
        cor: "from-purple-600 to-indigo-400", 
        icone: <Crown size={32} className="text-white" />,
        meta: 50000 // Meta para o próximo nível simbólico
    };
    if (xp >= 15000) return { 
        nome: "MASTER TECH", 
        cor: "from-red-600 to-orange-400", 
        icone: <ShieldCheck size={32} className="text-white" />,
        meta: 30000 
    };
    if (xp >= 5000) return { 
        nome: "EXPERT", 
        cor: "from-blue-600 to-cyan-400", 
        icone: <Award size={32} className="text-white" />,
        meta: 15000 
    };
    return { 
        nome: "CERTIFICADO", 
        cor: "from-slate-600 to-slate-400", 
        icone: <CheckCircle2 size={32} className="text-white" />,
        meta: 5000 
    };
  }

  const patente = getPatente(xpTotal)
  const metaAtual = patente.meta
  const progressoPorcentagem = Math.min((xpTotal / metaAtual) * 100, 100)

  return (
    <div className="bg-slate-900 rounded-[32px] p-6 shadow-2xl border border-white/10 relative overflow-hidden">
      {/* Efeito de brilho de fundo */}
      <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${patente.cor} opacity-20 blur-3xl`} />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${patente.cor} flex items-center justify-center shadow-xl shadow-black/40 border border-white/20`}>
              {patente.icone}
            </div>
            <div>
              <div className="flex items-center gap-2 text-yellow-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">
                <Zap size={12} className="fill-yellow-500" /> Embaixador Masc PRO
              </div>
              <h2 className="text-2xl font-black text-white italic leading-none tracking-tighter uppercase">
                {patente.nome}
              </h2>
            </div>
          </div>
          
          <div className="text-right">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Seu Pontuário</span>
            <div className="text-white font-black text-2xl leading-none">
              {xpTotal.toLocaleString()} <span className="text-xs text-slate-500">XP</span>
            </div>
          </div>
        </div>

        {/* Barra de Evolução de Patente */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
            <span className="text-slate-400">Progresso para próxima patente</span>
            <span className="text-white">{Math.floor(progressoPorcentagem)}%</span>
          </div>
          <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[3px]">
            <div 
              className={`h-full bg-gradient-to-r ${patente.cor} rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(255,255,255,0.1)]`}
              style={{ width: `${progressoPorcentagem}%` }}
            />
          </div>
        </div>
        
        <div className="flex justify-between mt-4">
            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.15em]">
              Status: Ativo
            </p>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.15em]">
              Próxima meta: {metaAtual.toLocaleString()} XP
            </p>
        </div>
      </div>
      
      <Star className="absolute -left-4 -bottom-4 text-white/5 w-20 h-20 -rotate-12" />
    </div>
  )
}