"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, Play, CheckCircle, Lock, ListVideo, Clock } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

// Declaração global para o TypeScript entender a API do YouTube
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export default function PlayerPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const playerRef = useRef<any>(null); // Referência para o Player do YouTube

  useEffect(() => {
    async function loadContent() {
      const codeFromUrl = params?.code as string; 
      
      // 1. Dados do Curso
      const { data: courseData, error } = await supabase
        .from("courses")
        .select("*")
        .or(`code.eq.${codeFromUrl},slug.eq.${codeFromUrl}`)
        .single();

      if (error || !courseData) {
        setLoading(false);
        return;
      }
      setCourse(courseData);

      // 2. Lista de Aulas
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_code", courseData.code)
        .order("sequence_order", { ascending: true });

      // 3. Progresso do Usuário (Quais ele já viu?)
      const { data: progressData } = await supabase
        .from("lesson_progress")
        .select("lesson_id");

      const completedSet = new Set(progressData?.map((p: any) => p.lesson_id) || []);
      setCompletedLessons(completedSet);

      if (lessonsData && lessonsData.length > 0) {
        setLessons(lessonsData);
        
        // Abre na primeira não assistida (ou na primeira se tudo completo)
        const firstUnwatched = lessonsData.find((l: any) => !completedSet.has(l.id));
        setCurrentLesson(firstUnwatched || lessonsData[0]);
      }

      setLoading(false);
    }

    if (params?.code) loadContent();
  }, [params, supabase]);

  // Função chamada quando o vídeo termina
  const handleVideoEnd = async () => {
    if (!currentLesson) return;

    // 1. Marca como completo no visual
    const newCompleted = new Set(completedLessons);
    newCompleted.add(currentLesson.id);
    setCompletedLessons(newCompleted);

    // 2. Salva no Banco de Dados
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from("lesson_progress").upsert(
          { user_id: user.id, lesson_id: currentLesson.id },
          { onConflict: "user_id, lesson_id" }
        );
    }

    // 3. Tenta pular para a próxima aula automaticamente
    const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
    if (currentIndex < lessons.length - 1) {
        setCurrentLesson(lessons[currentIndex + 1]); 
    }
  };

  // Inicializa o Player do YouTube quando muda a aula
  useEffect(() => {
    if (!currentLesson?.video_id || !window.YT) return;

    if (playerRef.current) {
        playerRef.current.destroy();
    }

    playerRef.current = new window.YT.Player("youtube-player", {
        height: "100%",
        width: "100%",
        videoId: currentLesson.video_id,
        playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            showinfo: 0,
            iv_load_policy: 3,
            disablekb: 0,
            fs: 1
        },
        events: {
            onStateChange: (event: any) => {
                if (event.data === 0) {
                    handleVideoEnd();
                }
            }
        }
    });

  }, [currentLesson]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando conteúdo...</div>;

  if (!course) return <div className="min-h-screen bg-black text-white p-10">Curso não encontrado. <Link href="/evolucao" className="underline">Voltar</Link></div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden">
      {/* Script Necessário para API do YouTube */}
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />

      {/* HEADER */}
      <div className="h-16 border-b border-[#222] flex items-center px-6 justify-between bg-[#111] shrink-0">
          <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={20} /> <span className="text-sm font-bold uppercase hidden md:inline">Voltar</span>
          </Link>
          <div className="text-sm font-bold text-[#C9A66B] uppercase tracking-wider truncate mx-4">
              {course.title}
          </div>
          <div className="w-10"></div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          
          {/* ÁREA DO VÍDEO */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black">
              <div className="max-w-5xl mx-auto">
                {/* Container do Player */}
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-[#333] shadow-2xl mb-6 relative group">
                    {currentLesson?.video_id ? (
                        <div id="youtube-player" className="w-full h-full"></div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]">
                            <Play size={48} className="text-gray-700 mb-2" />
                            <p className="text-gray-500 text-sm">Aula sem vídeo cadastrado.</p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <h1 className="text-2xl font-bold text-white">
                            {currentLesson?.title || course.title}
                        </h1>
                        {/* Badge de Completado */}
                        {completedLessons.has(currentLesson?.id) && (
                            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/20 px-3 py-1 rounded-full border border-green-900">
                                <CheckCircle size={12} /> Aula Concluída
                            </span>
                        )}
                    </div>
                    
                    <p className="text-gray-400 leading-relaxed text-sm">
                        {currentLesson?.description || course.description}
                    </p>
                    
                    {/* Botão de Material da AULA (Google Drive) */}
                    {currentLesson?.material_url && (
                        <a href={currentLesson.material_url} target="_blank" className="inline-flex items-center gap-2 text-[#C9A66B] hover:text-white text-sm font-bold border border-[#C9A66B]/30 px-4 py-2 rounded-lg hover:bg-[#C9A66B]/10 transition-colors">
                            <Download size={16} /> Baixar Material da Aula
                        </a>
                    )}
                </div>
              </div>
          </div>

          {/* LISTA DE AULAS */}
          <div className="w-full md:w-80 bg-[#0a0a0a] border-l border-[#222] overflow-y-auto shrink-0">
              <div className="p-4 border-b border-[#222]">
                  <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2">
                      <ListVideo size={14} /> Conteúdo do Módulo
                  </h3>
              </div>
              
              <div className="flex flex-col">
                  {lessons.map((lesson, idx) => {
                      const isActive = currentLesson?.id === lesson.id;
                      const isCompleted = completedLessons.has(lesson.id);
                      const isUnlocked = idx === 0 || completedLessons.has(lessons[idx - 1].id);

                      return (
                          <button 
                            key={lesson.id}
                            disabled={!isUnlocked}
                            onClick={() => isUnlocked && setCurrentLesson(lesson)}
                            className={`p-4 text-left border-b border-[#1a1a1a] transition-colors flex gap-3 group relative
                                ${isActive ? "bg-[#161616] border-l-4 border-l-[#C9A66B]" : "border-l-4 border-l-transparent"}
                                ${!isUnlocked ? "opacity-50 cursor-not-allowed grayscale" : "hover:bg-[#111] cursor-pointer"}
                            `}
                          >
                              <div className="mt-1">
                                  {!isUnlocked ? (
                                      <Lock size={14} className="text-gray-600" />
                                  ) : isCompleted ? (
                                      <CheckCircle size={14} className="text-green-500" />
                                  ) : isActive ? (
                                      <Play size={14} className="text-[#C9A66B] fill-[#C9A66B]" /> 
                                  ) : (
                                      <span className="text-xs text-gray-600 font-mono">{String(idx + 1).padStart(2, "0")}</span>
                                  )}
                              </div>
                              
                              <div>
                                  <h4 className={`text-sm font-medium leading-tight mb-1 ${isActive ? "text-white" : "text-gray-400"} ${isUnlocked && "group-hover:text-gray-200"}`}>
                                      {lesson.title}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-600">
                                        {lesson.durations_minutos > 0 ? `${lesson.durations_minutos} min` : "Aula"}
                                    </span>
                                  </div>
                              </div>
                          </button>
                      );
                  })}
              </div>
          </div>

      </div>
    </div>
  );
}
