"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  video_id?: string;
  video_url?: string;
  sequence_order?: number;
  course_code?: string;
}

export default function EvolucaoPlayerPage({ params }: { params: { code: string } }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchTime, setWatchTime] = useState(0); // em segundos
  const [showToast, setShowToast] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClientComponentClient();
  const watchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Buscar userId
  useEffect(() => {
    async function getUserId() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      }
    }
    getUserId();
  }, [supabase]);

  // Buscar lessons do módulo
  useEffect(() => {
    async function getLessons() {
      try {
        // Buscar lessons onde course_code = code, ordenado por sequence_order
        const { data, error } = await supabase
          .from("lessons")
          .select("*")
          .eq("course_code", params.code)
          .order("sequence_order", { ascending: true });

        if (error) {
          console.error("Erro ao buscar lessons:", error);
        } else if (data && data.length > 0) {
          setLessons(data);
          setCurrentLesson(data[0]); // Primeira aula por padrão
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    }
    getLessons();
  }, [supabase, params.code]);

  // Extrair ID do YouTube da URL ou usar video_id direto
  const getYouTubeId = (lesson: Lesson | null): string => {
    if (!lesson) return "";
    
    // Se tiver video_id direto, usa ele
    if (lesson.video_id) {
      return lesson.video_id;
    }
    
    // Caso contrário, tenta extrair da video_url
    if (lesson.video_url) {
      const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = lesson.video_url.match(regExp);
      if (match && match[1]) {
        return match[1];
      }
      // Se já for um ID de 11 caracteres
      if (lesson.video_url.length === 11) {
        return lesson.video_url;
      }
    }
    
    return "";
  };

  // Construir URL do YouTube com parâmetros de limpeza
  const getYouTubeEmbedUrl = (videoId: string): string => {
    if (!videoId) return "";
    return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&controls=1&showinfo=0&fs=0`;
  };

  // Função para recompensar o usuário
  const rewardUser = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase.rpc("reward_watch_time", {
        user_id: userId,
      });

      if (!error) {
        // Mostrar Toast Dourado
        setShowToast(true);
        
        // Esconder toast após 5 segundos
        setTimeout(() => {
          setShowToast(false);
        }, 5000);

        // Zerar contador para começar o próximo ciclo
        setWatchTime(0);
      } else {
        console.error("Erro ao recompensar:", error);
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  // Sistema de Recompensa - O Relógio
  useEffect(() => {
    if (!userId) return;

    // Contador que roda enquanto a página está aberta
    watchIntervalRef.current = setInterval(() => {
      setWatchTime((prev) => {
        const newTime = prev + 1;
        
        // A cada 15 minutos (900 segundos), chama a RPC
        if (newTime > 0 && newTime % 900 === 0) {
          rewardUser();
        }
        
        return newTime;
      });
    }, 1000);

    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Mudar de aula
  const handleLessonChange = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setWatchTime(0); // Resetar tempo ao mudar de aula
  };

  const currentVideoId = getYouTubeId(currentLesson);
  const embedUrl = getYouTubeEmbedUrl(currentVideoId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/evolucao")}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-semibold">Voltar</span>
        </button>
        
        <div className="bg-[#C9A66B]/20 border border-[#C9A66B]/40 rounded-lg px-4 py-2">
          <p className="text-[#C9A66B] text-sm font-bold uppercase tracking-wider">
            VALENDO 50 PRO
          </p>
        </div>
      </div>

      {/* Área Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
        {/* Player de Vídeo - Esquerda (70%) */}
        <div className="space-y-4">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10">
            {currentVideoId ? (
              <>
                <iframe
                  ref={iframeRef}
                  width="100%"
                  height="100%"
                  src={embedUrl}
                  title={currentLesson?.title || "Aula MASC PRO"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0"
                />
                
                {/* Máscara de Proteção - Bloqueia cliques no título/logomarca do YouTube */}
                <div 
                  className="absolute inset-x-0 top-0 h-16 z-10 pointer-events-auto"
                  style={{ 
                    background: "transparent"
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-white/60">
                <p>Carregando vídeo...</p>
              </div>
            )}
          </div>

          {/* Informações da Aula */}
          {currentLesson && (
            <div className="bg-black border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-2">
                {currentLesson.title}
              </h2>
              <p className="text-white/60 text-sm">
                Continue assistindo para ganhar PROs!
              </p>
            </div>
          )}
        </div>

        {/* Lista de Aulas - Direita (30%) */}
        <div className="bg-black border border-white/10 rounded-xl p-6 h-fit">
          <h3 className="text-white font-bold text-lg mb-4">NESTE MÓDULO</h3>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : lessons.length === 0 ? (
            <p className="text-white/60 text-sm">Nenhuma aula disponível.</p>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, index) => {
                const isCurrent = currentLesson?.id === lesson.id;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => handleLessonChange(lesson)}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      isCurrent
                        ? "bg-[#C9A66B]/20 border-2 border-[#C9A66B] text-white"
                        : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-[#C9A66B]/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isCurrent ? "bg-[#C9A66B] text-black" : "bg-white/10 text-white/60"
                      }`}>
                        {isCurrent ? (
                          <Play size={14} fill="currentColor" />
                        ) : (
                          <span className="text-xs font-bold">{(index + 1).toString().padStart(2, '0')}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold mb-1 ${
                          isCurrent ? "text-white" : "text-white/90"
                        }`}>
                          {lesson.title}
                        </p>
                        {isCurrent && (
                          <p className="text-[#C9A66B] text-xs font-bold uppercase">
                            Assistindo agora
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Toast/Notificação Dourada */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-gradient-to-r from-[#C9A66B] to-[#D4B87A] text-black rounded-xl px-6 py-4 shadow-2xl border-2 border-[#C9A66B] flex items-center gap-3 min-w-[300px]">
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-bold text-sm">+50 PRO creditados!</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="ml-auto text-black/60 hover:text-black text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
