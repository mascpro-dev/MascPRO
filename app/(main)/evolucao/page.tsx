import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Play, Info, ChevronRight, Zap } from "lucide-react";

export default async function EvolucaoPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: modules } = await supabase
    .from("Module")
    .select("*")
    .order("order", { ascending: true });

  // Simulando um módulo em destaque (geralmente o primeiro ou o último assistido)
  const featuredModule = modules?.[0];

  return (
    <div className="pb-20 bg-slate-950 min-h-screen">
      {/* --- 1. HERO SECTION (O Destaque Estilo Netflix) --- */}
      {featuredModule && (
        <div className="relative w-full h-[50vh] md:h-[60vh] flex items-end">
          {/* Fundo Gradiente (Simulando Imagem de Capa) */}
          <div className="absolute inset-0 bg-gradient-to-br from-masc-purple via-slate-900 to-black opacity-80" />
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" /> {/* Textura opcional */}
          
          {/* Degradê inferior para misturar com o resto da página */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

          <div className="relative z-10 p-6 md:p-12 w-full max-w-4xl">
            <span className="bg-masc-gold/20 text-masc-gold border border-masc-gold/30 px-3 py-1 rounded text-xs font-bold tracking-widest uppercase mb-4 inline-block">
              Módulo Destaque
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight tracking-tighter drop-shadow-lg">
              {featuredModule.title}
            </h1>
            <p className="text-slate-300 text-sm md:text-lg mb-6 max-w-xl line-clamp-3">
              Domine as técnicas fundamentais e comece a acumular seus primeiros pontos PRO.
              O conhecimento transforma sua carreira.
            </p>

            <div className="flex gap-4">
              <button className="bg-masc-lime text-black hover:bg-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all transform hover:scale-105">
                <Play fill="currentColor" size={20} />
                Assistir Agora
              </button>
              <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all">
                <Info size={20} />
                Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. TRILHAS DE CONTEÚDO (Carrossel Horizontal) --- */}
      <div className="space-y-12 -mt-10 relative z-20 px-6">
        
        {/* Trilha: Continuar Assistindo (Conceito de Retenção) */}
        <section>
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            Continuar Aprendendo <ChevronRight className="text-masc-gold" size={20} />
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
             {/* Card Exemplo de Progresso */}
             <div className="min-w-[280px] md:min-w-[320px] bg-slate-900 rounded-lg overflow-hidden border border-white/10 snap-start cursor-pointer hover:border-masc-blue/50 transition-colors group">
                <div className="h-40 bg-slate-800 relative group-hover:bg-slate-800/80 transition-colors flex items-center justify-center">
                    <Play size={40} className="text-white/50 group-hover:text-white group-hover:scale-110 transition-all" />
                    {/* Barra de Progresso na Capa */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
                        <div className="h-full bg-masc-gold w-[45%]" />
                    </div>
                </div>
                <div className="p-4">
                    <h3 className="text-slate-200 font-bold truncate">Aula 2: Colorimetria Avançada</h3>
                    <p className="text-xs text-masc-gold mt-1">Restam 15 min</p>
                </div>
             </div>
          </div>
        </section>

        {/* Trilha: Todos os Módulos */}
        <section>
          <h2 className="text-white font-bold text-xl mb-4">Jornada Completa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules?.map((modulo: any, index: number) => (
              <div 
                key={modulo.id} 
                className="group bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-masc-lime/30 rounded-lg overflow-hidden transition-all hover:-translate-y-1 duration-300"
              >
                {/* Thumbnail Gerada por CSS (Fica lindo sem imagens) */}
                <div className={`h-40 w-full relative p-4 flex flex-col justify-end items-start
                    ${index % 2 === 0 ? 'bg-gradient-to-t from-masc-teal/80 to-slate-900' : 'bg-gradient-to-t from-masc-purple/80 to-slate-900'}
                `}>
                    <span className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10 uppercase tracking-wider">
                        Módulo {index + 1}
                    </span>
                    <Play size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100 duration-300 drop-shadow-lg" fill="white" />
                </div>
                
                <div className="p-4">
                  <h3 className="text-white font-bold leading-tight group-hover:text-masc-lime transition-colors">
                    {modulo.title}
                  </h3>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-masc-lime animate-pulse" />
                        <span>Fundamental</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-masc-gold bg-masc-gold/10 px-2 py-1 rounded border border-masc-gold/20">
                        <Zap size={10} /> +50 PRO
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}