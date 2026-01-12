"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Loader2, Mail, Lock, User, ArrowRight, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  // Estados para controlar qual tela mostrar: 'login', 'register' ou 'forgot'
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const router = useRouter()
  const supabase = createClientComponentClient()

  // --- FUNÇÃO DE LOGIN ---
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push("/")
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: "Erro: Verifique seu e-mail e senha." })
    } finally {
      setLoading(false)
    }
  }

  // --- FUNÇÃO DE CADASTRO (CRIAR CONTA) ---
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      setMessage({ type: 'success', text: "Conta criada! Verifique seu e-mail para confirmar." })
    } catch (error: any) {
      setMessage({ type: 'error', text: "Erro ao criar conta. Tente outra senha." })
    } finally {
      setLoading(false)
    }
  }

  // --- FUNÇÃO DE RECUPERAR SENHA ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/update-password`,
      })
      if (error) throw error
      setMessage({ type: 'success', text: "Link de recuperação enviado para seu e-mail!" })
    } catch (error: any) {
      setMessage({ type: 'error', text: "Erro ao enviar e-mail de recuperação." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* CABEÇALHO DO CARD */}
        <div className="bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Masc PRO</h1>
          <p className="text-slate-400 text-sm">
            {view === 'login' && "Bem-vindo de volta! Acesse sua conta."}
            {view === 'register' && "Crie sua conta e comece agora."}
            {view === 'forgot' && "Recupere seu acesso."}
          </p>
        </div>

        <div className="p-8">
          {/* MENSAGEM DE ERRO/SUCESSO */}
          {message && (
            <div className={`mb-6 p-3 rounded-lg text-sm text-center ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {message.text}
            </div>
          )}

          {/* --- FORMULÁRIO DE LOGIN --- */}
          {view === 'login' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-700">Senha</label>
                  <button type="button" onClick={() => setView('forgot')} className="text-xs text-blue-600 hover:underline">
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <button disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Entrar"}
              </button>
            </form>
          )}

          {/* --- FORMULÁRIO DE CADASTRO --- */}
          {view === 'register' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Criar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Criar Conta Grátis"}
              </button>
            </form>
          )}

          {/* --- FORMULÁRIO DE RECUPERAÇÃO --- */}
          {view === 'forgot' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center mb-4">
                <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm text-gray-500">Digite seu e-mail e enviaremos um link para você redefinir sua senha.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">E-mail Cadastrado</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <button disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Enviar Link"}
              </button>
              <button type="button" onClick={() => setView('login')} className="w-full mt-2 text-sm text-gray-500 hover:text-slate-900 flex items-center justify-center gap-1">
                 <ArrowLeft size={14} /> Voltar para Login
              </button>
            </form>
          )}
        </div>

        {/* RODAPÉ DO CARD (Alternar entre Login e Cadastro) */}
        {view !== 'forgot' && (
          <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
            {view === 'login' ? (
              <p className="text-sm text-gray-600">
                Ainda não tem conta?{" "}
                <button onClick={() => setView('register')} className="text-blue-600 font-semibold hover:underline">
                  Cadastre-se
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Já tem cadastro?{" "}
                <button onClick={() => setView('login')} className="text-blue-600 font-semibold hover:underline">
                  Faça Login
                </button>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}