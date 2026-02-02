"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trophy, PlayCircle, Download, Send } from "lucide-react";
import "plyr/dist/plyr.css"; 

const getCleanVideoId = (url: string) => {
    if (!url) return "";
    let clean = url.trim();
    if (clean.includes("v=")) clean = clean.split("v=")[1].split("&")[0];
    if (clean.includes("youtu.be/")) clean = clean.split("youtu.be/")[1].split("?")[0];
    if (clean.length > 11) clean = clean.substring(0, 11);
    return clean;
};

export default function AulaPlayerPage() {
  const supabase = createClientComponentClient();
  const params = useParams();
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [userCoins, setUserCoins] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [savedTime, setSavedTime] = useState(0);

  useEffect(() => { loadData(); }, []);

  // --- PLAYER BLINDADO ---
  useEffect(() => {
    if (!currentLesson?.video_id) return;
    
    if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
    }

    const videoId = getCleanVideoId(currentLesson.video_id);
    let plyrInstance: any = null;

    const initPlayer = async () => {
        if (!containerRef.current) return;
        try {
            const Plyr = (await import("plyr")).default;
            plyrInstance = new Plyr(containerRef.current, {
                youtube: { noCookie: true, rel: 0, showinfo: 0, modestbranding: 1 },
                controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
            });

            plyrInstance.source = {
                type: 'video',
                sources: [{ src: videoId, provider: 'youtube' }]
            };

            plyrInstance.on('ready', () => {
                // Recupera tempo salvo (usando a variável savedTime)
                if (savedTime > 5) {
                    try { plyrInstance.currentTime = savedTime; } catch(e) {}
                }
            });

            let lastSave = 0;
            plyrInstance.on('timeupdate', () => {
                const now = Date.now();
                if (now - lastSave > 10000 && plyrInstance.currentTime > 5) {
                    lastSave = now;
                    saveProgress(plyrInstance.currentTime);
                }
            });

            playerRef.current = plyrInstance;
        } catch (error) { console.error(error); }
    };

    setTimeout(initPlayer, 100);
    fetchLessonDetails(currentLesson.id);

    return () => { if (playerRef.current) try { playerRef.current.destroy(); } catch(e) {} };
  }, [currentLesson]);

  async function loadData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile) setUserCoins(profile.coins || (profile.personal_coins + profile.network_coins + profile.store_coins) || 0);

        const code = params?.code || 'MOD_VENDAS';
        const { data: aulas } = await supabase
            .from("lessons")
            .select("*")
            .or(`course_code.eq.${code},course_code.eq.MOD_VENDAS`)
            .order("sequence_order", { ascending: true });

        if (aulas?.length) {
            const unicas = aulas.filter((v,i,a)=>a.findIndex(t=>(t.title===v.title))===i);
            setLessons(unicas);
            setCurrentLesson(unicas[0]);
        }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function fetchLessonDetails(lessonId: string) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coms } = await supabase
        .from("lesson_comments")
        .select(`*, profiles(full_name, avatar_url)`)
        .eq("lesson_id", lessonId)
        .order('created_at', { ascending: false });
      setComments(coms || []);

      // MUDANÇA AQUI: current_time -> stopped_at
      try {
          const { data: progress, error } = await supabase
            .from("lesson_progress")
            .select("stopped_at") 
            .eq("user_id", user.id)
            .eq("lesson_id", lessonId)
            .maybeSingle();
          
          if (!error && progress) {
              setSavedTime(progress.stopped_at || 0);
          } else {
              setSavedTime(0);
          }
      } catch (err) { setSavedTime(0); }
  }

  async function saveProgress(time: number) {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || !currentLesson) return;
          
          // MUDANÇA AQUI: current_time -> stopped_at
          await supabase.from("lesson_progress").upsert({
              user_id: user.id,
              lesson_id: currentLesson.id,
              stopped_at: Math.floor(time),
              updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, lesson_id' });
      } catch (e) { console.warn(e); }
  }

  async function handleSendComment() {
      if (!newComment.trim() || !currentLesson) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
          await supabase.from("lesson_comments").insert({ user_id: user.id, lesson_id: currentLesson.id, content: newComment });
          setNewComment("");
          fetchLessonDetails(currentLesson.id);
      }
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-20">
      <style jsx global>{`
        :root { --plyr-color-main: #C9A66B; }
        .plyr--video { border-radius: 12px; overflow: hidden; border: 1px solid #333; }
      `}</style>
      <div className="flex justify-between items-center mb-6">
        <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-[#C9A66B]">
            <ArrowLeft size={20} /> <span className="font-bold text-sm">VOLTAR</span>
        </Link>
        <div className="flex items-center gap-2 bg-[#111] border border-[#333] px-3 py-1.5 rounded-full">
            <Trophy size={14} className="text-[#C9A66B]" />
            <span className="font-bold text-[#C9A66B] text-sm">{userCoins} PRO</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-[#333] shadow-2xl relative z-10">
                <div ref={containerRef} className="w-full h-full"></div>
            </div>

            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                <div className="flex border-b border-[#222]">
                    <button onClick={() => setActiveTab('info')} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'info' ? "bg-[#C9A66B] text-black" : "text-gray-400"}`}>Material</button>
                    <button onClick={() => setActiveTab('comments')} className={`flex-1 py-3 text-xs font-bold uppercase ${activeTab === 'comments' ? "bg-[#C9A66B] text-black" : "text-gray-400"}`}>Dúvidas ({comments.length})</button>
                </div>
                <div className="p-5 min-h-[200px]">
                    {activeTab === 'info' && (
                        <div className="animate-in fade-in">
                            <h1 className="text-xl font-bold text-white mb-2">{currentLesson?.title}</h1>
                            <p className="text-gray-400 text-sm mb-6">{currentLesson?.description || "Sem descrição."}</p>
                            {currentLesson?.material_url && <a href={currentLesson.material_url} target="_blank" className="inline-flex items-center gap-2 bg-[#222] border border-[#333] px-4 py-2 rounded-lg text-sm font-bold text-white"><Download size={16} className="text-[#C9A66B]"/> Baixar PDF</a>}
                        </div>
                    )}
                    {activeTab === 'comments' && (
                        <div className="animate-in fade-in">
                            <div className="flex gap-2 mb-6">
                                <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendComment()} placeholder="Dúvidas?" className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-sm text-white"/>
                                <button onClick={handleSendComment} className="bg-[#C9A66B] text-black p-2 rounded-lg"><Send size={18}/></button>
                            </div>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {comments.map((c) => (
                                    <div key={c.id} className="flex gap-3 border-b border-[#222] pb-3">
                                        <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center font-bold text-gray-500 text-xs">{c.profiles?.full_name?.charAt(0)}</div>
                                        <div><div className="text-[#C9A66B] font-bold text-xs mb-1">{c.profiles?.full_name}</div><p className="text-gray-300 text-sm">{c.content}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-xl p-4 h-fit max-h-[600px] overflow-y-auto">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Aulas ({lessons.length})</h3>
            <div className="space-y-2">
                {lessons.map((aula, i) => (
                    <button key={aula.id} onClick={() => { setCurrentLesson(aula); setActiveTab('info'); }} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left border ${currentLesson?.id === aula.id ? "bg-[#C9A66B]/10 border-[#C9A66B]" : "border-transparent hover:bg-white/5"}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentLesson?.id === aula.id ? "bg-[#C9A66B] text-black" : "bg-[#222] text-gray-500"}`}>{i + 1}</div>
                        <span className={`text-sm font-bold line-clamp-1 ${currentLesson?.id === aula.id ? "text-white" : "text-gray-400"}`}>{aula.title}</span>
                        {currentLesson?.id === aula.id && <PlayCircle size={16} className="text-[#C9A66B] ml-auto" />}
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
