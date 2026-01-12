"use client"

import { Play, Star, Clock, CheckCircle2 } from "lucide-react"

const cursosAcademy = [
  { id: 1, title: "Colorimetria Avançada", aulas: 12, duracao: "4h", image: "https://placehold.co/600x400/1e293b/FFF?text=Master+Color" },
  { id: 2, title: "Técnicas de Mechas", aulas: 8, duracao: "3h", image: "https://placehold.co/600x400/334155/FFF?text=Mechas+Pro" },
  { id: 3, title: "Corte Masculino", aulas: 15, duracao: "6h", image: "https://placehold.co/600x400/475569/FFF?text=Barber+Expert" },
  { id: 4, title: "Penteados de Gala", aulas: 6, duracao: "2h", image: "https://placehold.co/600x400/0f172a/FFF?text=Penteados" },
]

export default function AcademyPage() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Masc PRO Academy</h1>
        <p className="text-slate-500 mt-2">Sua jornada de especialização profissional.</p>
      </div>

      {/* Carrossel de Cursos Disponíveis */}
      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Star className="text-yellow-500 fill-yellow-500" size={20} />
          Cursos em Destaque
        </h2>
        
        <div className="flex overflow-x-auto gap-6 pb-6 -mx-4 px-4 no-scrollbar snap-x">
          {cursosAcademy.map((curso) => (
            <div key={curso.id} className="min-w-[280px] md:min-w-[340px] snap-start group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-500 cursor-pointer">
              <div className="aspect-video relative overflow-hidden">
                <img src={curso.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt={curso.title} />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <div className="bg-white p-3 rounded-full shadow-xl translate-y-4 group-hover:translate-y-0 transition duration-500">
                    <Play className="text-slate-900 fill-slate-900 h-6 w-6" />
                  </div>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-slate-800 text-lg mb-3 line-clamp-1">{curso.title}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Play size={14} /> {curso.aulas} aulas</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {curso.duracao}</span>
                </div>
                <button className="w-full mt-4 bg-slate-50 py-2 rounded-lg text-sm font-bold text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition">
                  Começar agora
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sessão de Concluídos (Simulação) */}
      <section className="bg-slate-900 rounded-3xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-green-500/20 p-4 rounded-2xl border border-green-500/30 text-green-400">
                <CheckCircle2 size={32} />
            </div>
            <div>
                <h3 className="text-xl font-bold">Certificados Prontos</h3>
                <p className="text-slate-400 text-sm">Você já possui 3 certificações Masc PRO.</p>
            </div>
          </div>
          <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-blue-400 hover:text-white transition">
            Baixar Certificados
          </button>
        </div>
      </section>
    </div>
  )
}