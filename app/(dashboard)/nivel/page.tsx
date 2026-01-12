"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trophy, Crown, Star, Medal, Loader2, Zap } from "lucide-react"

export default function RankingPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRanking = async () => {
      // Busca os top 20 usuários com mais XP
      const { data, error } = await supabase
        .from('profiles')
        .select('email, xp, tipo_usuario')
        .order('xp', { ascending: false })
        .limit(20)

      if (data) setLeaderboard(data)
      setLoading(false)
    }

    fetchRanking()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="animate-spin text-amber-500" size={40} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all font-bold group"
          >
            <div className="p-2 bg-white rounded-full border shadow-sm group-hover:shadow-md">
              <ArrowLeft size={20} />
            </div>
            <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-full border border-amber-200">
            <Trophy size={18} className="text-amber-600" />
            <span className="font-black text-amber-700 uppercase text-[10px] tracking-widest">Elite Masc PRO</span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black text-slate-900 italic uppercase tracking-tighter">Ranking Global</h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Os líderes em performance e fidelidade</p>
        </div>

        {/* LISTA DE RANKING */}
        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
          {leaderboard.map((user, index) => {
            const isFirst = index === 0
            const isSecond = index === 1
            const isThird = index === 2
            const isEmbaixador = user.tipo_usuario === 'embaixador'

            return (
              <div 
                key={user.email} 
                className={`flex items-center justify-between p-6 border-b border-slate-50 last:border-0 transition-all hover:bg-slate-50/50 ${isFirst ? 'bg-amber-50/30' : ''}`}
              >
                <div className="flex items-center gap-6">
                  {/* POSIÇÃO */}
                  <div className="w-10 text-center font-black text-2xl italic text-slate-300">
                    {isFirst ? <Crown className="text-amber-500 w-8 h-8 mx-auto" /> : 
                     isSecond ? <Medal className="text-slate-400 w-7 h-7 mx-auto" /> :
                     isThird ? <Medal className="text-amber-700 w-7 h-7 mx-auto" /> : 
                     `#${index + 1}`}
                  </div>

                  {/* INFO USUÁRIO */}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-black uppercase italic ${isFirst ? 'text-xl text-slate-900' : 'text-slate-700'}`}>
                        {user.email.split('@')[0]}
                      </p>
                      {isEmbaixador && (
                        <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-200 uppercase">
                          Embaixador
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Zap size={10} className="fill-slate-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Nível {Math.floor(user.xp / 1000) + 1}</span>
                    </div>
                  </div>
                </div>

                {/* PONTUAÇÃO */}
                <div className="text-right">
                  <p className={`font-black ${isFirst ? 'text-2xl text-amber-600' : 'text-xl text-slate-800'}`}>
                    {user.xp.toLocaleString()} 
                    <span className="text-[10px] ml-1 text-slate-400">XP</span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* RODAPÉ DO RANKING */}
        <div className="p-8 bg-slate-900 rounded-[40px] text-center relative overflow-hidden">
          <Star className="absolute left-4 top-4 text-white/5 w-16 h-16" />
          <p className="text-white font-black italic text-lg relative z-10">QUER SUBIR NO RANKING?</p>
          <p className="text-slate-400 text-sm font-medium relative z-10">Assista aulas na Academy e garanta seus produtos na Loja!</p>
        </div>

      </div>
    </div>
  )
}