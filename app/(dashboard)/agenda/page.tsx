"use client"
import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "react-hot-toast"
import XPBar from "@/components/xp-bar"

export default function AgendaPage() {
  const supabase = createClientComponentClient()
  const [nome, setNome] = useState("")
  const [data, setData] = useState("")

  const agendar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return toast.error("Faça login novamente.")

    const { error } = await supabase.from('agendamentos').insert([
      { cliente_nome: nome, data_hora: data, user_id: user.id }
    ])

    if (error) {
      console.error(error)
      toast.error("Erro no banco de dados (401/403). Verifique o Passo 1.")
    } else {
      toast.success("Agendado e Sincronizado!")
      setNome("")
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <XPBar />
      <div className="bg-white p-8 rounded-[40px] shadow-lg">
        <h2 className="text-2xl font-black uppercase italic mb-6">Novo Agendamento</h2>
        <div className="space-y-4">
          <input placeholder="Nome do Cliente" value={nome} onChange={e => setNome(e.target.value)} 
            className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
          <input type="datetime-local" value={data} onChange={e => setData(e.target.value)} 
            className="w-full p-4 bg-slate-50 rounded-2xl font-bold" />
          <button onClick={agendar} className="w-full p-4 bg-slate-900 text-white font-black rounded-2xl uppercase">
            Confirmar Agenda
          </button>
        </div>
      </div>
    </div>
  )
}