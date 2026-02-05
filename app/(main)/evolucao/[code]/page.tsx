"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams, useRouter } from "next/navigation"; 
import { ArrowLeft, Loader2, Play, CheckCircle, Lock, ListVideo, Trophy, Clock } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter(); 
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  const [videoStarted, setVideoStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [justEarned, setJustEarned] = useState(false);

  const playerRef = useRef<any>(null);

  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        const codeFromUrl = params?.code; 
        if (!codeFromUrl) return;

        const { data: courseData } = await supabase.from("courses").select("*").or(`code.eq.${codeFromUrl},slug.eq.${codeFromUrl}`).single();
        if (!courseData) throw new Error("Curso não encontrado.");
        setCourse(courseData);

        const { data: lessonsData } = await supabase.from("lessons").select("*").eq("course_code", courseData.code).order("sequence_order", { ascending: true });
        
        const { data: { session } } = await supabase.auth.getSession();
        const completedSet = new Set<string>();
        if (session) {
            const { data: progressData } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", session.user.id);
            progressData?.forEach((p: any) => completedSet.add(p.lesson_id));
        }
        setCompletedLessons(completedSet);

        if (lessonsData && lessonsData.length > 0) {
            setLessons(lessonsData);
            // Sempre começa na primeira aula ou na última que ele parou
            setCurrentLesson(lessonsData[0]);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadContent();
  }, [params]);

  const onPlayerStateChange = async (event: any) => {
    if (event.data === 0) { // Fim do vídeo
        setJustEarned(true);
        setCompletedLessons(prev => {
            const newSet = new Set(prev);
            newSet.add(currentLesson.id);
            return newSet;
        });

        await supabase.rpc('finish_lesson_secure', { lesson_uuid: currentLesson.id });
        router.refresh(); 

        // Auto-avançar para a próxima que agora está desbloqueada
        setTimeout(() => {
            setLessons(prevLessons => {
                const currentIndex = prevLessons.findIndex(l => l.id === currentLesson.id);
                if (currentIndex < prevLessons.length - 1) {
                    setCurrentLesson(prevLessons[currentIndex + 1]);
                    setJustEarned(false);
                    setVideoStarted(true);
                }
                return prevLessons;
            });
        }, 3000);
    }
  };

  useEffect(() => {
    if (videoStarted && currentLesson?.video_id && window.YT) {
        if (playerRef.current) { try { playerRef.current.destroy(); } catch(e){} }
        setTimeout(() => {
            playerRef.current = new window.YT.Player('ninja-player', {
                videoId: currentLesson.video_id,
                height: '100%',
                width: '100%',
                playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 },
                events: { 'onStateChange': onPlayerStateChange }
            });
        }, 100);
    }
  }, [videoStarted, currentLesson]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden">
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />

      {/* HEADER */}
      <div className="h-16 border-b border-[#222] flex items-center px-6 justify-between bg-[#111] shrink-0">
          <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={20} /> <span className="text-sm font-bold uppercase">Voltar</span>
          </Link>
          <div className="text-sm font-bold text-[#C9A66B] uppercase tracking-wider truncate mx-4">{course?.title}</div>
          <div className="w-10"></div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* PLAYER */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black">
              <div className="max-w-4xl mx-auto pb-20">
                <div className="aspect-video w-full bg-[#111] rounded-xl overflow-hidden border border-[#333] mb-6 relative">
                    {videoStarted ? (
                        <div id="ninja-player" className="w-full h-full"></div>
                    ) : (
                        <button onClick={() => setVideoStarted(true)} className="absolute inset-0 flex flex-col items-center justify-center group">
                            <img src={`https://img.youtube.com/vi/${currentLesson?.video_id}/hqdefault.jpg`} className="absolute inset-0 w-full h-full object-cover opacity-40" />
                            <div className="w-20 h-20 bg-[#C9A66B] rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform z-10">
                                <Play size={32} className="text-black ml-1 fill-black" />
                            </div>
                        </button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">{currentLesson?.title}</h1>
                        <p className="text-sm text-gray-500">Módulo: {course?.title}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all duration-500
                        ${justEarned ? 'bg-[#C9A66B] text-black border-[#C9A66B] scale-105' : 'bg-[#1a1a1a] text-[#C9A66B] border-[#333]'}
                    `}>
                        <Trophy size={16} /> {justEarned ? "+10 PRO Recebido!" : completedLessons.has(currentLesson?.id) ? "PRO Adquirido" : "+10 PRO"}
                    </div>
                </div>
              </div>
          </div>

          {/* LISTA DE AULAS COM TRAVA SEQUENCIAL */}
          <div className="w-full md:w-80 bg-[#0a0a0a] border-l border-[#222] overflow-y-auto shrink-0 md:h-full h-96">
              <div className="p-4 border-b border-[#222] bg-[#0a0a0a] sticky top-0 z-10">
                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2"><ListVideo size={14} /> Playlist do Módulo</h3>
              </div>
              <div className="flex flex-col pb-20">
                {lessons.map((lesson, idx) => { 
                    const isActive = currentLesson?.id === lesson.id; 
                    const isCompleted = completedLessons.has(lesson.id);
                    
                    // LÓGICA DA TRAVA: A aula 1 (idx 0) está sempre aberta. 
                    // As outras (idx > 0) só abrem se a anterior (idx - 1) estiver completada.
                    const isUnlocked = idx === 0 || completedLessons.has(lessons[idx - 1].id);

                    return (
                        <button 
                            key={lesson.id} 
                            disabled={!isUnlocked}
                            onClick={() => isUnlocked && setCurrentLesson(lesson)} 
                            className={`p-4 text-left border-b border-[#1a1a1a] transition-all flex gap-3 
                                ${isActive ? 'bg-[#161616] border-l-4 border-l-[#C9A66B]' : 'border-l-4 border-l-transparent'}
                                ${!isUnlocked ? 'opacity-40 cursor-not-allowed bg-black' : 'hover:bg-[#111] cursor-pointer'}
                            `}
                        >
                            <div className="mt-1">
                                {!isUnlocked ? (
                                    <Lock size={14} className="text-gray-600" />
                                ) : isCompleted ? (
                                    <CheckCircle size={14} className="text-green-500" />
                                ) : (
                                    <Play size={14} className={isActive ? "text-[#C9A66B]" : "text-gray-600"} />
                                )}
                            </div>
                            <div>
                                <h4 className={`text-sm font-medium mb-1 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                    {lesson.title}
                                </h4>
                                {!isUnlocked && <span className="text-[10px] text-[#C9A66B] uppercase font-bold tracking-tighter">Bloqueada</span>}
                            </div>
                        </button>
                    )
                })}
              </div>
          </div>
      </div>
    </div>
  );
}
