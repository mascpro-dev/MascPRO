"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Menu, X, LayoutDashboard, ShoppingBag, 
  Calendar, GraduationCap, LogOut 
} from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import XPToast from "@/components/xp-toast"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showXP, setShowXP] = useState(false)
  const [xpAmount, setXpAmount] = useState(0)
  
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()

  // --- LÓGICA DE GAMIFICAÇÃO EM TEMPO REAL ---
  useEffect(() => {
    const channel = supabase
      .channel('xp-updates')
      .on(
        'postgres_changes', 
        { event: 'UPDATE', table: 'profiles' }, 
        (payload: any) => { // <-- CORREÇÃO: Adicionado ': any' para resolver o erro de tipo
          const novoXP = payload.new.xp
          const antigoXP = payload.old.xp
          
          if (novoXP > antigoXP) {
            setXpAmount(novoXP - antigoXP)
            setShowXP(true)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // --- CORREÇÃO: signOut deve ser chamado dentro de supabase.auth ---
  const handleSignOut = async () => {
  await supabase.auth.signOut() // Adicione o .auth aqui
  router.push("/login")
  router.refresh()
}
  }

  const navItems = [
    { href: "/", label: "Meu Nível", icon: LayoutDashboard },
    { href: "/academy", label: "Academy", icon: GraduationCap },
    { href: "/agenda", label: "Agenda", icon: Calendar },
    { href: "/loja", label: "Loja", icon: ShoppingBag },
  ]

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* MENU MOBILE */}
      <div className="md:hidden bg-slate-900/95 backdrop-blur-md text-white p-4 flex justify-between items-center fixed top-0 w-full z-[100] border-b border-white/10">
        <span className="font-bold text-xl tracking-tighter italic">
          MASC<span className="text-blue-500">PRO</span>
        </span>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-[110] w-72 bg-slate-900 text-slate-300 transform transition-transform duration-500 ease-in-out md:translate-x-0 md:static md:h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 h-full flex flex-col border-r border-white/5">
          <div className="mb-12 md:block hidden">
            <h1 className="text-2xl font-black italic tracking-tighter text-white">
              MASC<span className="text-blue-500">PRO</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mt-1">
              Professional Education
            </p>
          </div>

          <nav className="space-y-2 flex-grow">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 px-4 py-4 rounded-xl text-sm font-bold transition-all duration-300
                    ${isActive 
                      ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]" 
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <button 
            onClick={handleSignOut} 
            className="flex items-center gap-4 px-4 py-4 text-sm font-bold text-slate-500 hover:text-red-400 transition-colors mt-auto border-t border-white/5"
          >
            <LogOut size={22} />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 pt-24 md:pt-0 h-screen overflow-y-auto bg-slate-50 rounded-t-[32px] md:rounded-t-none md:rounded-l-[32px] transition-all duration-500 relative">
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[105] md:hidden" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
        )}
        
        <div className="min-h-full pb-10">
            {children}
        </div>

        <XPToast 
          amount={xpAmount} 
          show={showXP} 
          onClose={() => setShowXP(false)} 
        />
      </main>
    </div>
  )
}