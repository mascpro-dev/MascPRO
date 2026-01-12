"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Loader2, Scissors } from "lucide-react"
import { toast } from "react-hot-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error("Erro ao entrar. Verifique seus dados.")
      } else {
        toast.success("Login realizado com sucesso!")
        // AQUI ESTÁ A CORREÇÃO:
        // 'replace' substitui a tela atual, impedindo o "voltar" para o login
        router.replace('/') 
        router.refresh()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl mb-6 shadow-lg shadow-blue-600/30">
            <Scissors size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">
            Masc<span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Professional Education</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 ml-4">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border-0 rounded-2xl p-4 text-slate-900 font-bold focus:ring-2 focus:ring-blue-600 transition-all outline-none"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 ml-4">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border-0 rounded-2xl p-4 text-slate-900 font-bold focus:ring-2 focus:ring-blue-600 transition-all outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black uppercase italic tracking-widest py-5 rounded-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Acessar Plataforma"}
          </button>
        </form>
      </div>
    </div>
  )
}