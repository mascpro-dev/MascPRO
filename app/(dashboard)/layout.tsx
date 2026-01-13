"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, LayoutDashboard, ShoppingBag } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSignOut = async () => {
    // Forçamos o funcionamento do signOut
    await (supabase.auth as any).signOut()
    router.refresh()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <aside className="w-64 p-6 border-r border-white/10 hidden md:block">
        <nav className="space-y-4">
          <button onClick={() => router.push("/")} className="text-slate-300 hover:text-white flex gap-2 w-full"><LayoutDashboard/> Home</button>
          <button onClick={() => router.push("/loja")} className="text-slate-300 hover:text-white flex gap-2 w-full"><ShoppingBag/> Loja</button>
          <button onClick={handleSignOut} className="text-red-400 flex gap-2 pt-10 border-t border-white/5 w-full"><LogOut/> Sair</button>
        </nav>
      </aside>
      <main className="flex-1 bg-white md:rounded-l-[32px] p-6">{children}</main>
    </div>
  )
}