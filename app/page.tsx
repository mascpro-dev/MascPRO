"use client"

import XPBar from "@/components/xp-bar"
import { Play, ShoppingBag, Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"

// Dados para o visual Netflix
const cursos = [
  { id: 1, title: "Colorimetria Master", image: "https://placehold.co/600x400/1e293b/FFF?text=Colorimetria", progress: 75 },
  { id: 2, title: "Cortes Modernos", image: "https://placehold.co/600x400/334155/FFF?text=Cortes", progress: 30 },
  { id: 3, title: "Gestão de Salão", image: "https://placehold.co/600x400/475569/FFF?text=Gestão", progress: 0 },
]

export default function DashboardHome() {
  return (
    // Padding ajustado (p-6 md:p-10) para não colar nas bordas
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      
      <XPBar />

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Continuar Assistindo</h2>
          <Link href="/academy" className="text-blue-600 text-sm font-semibold flex items-center gap-1">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>
        
        {/* Carrossel Estilo Netflix */}
        <div className="flex overflow-x-auto gap-6 pb-4 -mx-4 px-4 no-scrollbar snap-x">
          {cursos.map((curso) => (
            <div key={curso.id} className="min-w-[300px] snap-start group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all">
              <div className="aspect-video relative">
                <img src={curso.image} alt={curso.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center">
                  <Play className="text-white fill-white opacity-0 group-hover:opacity-100 transition h-12 w-12" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-700">
                  <div className="h-full bg-blue-500" style={{ width: `${curso.progress}%` }}></div>
                </div>
              </div>
              <div className="bg-white p-4">
                <h3 className="font-bold text-slate-800">{curso.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Atalhos Rápidos com margens amplas */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        <Link href="/loja" className="bg-slate-900 text-white p-8 rounded-2xl flex items-center justify-between group hover:bg-blue-600 transition-all">
          <div>
            <h3 className="text-xl font-bold">Loja Oficial</h3>
            <p className="text-slate-400 group-hover:text-white/80">Produtos Profissionais</p>
          </div>
          <ShoppingBag size={32} />
        </Link>
        <Link href="/agenda" className="bg-white border p-8 rounded-2xl flex items-center justify-between group hover:border-blue-600 transition-all">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Minha Agenda</h3>
            <p className="text-slate-500">Próximos eventos</p>
          </div>
          <Calendar size={32} className="text-slate-400 group-hover:text-blue-600" />
        </Link>
      </section>
    </div>
  )
}