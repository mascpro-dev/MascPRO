"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner"; // Se não tiver sonner, troque por alert normal

export default function AulaPlayerPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  
  // Pega o código da URL (ex: MOD_C1-BLONDE)
  const courseCode = params?.code as string;

  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Timer para Recompensa
  const [secondsWatched, setSecondsWatched] = useState(0);

  // 1. Busca as Aulas do Banco
  useEffect(() => {
    async function fetchLessons() {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_code", courseCode)
        .order("sequence_order", { ascending: true });

      if (data && data.length > 0) {
        setLessons(data);
        setCurrentLesson(data[0]); // Começa na aula 1
      }
      setLoading(false);
    }
    fetchLessons();
  }, [courseCode, supabase]);

  // 2. O Relógio de Dinheiro (Roda a cada 1 segundo)
  useEffect(() => {
    if (!currentLesson) return;

    const interval = setInterval(() => {
      setSecondsWatched((prev) => {
        const novoTempo = prev + 1;
        
        // A cada 15 minutos (900 segundos)
        if (novoTempo > 0 && novoTempo % 900 === 0) {
          pagarRecompensa();
        }
        return novoTempo;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentLesson]);

  async function pagarRecompensa() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.rpc('reward_watch_time', { user_id: user.id });
      alert("💰 Parabéns! Você ganhou +50 PRO por estudar 15min.");
    }
  }

  if (loading) return <div className="p-10 text-white">Carregando sala de aula...</div>;
  if (!currentLesson) return <div className="p-10 text-white">Nenhuma aula encontrada para este curso.</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8">
      
      {/* Header Player */}
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
        
        {/* ÁREA DO VÍDEO (70%) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-[#222] shadow-2xl shadow-black group">
            
            {/* MÁSCARA ANTI-CLIQUE (Impede sair pro YouTube) */}
            <div className="absolute inset-x-0 top-0 h-20 z-20 bg-transparent" />
            <div className="absolute inset-x-0 bottom-14 h-20 z-20 bg-transparent" /> {/* Bloqueia logo do YT embaixo */}

            {/* Iframe */}
            <iframe 
              src={`https://www.youtube.com/embed/${currentLesson.video_id}?autoplay=1&modestbranding=1&rel=0&controls=1&showinfo=0&fs=0&iv_load_policy=3&disablekb=1`}
              title="Player MASC PRO"
              className="w-full h-full object-cover"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">{currentLesson.title}</h1>
            <p className="text-gray-500 text-sm mt-1">
              Assistindo agora • {Math.floor(secondsWatched / 60)} minutos estudados nesta sessão.
            </p>
          </div>
        </div>

        {/* LISTA LATERAL (30%) */}
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
                    setSecondsWatched(0); // Reseta timer ao trocar aula
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
                  
                  <div>
                    <p className={`text-sm font-bold leading-tight ${isActive ? "text-white" : "text-gray-400"}`}>
                      {lesson.title}
                    </p>
                    {isActive && (
                      <span className="text-[10px] text-[#C9A66B] font-medium mt-1 block">
                        Reproduzindo...
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            
            {/* Aula Bloqueada Exemplo (Visual) */}
            <div className="flex items-center gap-3 p-3 opacity-50 cursor-not-allowed">
               <div className="w-6 h-6 rounded-full bg-[#222] flex items-center justify-center text-gray-600">
                  <Lock size={12} />
               </div>
               <p className="text-sm font-bold text-gray-600">Próximo Módulo (Em breve)</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
