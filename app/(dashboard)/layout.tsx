"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, LayoutDashboard, ShoppingBag, Calendar, GraduationCap, LogOut } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const navItems = [
    { href: "/", label: "Meu Nível", icon: LayoutDashboard },
    { href: "/academy", label: "Academy", icon: GraduationCap },
    { href: "/agenda", label: "Agenda", icon: Calendar },
    { href: "/loja", label: "Loja", icon: ShoppingBag },
  ]

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row font-sans">
      
      {/* MENU MOBILE - FIXO NO TOPO */}
      <div className="md:hidden bg-slate-900/95 backdrop-blur-md text-white p-4 flex justify-between items-center fixed top-0 w-full z-[100] border-b border-white/10">
        <span className="font-bold text-xl tracking-tighter italic">MASC<span className="text-blue-500">PRO</span></span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-white/10 rounded-lg">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* SIDEBAR - GAVETA NO CELULAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-[90] w-72 bg-slate-900 text-slate-300 transform transition-transform duration-500 ease-in-out md:translate-x-0 md:static md:h-screen
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 h-full flex flex-col border-r border-white/5">
          <div className="mb-12 md:block hidden">
            <h1 className="text-2xl font-black italic tracking-tighter text-white">MASC<span className="text-blue-500">PRO</span></h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mt-1">Professional Education</p>
          </div>

          <nav className="space-y-1.5 flex-grow">
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

      {/* CONTEÚDO PRINCIPAL - AJUSTE DE MARGEM (pt-20) */}
      <main className="flex-1 pt-20 md:pt-0 h-screen overflow-y-auto bg-slate-50 rounded-t-[32px] md:rounded-t-none md:rounded-l-[32px] transition-all duration-500">
        {/* Overlay para fechar menu mobile ao clicar fora */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
        )}
        
        <div className="min-h-full">
            {children}
        </div>
      </main>
    </div>
  )
}