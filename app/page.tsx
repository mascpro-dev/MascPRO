import XPBar from "@/components/xp-bar"
import { Calendar, ShoppingBag, GraduationCap } from "lucide-react"
import Link from "next/link"

export default function DashboardHome() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      
      {/* 1. BARRA DE XP (Gamificação) */}
      <XPBar />

      <h2 className="text-xl font-bold text-slate-800 mb-6 mt-8">Acesso Rápido</h2>

      {/* 2. BOTÕES DE ATALHO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card Academy */}
        <Link href="/academy" className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
          <div className="bg-purple-50 p-4 rounded-full group-hover:bg-purple-100 transition">
            <GraduationCap className="text-purple-600 h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Academy</h3>
            <p className="text-xs text-gray-500">Meus cursos e aulas</p>
          </div>
        </Link>

        {/* Card Agenda */}
        <Link href="/agenda" className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
          <div className="bg-blue-50 p-4 rounded-full group-hover:bg-blue-100 transition">
            <Calendar className="text-blue-600 h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Agenda</h3>
            <p className="text-xs text-gray-500">Próximos eventos</p>
          </div>
        </Link>

        {/* Card Loja */}
        <Link href="/loja" className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
          <div className="bg-emerald-50 p-4 rounded-full group-hover:bg-emerald-100 transition">
            <ShoppingBag className="text-emerald-600 h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Loja Oficial</h3>
            <p className="text-xs text-gray-500">Ofertas exclusivas</p>
          </div>
        </Link>

      </div>
    </div>
  )
}