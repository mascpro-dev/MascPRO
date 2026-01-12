"use client"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Menu, X, Trophy, GraduationCap, Calendar, ShoppingBag, LogOut } from "lucide-react"

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClientComponentClient()

  const items = [
    { name: "Meu Nível", path: "/ranking", icon: <Trophy size={20} /> },
    { name: "Academy", path: "/academy", icon: <GraduationCap size={20} /> },
    { name: "Agenda", path: "/agenda", icon: <Calendar size={20} /> },
    { name: "Loja", path: "/loja", icon: <ShoppingBag size={20} /> },
  ]

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg">
        <Menu />
      </button>

      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0a0f1c] text-white transition-transform ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="p-8 flex justify-between">
          <h1 className="font-black italic text-2xl">MASC<span className="text-blue-600">PRO</span></h1>
          <button onClick={() => setIsOpen(false)} className="lg:hidden"><X /></button>
        </div>
        
        <nav className="px-4 space-y-2">
          {items.map((item) => (
            <button key={item.path} 
              onClick={() => { router.push(item.path); setIsOpen(false); }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl font-bold ${pathname === item.path ? "bg-blue-600" : "hover:bg-white/5"}`}>
              {item.icon} <span className="uppercase text-sm">{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-8 left-0 w-full px-4">
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); }} 
            className="flex items-center gap-4 px-6 py-4 text-slate-400 hover:text-red-400 font-bold w-full">
            <LogOut size={20} /> SAIR DA CONTA
          </button>
        </div>
      </div>
      
      {isOpen && <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/80 z-40 lg:hidden" />}
    </>
  )
}