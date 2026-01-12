"use client"

import XPBar from "@/components/xp-bar"
import { Play, ShoppingBag, Calendar, ArrowRight, Star } from "lucide-react"
import Link from "next/link"

// --- DADOS FALSOS (SÓ PARA O DESIGN APARECER LINDO AGORA) ---
const cursos = [
  { id: 1, title: "Colorimetria Master", image: "https://placehold.co/600x400/1e293b/FFF?text=Colorimetria", progress: 75 },
  { id: 2, title: "Cortes Modernos", image: "https://placehold.co/600x400/334155/FFF?text=Cortes", progress: 30 },
  { id: 3, title: "Gestão de Salão", image: "https://placehold.co/600x400/475569/FFF?text=Gestão", progress: 0 },
  { id: 4, title: "Mechas Criativas", image: "https://placehold.co/600x400/0f172a/FFF?text=Mechas", progress: 10 },
]

const produtos = [
  { id: 1, title: "Kit Pós-Química", price: "R$ 189,90", image: "https://placehold.co/400x400/e2e8f0/1e293b?text=Shampoo" },
  { id: 2, title: "Máscara Gold", price: "R$ 97,00", image: "https://placehold.co/400x400/e2e8f0/1e293b?text=Máscara" },
  { id: 3, title: "Óleo Reparador", price: "R$ 45,90", image: "https://placehold.co/400x400/e2e8f0/1e293b?text=Óleo" },
  { id: 4, title: "Spray Fixador", price: "R$ 62,00", image: "https://placehold.co/400x400/e2e8f0/1e293b?text=Spray" },
]

// --- COMPONENTE: SEÇÃO NETFLIX (CARROSSEL) ---
const NetflixSection = ({ title, icon: Icon, children, link }: any) => (
  <div className="mb-10">
    <div className="flex items-center justify-between mb-4 px-1">
      <div className="flex items-center gap-2">
        <div className="bg-blue-600/10 p-2 rounded-lg">
          <Icon className="text-blue-600 w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      </div>
      {link && (
        <Link href={link} className="text-sm font-medium text-blue-600 flex items-center gap-1 hover:gap-2 transition-all">
          Ver tudo <ArrowRight size={14} />
        </Link>
      )}
    </div>
    
    {/* A MÁGICA DO SCROLL HORIZONTAL (NETFLIX) */}
    <div className="flex overflow-x-auto gap-4 pb-6 -mx-4 px-4 scroll-smooth no-scrollbar snap-x">
      {children}
    </div>
  </div>
)

export default function DashboardHome() {
  return (
    // AQUI ESTÁ A CORREÇÃO DOS ESPAÇOS: p-6 md:p-10
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* BARRA DE XP */}
      <XPBar />

      {/* --- SEÇÃO 1: CURSOS (ESTILO NETFLIX) --- */}
      <NetflixSection title="Continuar Estudando" icon={Play} link="/academy">
        {cursos.map((curso) => (
          <div key={curso.id} className="min-w-[260px] md:min-w-[300px] snap-start group cursor-pointer relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="aspect-video bg-slate-200 relative">
              <img src={curso.image} alt={curso.title} className="w-full h-full object-cover" />
              {/* Overlay Play Button */}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full border border-white/50">
                  <Play className="text-white fill-white w-6 h-6" />
                </div>
              </div>
              {/* Barra de Progresso no Card */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                <div className="h-full bg-blue-500" style={{ width: `${curso.progress}%` }}></div>
              </div>
            </div>
            <div className="bg-white p-4 border border-t-0 border-gray-100 rounded-b-xl">
              <h3 className="font-bold text-slate-800 truncate">{curso.title}</h3>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Play size={10} /> {curso.progress}% assistido
              </p>
            </div>
          </div>
        ))}
      </NetflixSection>

      {/* --- SEÇÃO 2: DESTAQUES DA LOJA (ESTILO NETFLIX) --- */}
      <NetflixSection title="Ofertas da Semana" icon={ShoppingBag} link="/loja">
        {produtos.map((prod) => (
          <div key={prod.id} className="min-w-[180px] md:min-w-[220px] snap-start group cursor-pointer bg-white rounded-xl border border-gray-100 p-3 hover:border-blue-200 transition-all hover:shadow-lg">
            <div className="aspect-square bg-gray-50 rounded-lg mb-3 relative overflow-hidden">
               <img src={prod.image} alt={prod.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
               <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                 NOVO
               </div>
            </div>
            <h3 className="font-medium text-slate-900 text-sm truncate">{prod.title}</h3>
            <div className="flex items-center justify-between mt-2">
              <span className="font-bold text-blue-600">{prod.price}</span>
              <button className="bg-slate-900 text-white p-1.5 rounded-md hover:bg-blue-600 transition">
                <ShoppingBag size={14} />
              </button>
            </div>
          </div>
        ))}
      </NetflixSection>

      {/* --- SEÇÃO 3: AGENDA (VISUAL CARD LARGO) --- */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-sm tracking-wider uppercase">
              <Calendar size={16} /> Próximo Evento
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Workshop: Segredos do Loiro</h2>
            <p className="text-slate-300 max-w-lg">Junte-se a nós para uma imersão completa em técnicas de descoloração e matização.</p>
          </div>
          <div className="flex flex-col items-center bg-white/10 backdrop-blur-md rounded-xl p-4 min-w-[100px] border border-white/10">
            <span className="text-xs text-slate-300 uppercase">AGOSTO</span>
            <span className="text-3xl font-bold text-white">24</span>
            <span className="text-xs text-slate-300">Sábado</span>
          </div>
        </div>
      </div>

    </div>
  )
}