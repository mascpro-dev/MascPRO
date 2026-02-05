"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useState, useRef, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams, useRouter } from "next/navigation"; 
import { ArrowLeft, Loader2, Play, CheckCircle, Lock, ListVideo, Trophy } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

declare global {
  interface Window {
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
  const [justEarned, setJustEarned] = useState(false);

  const playerRef = useRef<any>(null);

  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        const { data: courseData } = await supabase.from("courses").select("*").or(`code.eq.${params.code},slug.eq.${params.code}`).single();
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
            setCurrentLesson(lessonsData[0]);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadContent();
  }, [params.code]);

  const handleLessonComplete = useCallback(async () => {
    setJustEarned(true);
    setCompletedLessons(prev => {
      const newSet = new Set(prev);
      newSet.add(currentLesson.id);
      return newSet;
    });

    await supabase.rpc('finish_lesson_secure', { lesson_uuid: currentLesson.id });
    router.refresh(); 

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
    }, 2500);
  }, [currentLesson, supabase, router]);

  useEffect(() => {
    if (videoStarted && currentLesson?.video_id && window.YT) {
        if (playerRef.current) { try { playerRef.current.destroy(); } catch(e){} }
        playerRef.current = new window.YT.Player('ninja-player', {
            videoId: currentLesson.video_id,
            height: '100%',
            width: '100%',
            playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 },
            events: { 
              'onStateChange': (event: any) => {
                if (event.data === 0) {
                   handleLessonComplete();
                }
              } 
            }
        });
    }
  }, [videoStarted, currentLesson, handleLessonComplete]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden">
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />

      <div className="h-16 border-b border-[#222] flex items-center px-6 justify-between bg-[#0a0a0a] shrink-0">
          <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={18} /> <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
          </Link>
          <div className="text-xs font-black text-[#C9A66B] uppercase tracking-[0.2em] truncate">{course?.title}</div>
          <div className="w-10"></div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black">
              <div className="max-w-4xl mx-auto pb-20">
                <div className="aspect-video w-full bg-[#050505] rounded-3xl overflow-hidden border border-[#1a1a1a] mb-8 relative shadow-2xl">
                    {videoStarted ? (
                        <div id="ninja-player" className="w-full h-full"></div>
                    ) : (
                        <button onClick={() => setVideoStarted(true)} className="absolute inset-0 flex flex-col items-center justify-center group">
                            <img src={`https://img.youtube.com/vi/${currentLesson?.video_id}/maxresdefault.jpg`} className="absolute inset-0 w-full h-full object-cover opacity-50 transition-opacity group-hover:opacity-70" />
                            <div className="w-24 h-24 bg-[#C9A66B] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(201,166,107,0.4)] group-hover:scale-110 transition-transform z-10">
                                <Play size={32} className="text-black ml-1 fill-black" />
                            </div>
                        </button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">{currentLesson?.title}</h1>
                        <p className="text-sm text-gray-500 font-medium">Você está evoluindo no módulo {course?.title}</p>
                    </div>
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-black border transition-all duration-500
                        ${justEarned ? 'bg-[#C9A66B] text-black border-[#C9A66B] shadow-[0_0_20px_rgba(201,166,107,0.4)]' : 'bg-[#111] text-[#C9A66B] border-[#222]'}
                    `}>
                        <Trophy size={18} /> {justEarned ? "+10 PRO RECEBIDO!" : completedLessons.has(currentLesson?.id) ? "PRO ADQUIRIDO" : "+10 PRO"}
                    </div>
                </div>
              </div>
          </div>

          <div className="w-full md:w-85 bg-[#050505] border-l border-[#1a1a1a] overflow-y-auto shrink-0 md:h-full h-96">
              <div className="p-6 border-b border-[#1a1a1a] bg-[#050505] sticky top-0 z-10">
                <h3 className="font-black text-gray-500 text-[10px] uppercase tracking-[0.3em] flex items-center gap-2"><ListVideo size={14} /> Playlist</h3>
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
                            className={`p-5 text-left border-b border-[#111] transition-all flex gap-4 
                                ${isActive ? 'bg-[#0f0f0f] border-l-4 border-l-[#C9A66B]' : 'border-l-4 border-l-transparent'}
                                ${!isUnlocked ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-[#0a0a0a] cursor-pointer'}
                            `}
                        >
                            <div className="mt-1">
                                {!isUnlocked ? (
                                    <Lock size={14} className="text-gray-700" />
                                ) : isCompleted ? (
                                    <CheckCircle size={16} className="text-green-500" />
                                ) : (
                                    <div className={`w-4 h-4 rounded-full border-2 ${isActive ? 'border-[#C9A66B]' : 'border-gray-800'}`} />
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className={`text-sm font-bold leading-tight ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                    {lesson.title}
                                </h4>
                                {!isUnlocked && <span className="text-[9px] text-[#C9A66B] font-black uppercase tracking-widest mt-1 block">Bloqueada</span>}
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
