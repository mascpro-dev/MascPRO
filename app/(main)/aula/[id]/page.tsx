export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Play, Lock, Share2 } from "lucide-react";

// CORREÇÃO AQUI: Apenas 4 ".." para voltar para a raiz
import LessonButton from "../../../../componentes/LessonButton";

export default async function AulaPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });

  const { data: lesson } = await supabase
    .from("Module")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!lesson) {
    return <div className="p-10 text-white">Aula não encontrada.</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Navegação */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-30">
        <Link 
          href="/evolucao" 
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-wide"
        >
          <ArrowLeft size={18} /> Voltar
        </Link>
        <div className="flex items-center gap-2">
            <span className="text-[#C9A66B] font-bold text-xs uppercase tracking-widest border border-[#C9A66B]/30 px-3 py-1 rounded bg-[#C9A66B]/10">
                Valendo 50 PRO
            </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-8">
        
        {/* Coluna Vídeo */}
        <div className="col-span-2">
            <div className="relative w-full aspect-video bg-slate-900 border-b lg:border border-white/10 lg:rounded-b-2xl overflow-hidden group">
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[url('/grid-pattern.svg')] opacity-20"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <button className="w-20 h-20 bg-[#A6CE44] rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_30px_rgba(166,206,68,0.4)] z-20 group-hover:animate-pulse">
                        <Play fill="black" className="ml-1 text-black" size={32} />
                    </button>
                </div>
                <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/60 to-transparent">
                    <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
                        {lesson.title}
                    </h1>
                </div>
            </div>

            <div className="p-6 md:p-8 space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                    <LessonButton amount={50} />
                    <button className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/5">
                        <Share2 size={18} /> Compartilhar
                    </button>
                </div>
                <div className="prose prose-invert max-w-none">
                    <h3 className="text-xl font-bold text-white mb-2">Sobre esta aula</h3>
                    <p className="text-slate-400 leading-relaxed">
                        Conteúdo fundamental para o seu avanço no ranking MASC PRO.
                    </p>
                </div>
            </div>
        </div>

        {/* Coluna Playlist */}
        <div className="bg-slate-950 border-l border-white/10 min-h-screen p-6 hidden lg:block">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Neste Módulo</h3>
            <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-[#C9A66B]/30 cursor-default">
                    <div className="text-[#C9A66B] font-bold text-sm">01</div>
                    <div>
                        <p className="text-white font-bold text-sm line-clamp-2">{lesson.title}</p>
                        <p className="text-[#A6CE44] text-xs mt-1 font-bold flex items-center gap-1">Reproduzindo</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}