export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import VideoPlayer from "../../../../componentes/VideoPlayer"; 

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

  // Se não tiver link no banco, usa um padrão para não quebrar
  const videoUrl = lesson.video_url || "https://www.youtube.com/watch?v=LXb3EKWsInQ";

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
            {/* CORREÇÃO AQUI: Passamos videoUrl em vez de lessonId */}
            <VideoPlayer title={lesson.title} videoUrl={videoUrl} />
        </div>

        {/* Coluna Playlist (Estática por enquanto) */}
        <div className="bg-slate-950 border-l border-white/10 min-h-screen p-6 hidden lg:block">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Neste Módulo</h3>
            <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-[#C9A66B]/30 cursor-default">
                    <div className="text-[#C9A66B] font-bold text-sm">01</div>
                    <div>
                        <p className="text-white font-bold text-sm line-clamp-2">{lesson.title}</p>
                        <p className="text-[#A6CE44] text-xs mt-1 font-bold flex items-center gap-1">Assistindo agora</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}