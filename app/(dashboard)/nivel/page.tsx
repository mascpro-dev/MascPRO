"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trophy, Crown, Medal, Loader2, Zap, CheckCircle2, Award, Star, ShieldCheck } from "lucide-react"

export default function RankingPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Função para converter XP em Nome de Patente
  const getPatente = (xp: number) => {
    if (xp >= 30000) return { nome: "MASTER EDUCADOR", cor: "text-purple-600", bg: "bg-purple-100", icon: <Crown size={14} /> };
    if (xp >= 15000) return { nome: "MASTER TECH", cor: "text-red-600", bg: "bg-red-100", icon: <ShieldCheck size={14} /> };
    if (xp >= 5000) return { nome: "EXPERT", cor: "text-blue-600", bg: "bg-blue-100", icon: <Award size={14} /> };
    return { nome: "CERTIFICADO", cor: "text-slate-500", bg: "bg-slate-100", icon: <CheckCircle2 size={14} /> };
  }

  useEffect(() => {
    const fetchRanking = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('email, xp, tipo_usuario')
        .order('xp', { ascending: false })
        .limit(20)

      if (data) setLeaderboard(data)
      setLoading(false)
    }
    fetchRanking()
  }, [supabase])

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="animate-spin text-amber-500" size={40} />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold group">
            <div className="p-2 bg-white rounded-full border shadow-sm group-hover:shadow-md transition-all">
              <ArrowLeft size={20} />
            </div>
            <span>Dashboard</span>
          </button>
          <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase">
            <Trophy size={14} className="text-amber-400" /> Leaderboard Masc PRO
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-5xl font-black text-slate-900 italic uppercase tracking-tighter">Elite Embaixadores</h1>
          <p className="text-slate-500 font-bold text-xs mt-2 uppercase tracking-[0.3em]">Da Certificação ao Mestrado</p>
        </div>

        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
          {leaderboard.map((user, index) => {
            const patente = getPatente(user.xp)
            const isFirst = index === 0

            return (
              <div key={user.email} className={`flex items-center justify-between p-6 border-b border-slate-50 transition-all ${isFirst ? 'bg-amber-50/40' : ''}`}>
                <div className="flex items-center gap-6">
                  <div className="w-8 text-center font-black text-xl italic text-slate-300">
                    {isFirst ? "🥇" : `#${index + 1}`}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-900 uppercase italic leading-none">
                        {user.email.split('@')[0]}
                      </p>
                    </div>
                    {/* TAG DA PATENTE */}
                    <div className={`flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg w-fit ${patente.bg} ${patente.cor}`}>
                      {patente.icon}
                      <span className="text-[9px] font-black tracking-wider uppercase">{patente.nome}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-black text-xl text-slate-800 leading-none">
                    {user.xp.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase">XP</span>
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}