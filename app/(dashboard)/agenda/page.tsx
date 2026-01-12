"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, User, Plus, X, Phone } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function AgendaPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Estados do formulário
  const [nome, setNome] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [servico, setServico] = useState("")
  const [dataHora, setDataHora] = useState("")

  const fetchAgendamentos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('agendamentos')
      .select('*')
      .order('horario_inicio', { ascending: true })
    if (data) setAgendamentos(data)
    setLoading(false)
  }

  useEffect(() => { fetchAgendamentos() }, [])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('agendamentos').insert([
      { 
        cliente_nome: nome, 
        whatsapp: whatsapp, 
        procedimento: servico, 
        horario_inicio: dataHora 
      }
    ])

    if (!error) {
      setIsModalOpen(false)
      setNome(""); setWhatsapp(""); setServico(""); setDataHora("")
      fetchAgendamentos()
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-screen">
      
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white rounded-full border shadow-sm bg-white">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Minha Agenda</h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
        >
          <Plus size={20} /> Novo
        </button>
      </div>

      {/* LISTA DE HORÁRIOS */}
      <div className="space-y-4">
        {agendamentos.map((item) => (
          <div key={item.id} className="flex gap-4 group animate-in fade-in slide-in-from-bottom-2">
            <div className="w-16 pt-3 text-right">
              <span className="text-sm font-black text-slate-400">
                {new Date(item.horario_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <div className="flex-1 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between hover:border-blue-200 transition">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{item.cliente_nome}</h3>
                  <p className="text-xs text-blue-600 font-bold uppercase">{item.procedimento}</p>
                </div>
              </div>
              {item.whatsapp && (
                <a href={`https://wa.me/${item.whatsapp}`} className="text-green-500 p-2 hover:bg-green-50 rounded-lg transition">
                  <Phone size={18} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-slate-900">Novo Horário</h2>
            <form onSubmit={handleSalvar} className="space-y-4">
              <input required placeholder="Nome do Cliente" className="w-full p-4 bg-slate-50 rounded-xl border-none" value={nome} onChange={e => setNome(e.target.value)} />
              <input placeholder="WhatsApp (somente números)" className="w-full p-4 bg-slate-50 rounded-xl border-none" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
              <input required placeholder="Procedimento (Ex: Corte + Barba)" className="w-full p-4 bg-slate-50 rounded-xl border-none" value={servico} onChange={e => setServico(e.target.value)} />
              <input required type="datetime-local" className="w-full p-4 bg-slate-50 rounded-xl border-none" value={dataHora} onChange={e => setDataHora(e.target.value)} />
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition">
                Confirmar Agendamento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}