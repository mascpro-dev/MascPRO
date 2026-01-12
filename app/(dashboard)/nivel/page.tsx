"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { ChevronLeft, Trophy, Medal, Crown, Star } from "lucide-react"
import XPBar from "@/components/xp-bar"

export default function RankingPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)

  // Apenas para carregar a página suavemente
  useEffect(() => {
    setLoading(false)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* CABEÇALHO COM O BOTÃO VOLTAR CORRIGIDO */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.push('/')} // <--- AQUI ESTÁ A CORREÇÃO (Manda para Home)
            className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:text-blue-600 active:scale-95 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em]">Minha Evolução</p>
            <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
              Painel de Nível
            </h1>
          </div>
        </div>

        {/* BARRA DE XP BLINDADA */}
        <XPBar />

        {/* CONTEÚDO EXPLICATIVO DE NÍVEIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[
              { nome: "CERTIFICADO", xp: "0 - 50k", icon: <Medal size={24} />, cor: "bg-blue-100 text-blue-600" },
              { nome: "EXPERT", xp: "50k - 100k", icon: <Star size={24} />, cor: "bg-red-100 text-red-600" },
              { nome: "MASTER", xp: "100k - 200k", icon: <Crown size={24} />, cor: "bg-purple-100 text-purple-600" },
              { nome: "EDUCADOR", xp: "200k+", icon: <Trophy size={24} />, cor: "bg-amber-100 text-amber-600" },
            ].map((nivel) => (
              <div key={nivel.nome} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${nivel.cor}`}>
                  {nivel.icon}
                </div>
                <div>
                  <h3 className="font-black italic text-slate-900 uppercase">{nivel.nome}</h3>
                  <p className="text-xs font-bold text-slate-400">{nivel.xp} XP</p>
                </div>
              </div>
            ))}
        </div>

      </div>
    </div>
  )
}