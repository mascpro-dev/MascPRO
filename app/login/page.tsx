"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Loader2, Mail, Lock, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push("/")
        router.refresh()
      } else if (view === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        })
        if (error) throw error
        setMessage({ type: 'success', text: "Conta criada! Verifique seu e-mail." })
      } else if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/update-password`,
        })
        if (error) throw error
        setMessage({ type: 'success', text: "E-mail de recuperação enviado!" })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || "Ocorreu um erro. Tente novamente." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm md:max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-slate-900 p-6 text-center">
          <h1 className="text-2xl font-bold text-white">Masc PRO</h1>
          <p className="text-slate-400 text-sm mt-1">
            {view === 'login' && "Sua jornada profissional continua aqui."}
            {view === 'register' && "Crie sua conta gratuita agora."}
            {view === 'forgot' && "Recupere seu acesso."}
          </p>
        </div>

        <div className="p-6">
          {message && (
            <div className={`mb-4 p-3 rounded text-sm text-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {view !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-slate-700">Senha</label>
                  {view === 'login' && (
                    <button type="button" onClick={() => setView('forgot')} className="text-xs text-blue-600 hover:underline">
                      Esqueceu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            <button disabled={loading} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center">
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                view === 'login' ? 'Entrar' : (view === 'register' ? 'Criar Conta' : 'Enviar Link')
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            {view === 'login' ? (
              <p className="text-sm text-gray-600">
                Novo por aqui? <button onClick={() => setView('register')} className="text-blue-600 font-bold hover:underline">Criar conta</button>
              </p>
            ) : (
              <button onClick={() => setView('login')} className="text-sm text-gray-600 hover:text-slate-900 flex items-center justify-center w-full gap-2">
                <ArrowLeft size={16} /> Voltar para o Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}