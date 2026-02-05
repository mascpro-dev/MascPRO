"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useState, useRef, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2, Play, Pause, CheckCircle, Lock, ListVideo, Send, User, Info, HelpCircle, FileText, Maximize, Volume2, VolumeX, Clock, Trophy } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

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
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [justEarned, setJustEarned] = useState(false);

  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
            const firstUnwatched = lessonsData.find((l: any) => !completedSet.has(l.id));
            setCurrentLesson(firstUnwatched || lessonsData[0]);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadContent();
  }, [params]);

  useEffect(() => {
    if (!currentLesson?.id) return;
    setVideoStarted(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setJustEarned(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [currentLesson]);

  const onPlayerStateChange = useCallback(async (event: any) => {
    if (event.data === 0) {
        setIsPlaying(false);
        setJustEarned(true);
        setCompletedLessons(prev => {
            const newSet = new Set(prev);
            newSet.add(currentLesson.id);
            return newSet;
        });

        const { error } = await supabase.rpc('finish_lesson_secure', { 
            lesson_uuid: currentLesson.id 
        });

    if (!error) {
            router.refresh(); 
        }

        setTimeout(() => {
            setLessons(prevLessons => {
                const currentIndex = prevLessons.findIndex(l => l.id === currentLesson.id);
                if (currentIndex < prevLessons.length - 1) {
                    setCurrentLesson(prevLessons[currentIndex + 1]);
                }
                return prevLessons;
            });
        }, 3000);
    }
    if (event.data === 1) setIsPlaying(true);
    if (event.data === 2) setIsPlaying(false);
  }, [currentLesson, supabase, router]);

  useEffect(() => {
    if (videoStarted && currentLesson?.video_id && window.YT) {
        if (playerRef.current) { try { playerRef.current.destroy(); } catch(e){} }
      setTimeout(() => {
            playerRef.current = new window.YT.Player('ninja-player', {
                videoId: currentLesson.video_id,
                height: '100%',
                width: '100%',
                playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, showinfo: 0, iv_load_policy: 3 },
                events: {
                    'onReady': (event: any) => {
                        setDuration(event.target.getDuration());
                        setIsPlaying(true);
                        intervalRef.current = setInterval(() => {
                            if (playerRef.current && playerRef.current.getCurrentTime) {
                                setCurrentTime(playerRef.current.getCurrentTime());
                            }
                        }, 500);
                    },
                    'onStateChange': onPlayerStateChange
                }
            });
        }, 100);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [videoStarted, currentLesson, onPlayerStateChange]);

  const togglePlay = () => {
      if (!playerRef.current) return;
      if (isPlaying) { playerRef.current.pauseVideo(); } else { playerRef.current.playVideo(); }
      setIsPlaying(!isPlaying);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden">
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />

      {/* HEADER DO PLAYER */}
      <div className="h-16 border-b border-[#222] flex items-center px-6 justify-between bg-[#111] shrink-0">
        <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={20} /> <span className="text-sm font-bold uppercase hidden md:inline">Voltar</span>
        </Link>
          <div className="text-sm font-bold text-[#C9A66B] uppercase tracking-wider truncate mx-4">{course?.title}</div>
          <div className="w-10"></div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black scrollbar-hide">
              <div className="max-w-4xl mx-auto pb-20">
                
                {/* AREA DO VÍDEO */}
                <div ref={containerRef} className="aspect-video w-full bg-[#000] rounded-xl overflow-hidden border border-[#333] mb-6 relative group select-none">
                    {currentLesson?.video_id ? (
                        <>
                            {videoStarted ? (
                                <>
                                    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                                        <div className="w-[140%] h-[140%] -ml-[20%] -mt-[10%]">
                                            <div id="ninja-player" className="w-full h-full"></div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 z-10 w-full h-full cursor-pointer bg-transparent" onClick={togglePlay}></div>
                                    {!isPlaying && (
                                        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                                            <div className="w-20 h-20 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                                                <Play size={36} className="text-white ml-2 fill-white" />
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <button onClick={() => setVideoStarted(true)} className="absolute inset-0 w-full h-full cursor-pointer z-10 flex flex-col items-center justify-center group">
                                    <img src={`https://img.youtube.com/vi/${currentLesson.video_id}/hqdefault.jpg`} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                    <div className="w-24 h-24 bg-[#C9A66B] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(201,166,107,0.6)] group-hover:scale-110 transition-transform z-20">
                                        <Play size={36} className="text-black ml-1 fill-black" />
                                    </div>
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]"><p className="text-gray-500 text-sm">Aula sem vídeo.</p></div>
                    )}
          </div>

                {/* INFO E PONTUAÇÃO PRO */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{currentLesson?.title}</h1>
                        <p className="text-sm text-gray-500">Módulo: {course?.title}</p>
        </div>

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all duration-500 transform
                            ${justEarned 
                                ? 'bg-[#C9A66B] text-black border-[#C9A66B] scale-110' 
                                : completedLessons.has(currentLesson?.id)
                                    ? 'bg-green-900/20 text-green-500 border-green-800'
                                    : 'bg-[#1a1a1a] text-[#C9A66B] border-[#333]'
                            }
                        `}>
                            <Trophy size={16} />
                            {justEarned 
                                ? "+10 PRO Recebido!" 
                                : completedLessons.has(currentLesson?.id) 
                                    ? "PRO Adquirido" 
                                    : "+10 PRO"
                            }
                  </div>
                        {!completedLessons.has(currentLesson?.id) && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border bg-[#222] text-gray-400 border-[#333]"><Clock size={14} /> Pendente</div>
                    )}
                  </div>
          </div>
        </div>
      </div>

          <div className="w-full md:w-80 bg-[#0a0a0a] border-l border-[#222] overflow-y-auto shrink-0 md:h-full h-96">
              <div className="p-4 border-b border-[#222] bg-[#0a0a0a] sticky top-0 z-10"><h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2"><ListVideo size={14} /> Conteúdo</h3></div>
              <div className="flex flex-col pb-20">{lessons.map((lesson, idx) => { 
                  const isActive = currentLesson?.id === lesson.id; 
                  const isCompleted = completedLessons.has(lesson.id); 
                  return (<button key={lesson.id} onClick={() => setCurrentLesson(lesson)} className={`p-4 text-left border-b border-[#1a1a1a] transition-colors flex gap-3 group ${isActive ? 'bg-[#161616] border-l-4 border-l-[#C9A66B]' : 'border-l-4 border-l-transparent'} hover:bg-[#111] cursor-pointer`}><div className="mt-1">{isCompleted ? <CheckCircle size={14} className="text-green-500" /> : <Play size={14} className="text-gray-600" />}</div><div><h4 className={`text-sm font-medium mb-1 ${isActive ? 'text-white' : 'text-gray-400'}`}>{lesson.title}</h4></div></button>)
              })}</div>
          </div>
        </div>
    </div>
  );
}
