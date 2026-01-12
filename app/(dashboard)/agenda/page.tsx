"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, ChevronRight, Plus, 
  Clock, Video, User, Loader2 
} from "lucide-react"
import XPBar from "@/components/xp-bar"
import { toast } from "react-hot-toast"

export default function AgendaPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setLoading(false)
    }
    checkUser()
  }, [supabase])

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* CABEÇALHO COM O BOTÃO VOLTAR CORRIGIDO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')} // <--- AQUI ESTÁ A CORREÇÃO
              className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:text-blue-600 active:scale-95 transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-2 italic">Performance & Tempo</p>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
                Minha <span className="text-slate-300">Agenda</span>
              </h1>
            </div>
          </div>
          
          <button 
            onClick={() => toast.success("Agendamento em breve!")}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase italic tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95 w-full md:w-auto justify-center"
          >
            <Plus size={20} /> Novo
          </button>
        </div>

        <XPBar />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* CALENDÁRIO VISUAL */}
          <div className="lg:col-span-2 bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase italic">Janeiro 2026</h2>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-50 rounded-lg"><ChevronLeft size={20} /></button>
                <button className="p-2 hover:bg-slate-50 rounded-lg"><ChevronRight size={20} /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 31 }).map((_, i) => (
                <div key={i} className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-bold transition-all ${i + 1 === 13 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50 text-slate-600'}`}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* LISTA DE COMPROMISSOS */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 uppercase italic">Próximos</h3>
            <div className="bg-white p-6 rounded-[32px] border-l-8 border-blue-600 shadow-sm">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase mb-3"><Video size={14} /> Aula Ao Vivo</div>
              <h4 className="font-black text-slate-900 italic uppercase leading-tight mb-4">Mentoria PRO</h4>
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <div className="flex items-center gap-1"><Clock size={14} /> 20:00</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}