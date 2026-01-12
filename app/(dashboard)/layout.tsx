"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { 
  X, 
  Menu, 
  GraduationCap, 
  Calendar, 
  ShoppingBag, 
  LogOut, 
  Trophy, 
  Zap, 
  Award, 
  CheckCircle2, 
  Heart, 
  ShieldCheck, 
  Crown,
  LayoutDashboard // Importação que estava faltando
} from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setPerfil(data)
      }
    }
    fetchUser()
  }, [supabase])

  // Lógica de Patentes Masc PRO
  const getPatente = (xp: number, tipo: string) => {
    const ehEmbaixadorNoInicio = tipo === 'embaixador' && xp < 30000;
    if (xp >= 200000) return { nome: "EDUCADOR", cor: "text-amber-400", icone: <Crown size={20} /> };
    if (xp >= 100000) return { nome: "MASTER", cor: "text-purple-400", icone: <Crown size={20} /> };
    if (xp >= 50000) return { nome: "EXPERT", cor: "text-red-500", icone: <ShieldCheck size={20} /> };
    if (ehEmbaixadorNoInicio || xp >= 10000) return { nome: "CERTIFICADO", cor: "text-blue-400", icone: <Award size={20} /> };
    return { nome: "MASC LOVER", cor: "text-pink-400", icone: <Heart size={20} /> };
  }

  const patente = getPatente(perfil?.xp || 0, perfil?.tipo_usuario)

  const menuItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={20} /> },
    { name: "Academy", path: "/academy", icon: <GraduationCap size={20} /> },
    { name: "Agenda", path: "/agenda", icon: <Calendar size={20} /> },
    { name: "Loja", path: "/loja", icon: <ShoppingBag size={20} /> },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Botão Mobile (Hambúrguer) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-slate-900 text-white rounded-xl shadow-xl"
        >
          <Menu size={24} />
        </button>
      )}

      {/* SIDEBAR - UNIFICADA 04 ABAS */}
      <aside className={`fixed inset-y-0 left-0 z-[100] w-[280px] bg-[#0f172a] transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static`}>
        <div className="flex flex-col h-full">
          
          {/* Logo Section */}
          <div className="p-6 flex items-center justify-between border-b border-white/5">
            <span className="text-white font-black italic text-xl uppercase tracking-tighter">
              MASC<span className="text-blue-500">PRO</span>
            </span>
            <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400">
              <X size={24} />
            </button>
          </div>

          {/* 01. ABA DE NÍVEL (Destaque na Lateral) */}
          <div 
            onClick={() => { router.push('/ranking'); setIsOpen(false); }}
            className="mx-4 mt-6 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-900 ${patente.cor}`}>
                {patente.icone}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Status PRO</p>
                <p className={`font-black italic text-sm uppercase leading-none ${patente.cor}`}>
                  {patente.nome}
                </p>
              </div>
            </div>
          </div>

          {/* 02, 03, 04... NAVEGAÇÃO PRINCIPAL */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => { router.push(item.path); setIsOpen(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all ${
                    isActive 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.icon}
                  <span className="text-sm uppercase tracking-tight">{item.name}</span>
                </button>
              )
            })}
          </nav>

          {/* Botão de Logout */}
          <div className="p-6 border-t border-white/5">
            <button 
              onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
              className="flex items-center gap-4 text-slate-500 hover:text-red-400 font-bold transition-colors w-full"
            >
              <LogOut size={20} />
              <span className="text-sm italic uppercase tracking-widest">Sair da Conta</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full relative">
        {children}
      </main>

      {/* Overlay Mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
        />
      )}
    </div>
  )
}