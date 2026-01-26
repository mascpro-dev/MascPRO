"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import { ArrowLeft, Play, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AulaPlayerPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  const courseCode = params?.code as string;

  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Timer
  const [secondsWatched, setSecondsWatched] = useState(0);

  useEffect(() => {
    async function fetchLessons() {
      try {
        setLoading(true);
        // Busca aulas (insensível a maiúsculas/minúsculas)
        const { data } = await supabase
          .from("lessons")
          .select("*")
          .ilike("course_code", courseCode) 
          .order("sequence_order", { ascending: true });

        if (data && data.length > 0) {
          setLessons(data);
          setCurrentLesson(data[0]);
        }
      } catch (err) {
        console.error("Erro:", err);
      } finally {
        setLoading(false);
      }
    }

    if (courseCode) fetchLessons();
  }, [courseCode, supabase]);

  // Timer de Recompensa
  useEffect(() => {
    if (!currentLesson) return;
    const interval = setInterval(() => {
      setSecondsWatched((prev) => {
        const novo = prev + 1;
        if (novo > 0 && novo % 900 === 0) pagarRecompensa(); // 15 min
        return novo;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentLesson]);

  async function pagarRecompensa() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.rpc('reward_watch_time', { user_id: user.id });
      console.log("💰 +50 PRO Pagos!");
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">
      <Loader2 className="w-8 h-8 animate-spin text-[#C9A66B]" />
    </div>
  );

  if (!currentLesson) return (
    <div className="min-h-screen bg-[#0A0A0A] p-10 text-white text-center">
        <h2 className="text-xl font-bold mb-2">Nenhuma aula encontrada.</h2>
        <Link href="/evolucao" className="text-[#C9A66B] hover:underline">Voltar</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8">
      
      {/* Topo */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-sm tracking-wide">VOLTAR</span>
        </Link>
        <div className="bg-[#C9A66B]/10 text-[#C9A66B] border border-[#C9A66B]/30 px-4 py-1.5 rounded text-xs font-bold tracking-widest animate-pulse">
          VALENDO 50 PRO
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ÁREA DO PLAYER */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-[#222] shadow-2xl shadow-black group">
            
            {/* --- MÁSCARAS INTELIGENTES --- */}
            
            {/* 1. Bloqueia Título no Topo (Anti-clique externo) */}
            <div className="absolute inset-x-0 top-0 h-16 z-20 bg-transparent" />
            
            {/* 2. Bloqueia Logo YT no canto INFERIOR ESQUERDO apenas */}
            <div className="absolute left-0 bottom-10 w-24 h-14 z-20 bg-transparent" />
            
            {/* OBS: O Canto INFERIOR DIREITO fica livre para o botão Fullscreen */}

            {/* IFRAME */}
            <iframe 
              // fs=1: Habilita botão Fullscreen
              // rel=0: Mostra apenas vídeos do SEU canal no final
              // modestbranding=1: Remove logo grande
              src={`https://www.youtube.com/embed/${currentLesson.video_id}?autoplay=1&mute=1&modestbranding=1&rel=0&controls=1&showinfo=0&fs=1&iv_load_policy=3&disablekb=1`}
              title="Player MASC PRO"
              className="w-full h-full object-cover"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen // Habilita a propriedade nativa do navegador
            />
          </div>

          <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold text-white">{currentLesson.title}</h1>
                <p className="text-gray-500 text-sm mt-1">
                Tempo estudado: <span className="text-[#C9A66B] font-bold">{Math.floor(secondsWatched / 60)} min</span>
                </p>
            </div>
          </div>
        </div>

        {/* LISTA LATERAL */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5 h-fit">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">
            Neste Módulo
          </h3>
          <div className="space-y-3">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === currentLesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setCurrentLesson(lesson);
                    setSecondsWatched(0);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all border ${
                    isActive 
                      ? "bg-[#C9A66B]/10 border-[#C9A66B]/40" 
                      : "bg-transparent border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isActive ? "bg-[#C9A66B] text-black" : "bg-[#222] text-gray-500"
                  }`}>
                    {isActive ? <Play size={10} fill="currentColor" /> : index + 1}
                  </div>
                  <p className={`text-sm font-bold leading-tight ${isActive ? "text-white" : "text-gray-400"}`}>
                    {lesson.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
