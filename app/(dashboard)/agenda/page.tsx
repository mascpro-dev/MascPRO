"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  Loader2,
  Video
} from "lucide-react"
import XPBar from "@/components/xp-bar"
import { toast } from "react-hot-toast"

export default function AgendaPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setPerfil(data)
      setLoading(false)
    }
    checkUser()
  }, [supabase, router])

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-2 italic">Performance & Tempo</p>
            <h1 className="text-5xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">
              Minha <span className="text-slate-300">Agenda</span>
            </h1>
          </div>
          <button 
            onClick={() => toast.success("Módulo de agendamento em breve!")}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase italic tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
          >
            <Plus size={20} /> Novo Agendamento
          </button>
        </div>

        {/* BARRA DE XP */}
        <XPBar />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CALENDÁRIO VISUAL (ESTILIZADO) */}
          <div className="lg:col-span-2 bg-white rounded-[40px] p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase italic">Janeiro 2026</h2>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-50 rounded-lg"><ChevronLeft size={20} /></button>
                <button className="p-2 hover:bg-slate-50 rounded-lg"><ChevronRight size={20} /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {/* Renderização simplificada de dias */}
              {Array.from({ length: 31 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-bold transition-all cursor-pointer
                    ${i + 1 === 12 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50 text-slate-600'}
                  `}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* PRÓXIMOS EVENTOS (CARDS) */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 uppercase italic">Próximos Compromissos</h3>
            
            {/* EVENTO ACADEMY */}
            <div className="bg-white p-6 rounded-[32px] border-l-8 border-blue-600 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase mb-3">
                <Video size={14} /> Aula Ao Vivo
              </div>
              <h4 className="font-black text-slate-900 italic uppercase leading-tight mb-4">Masterclass: Técnicas de Barboterapia PRO</h4>
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <div className="flex items-center gap-1"><Clock size={14} /> 20:00</div>
                <div className="bg-slate-100 px-3 py-1 rounded-full">+100 XP</div>
              </div>
            </div>

            {/* EVENTO ATENDIMENTO */}
            <div className="bg-white p-6 rounded-[32px] border-l-8 border-slate-900 shadow-sm hover:shadow-md transition-all opacity-60">
              <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase mb-3">
                <User size={14} /> Atendimento Cliente
              </div>
              <h4 className="font-black text-slate-900 italic uppercase leading-tight mb-4">Corte & Barba - Cliente VIP 01</h4>
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <div className="flex items-center gap-1"><Clock size={14} /> 14:30</div>
                <div className="text-slate-300">Concluído</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}