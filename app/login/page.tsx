"use client"
import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error("Erro ao entrar.")
    } else {
      router.replace('/') // <--- O SEGREDO: Replace não deixa voltar pro login
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-slate-900 p-4">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white p-8 rounded-3xl space-y-4">
        <h1 className="text-2xl font-black text-center text-slate-900 uppercase italic">Login MascPro</h1>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} 
          className="w-full p-4 bg-slate-100 rounded-xl" />
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} 
          className="w-full p-4 bg-slate-100 rounded-xl" />
        <button className="w-full p-4 bg-blue-600 text-white font-black rounded-xl uppercase hover:bg-blue-700">
          Entrar na Plataforma
        </button>
      </form>
    </div>
  )
}