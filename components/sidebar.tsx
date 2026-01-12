"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { 
  X, Menu, GraduationCap, Calendar, ShoppingBag, 
  LogOut, LayoutDashboard, Award, Trophy 
} from "lucide-react"

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [perfil, setPerfil] = useState<any>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setPerfil(data)
      }
    }
    fetchUser()
  }, [supabase])

  const menuItems = [
    { name: "Meu Nível", path: "/ranking", icon: <Trophy size={20} /> },
    { name: "Academy", path: "/academy", icon: <GraduationCap size={20} /> },
    { name: "Agenda", path: "/agenda", icon: <Calendar size={20} /> },
    { name: "Loja", path: "/loja", icon: <ShoppingBag size={20} /> },
  ]

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="lg:hidden fixed top-5 left-5 z-[90] p-2 bg-slate-900 text-white rounded-lg">
        <Menu size={24} />
      </button>

      <div className={`fixed inset-y-0 left-0 z-[100] w-72 bg-[#0a0f1c] transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="flex flex-col h-full text-white">
          <div className="p-8 flex justify-between items-center">
            <h2 className="font-black italic text-2xl uppercase">MASC<span className="text-blue-600">PRO</span></h2>
            <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-500"><X size={24} /></button>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { router.push(item.path); setIsOpen(false); }}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${
                  pathname === item.path ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-white/5"
                }`}
              >
                {item.icon} <span className="text-sm uppercase tracking-widest">{item.name}</span>
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-white/5">
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="flex items-center gap-4 px-6 py-4 text-slate-500 hover:text-red-400 font-bold w-full transition-colors">
              <LogOut size={20} /> <span className="text-sm uppercase italic">Sair da Conta</span>
            </button>
          </div>
        </div>
      </div>
      {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/60 z-[95] lg:hidden" />}
    </>
  )
}