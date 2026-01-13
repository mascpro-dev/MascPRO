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

  useEffect(() => {
    const channel = supabase
      .channel('xp-updates')
      .on('postgres_changes', { event: 'UPDATE', table: 'profiles' }, (payload: any) => {
        const novoXP = payload.new.xp
        const antigoXP = payload.old.xp
        if (novoXP > antigoXP) {
          setXpAmount(novoXP - antigoXP)
          setShowXP(true)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const handleSignOut = async () => {
    // CORREÇÃO DO ERRO 'signOut': Adicionamos o .auth
    await supabase.auth.signOut() 
    router.refresh()
    router.push("/login")
  }

  const navItems = [
    { href: "/", label: "Meu Nível", icon: LayoutDashboard },
    { href: "/academy", label: "Academy", icon: GraduationCap },
    { href: "/agenda", label: "Agenda", icon: Calendar },
    { href: "/loja", label: "Loja", icon: ShoppingBag },
  ]

  // O RETURN AGORA ESTÁ NO LUGAR CERTO (DENTRO DA FUNÇÃO)
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* MENU MOBILE */}
      <div className="md:hidden bg-slate-900/95 backdrop-blur-md text-white p-4 flex justify-between items-center fixed top-0 w-full z-[100] border-b border-white/10">
        <span className="font-bold text-xl tracking-tighter italic">MASC<span className="text-blue-500">PRO</span></span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-white/10 rounded-lg">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside className={`fixed inset-y-0 left-0 z-[110] w-72 bg-slate-900 text-slate-300 transform transition-transform duration-500 md:translate-x-0 md:static ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col border-r border-white/5">
          <nav className="space-y-2 flex-grow">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-4 py-4 rounded-xl text-sm font-bold ${pathname === item.href ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
                <item.icon size={22} />
                {item.label}
              </Link>
            ))}
          </nav>
          <button onClick={handleSignOut} className="flex items-center gap-4 px-4 py-4 text-sm font-bold text-slate-500 hover:text-red-400 border-t border-white/5">
            <LogOut size={22} /> Sair da Conta
          </button>
        </div>
      </aside>

      <main className="flex-1 pt-24 md:pt-0 h-screen overflow-y-auto bg-slate-50 relative">
        {children}
        <XPToast amount={xpAmount} show={showXP} onClose={() => setShowXP(false)} />
      </main>
    </div>
  )
}