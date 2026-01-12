"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Play, ShoppingBag, Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"
import XPBar from "@/components/xp-bar"

// DADOS PARA O VISUAL NETFLIX
const cursosDestaque = [
  { id: 1, title: "Colorimetria Master", image: "https://placehold.co/600x400/1e293b/FFF?text=Colorimetria", progress: 75 },
  { id: 2, title: "Cortes Modernos", image: "https://placehold.co/600x400/334155/FFF?text=Cortes", progress: 30 },
  { id: 3, title: "Gestão de Salão", image: "https://placehold.co/600x400/475569/FFF?text=Gestão", progress: 0 },
]

export default function NivelPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* 1. CABEÇALHO COM BOTÃO VOLTAR */}
      <div className="flex items-center gap-4 mb-4 pt-2">
        <button 
          onClick={() => router.back()} 
          className="p-2.5 hover:bg-white rounded-full border shadow-sm bg-white text-slate-600 transition-all active:scale-90"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-none">Painel de Nível</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Visão Geral do Aluno</p>
        </div>
      </div>

      {/* 2. BARRA DE XP DINÂMICA */}
      <XPBar />

      {/* 3. SEÇÃO CONTINUAR ASSISTINDO (NETFLIX) */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Play size={18} className="text-blue-600 fill-blue-600" />
            Continuar Assistindo
          </h2>
          <Link href="/academy" className="text-sm font-bold text-blue-600 hover:underline">
            Ver Academy
          </Link>
        </div>

        <div className="flex overflow-x-auto gap-6 pb-6 -mx-4 px-4 no-scrollbar snap-x">
          {cursosDestaque.map((curso) => (
            <div key={curso.id} className="min-w-[280px] md:min-w-[320px] snap-start group cursor-pointer relative rounded-2xl overflow-hidden shadow-sm border border-white hover:shadow-xl transition-all duration-500">
              <div className="aspect-video relative">
                <img src={curso.image} alt={curso.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                   <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/40">
                      <Play className="text-white fill-white w-6 h-6" />
                   </div>
                </div>
                {/* Barra de progresso visual */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/50">
                  <div className="h-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" style={{ width: `${curso.progress}%` }}></div>
                </div>
              </div>
              <div className="bg-white p-4">
                <h3 className="font-bold text-slate-800 truncate text-sm">{curso.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. ATALHOS RÁPIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Link href="/loja" className="flex items-center justify-between p-6 bg-slate-900 rounded-2xl group hover:bg-blue-600 transition-all duration-300 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-xl group-hover:bg-white/20">
              <ShoppingBag className="text-white" size={24} />
            </div>
            <span className="text-white font-bold">Ir para a Loja</span>
          </div>
          <ArrowRight className="text-white/40 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link href="/agenda" className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-2xl group hover:border-blue-600 transition-all duration-300 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 p-3 rounded-xl group-hover:bg-blue-50">
              <Calendar className="text-slate-600 group-hover:text-blue-600" size={24} />
            </div>
            <span className="text-slate-800 font-bold">Ver Minha Agenda</span>
          </div>
          <ArrowRight className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

    </div>
  )
}