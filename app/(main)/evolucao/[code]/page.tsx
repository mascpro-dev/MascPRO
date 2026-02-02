"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trophy, PlayCircle, Download, Send, Lock, CheckCircle } from "lucide-react";
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
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  
  // DIAGNÓSTICO
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = (msg: string) => setDebugLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${msg}`]);

  useEffect(() => { loadData(); }, []);

  // --- PLAYER COM MEMÓRIA ---
  useEffect(() => {
    if (!currentLesson?.video_id) return;
    
    if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
        playerRef.current = null;
    }

    const videoId = getCleanVideoId(currentLesson.video_id);
    addLog(`🎬 Iniciando Player com ID: ${videoId}`);

    const initPlayer = async () => {
        if (!containerRef.current) return;
        try {
            const Plyr = (await import("plyr")).default;
            const player = new Plyr(containerRef.current, {
                youtube: { noCookie: true, rel: 0, showinfo: 0, modestbranding: 1 },
                controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
            });

            player.source = { type: 'video', sources: [{ src: videoId, provider: 'youtube' }] };
            
            // Quando o player estiver pronto, pula para o tempo salvo
            player.on('ready', () => {
                if (savedTime > 5) {
                    addLog(`⏩ Restaurando memória: ${Math.floor(savedTime)}s`);
                    try {
                        player.currentTime = savedTime;
                    } catch (e) {
                        addLog(`⚠️ Erro ao restaurar tempo: ${e}`);
                    }
                }
            });

            // Salvar progresso a cada 10 segundos
            let lastSave = 0;
            player.on('timeupdate', () => {
                const now = Date.now();
                if (now - lastSave > 10000 && player.currentTime > 5) {
                    lastSave = now;
                    saveProgress(player.currentTime);
                }
            });

            // Marcar como concluída quando terminar
            player.on('ended', () => {
                addLog(`✅ Aula concluída!`);
                markAsCompleted();
            });

            playerRef.current = player;
            addLog(`✅ Player inicializado com sucesso`);
        } catch (error: any) { 
            addLog(`❌ Erro Player: ${error?.message || error}`); 
        }
    };

    setTimeout(initPlayer, 500);
    fetchLessonDetails(currentLesson.id);

    return () => { if (playerRef.current) try { playerRef.current.destroy(); } catch(e) {} };
  }, [currentLesson]);

  async function loadData() {
    addLog("🔄 Iniciando carregamento de dados...");
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { addLog("❌ Sem usuário logado"); return; }

        // 1. Busca Aulas
        const code = params?.code || 'MOD_VENDAS';
        addLog(`🔍 Buscando curso: ${code}`);

        // Tenta buscar SEM FILTRO primeiro para ver se tem algo
        const { data: allLessons, error } = await supabase
            .from("lessons")
            .select("*")
            .order("sequence_order", { ascending: true });

        if (error) {
            addLog(`❌ Erro Supabase: ${error.message}`);
        } else {
            addLog(`✅ Total de aulas no banco: ${allLessons?.length || 0}`);
            
            // Filtra manualmente no front para garantir
            const filtered = allLessons?.filter(l => 
                l.course_code === code || 
                l.course_code === 'MOD_VENDAS' ||
                l.course_code?.toLowerCase().includes('vendas')
            ) || [];

            addLog(`✅ Aulas filtradas para este curso: ${filtered.length}`);

            if (filtered.length > 0) {
                // Remove duplicatas
                const unicas = filtered.filter((v,i,a)=>a.findIndex(t=>(t.title===v.title))===i);
                setLessons(unicas);
                setCurrentLesson(unicas[0]);
                addLog(`▶️ Aula selecionada: ${unicas[0].title}`);
            } else {
                addLog("⚠️ Nenhuma aula encontrada após filtro.");
            }
        }
        
        // Saldo
        const { data: profile } = await supabase.from("profiles").select("coins, personal_coins, network_coins, store_coins").eq("id", user.id).single();
        if (profile) {
            setUserCoins(profile.coins || (profile.personal_coins + profile.network_coins + profile.store_coins) || 0);
        }

        // Carregar progresso de todas as aulas
        const { data: progressData } = await supabase
            .from("lesson_progress")
            .select("lesson_id, completed, stopped_at")
            .eq("user_id", user.id);
        
        if (progressData) {
            const pMap: Record<string, any> = {};
            progressData.forEach((p: any) => {
                pMap[p.lesson_id] = p;
            });
            setProgressMap(pMap);
            addLog(`📊 Progresso carregado: ${progressData.length} registros`);
        }

    } catch (e: any) { 
        addLog(`🔥 Erro Crítico: ${e?.message || e}`); 
    } finally { 
        setLoading(false); 
    }
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

      // Buscar progresso desta aula
      try {
          const { data: progress, error } = await supabase
            .from("lesson_progress")
            .select("stopped_at, completed") 
            .eq("user_id", user.id)
            .eq("lesson_id", lessonId)
            .maybeSingle();
          
          if (!error && progress) {
              setSavedTime(progress.stopped_at || 0);
              setProgressMap(prev => ({
                  ...prev,
                  [lessonId]: progress
              }));
          } else {
              setSavedTime(0);
          }
      } catch (err) { setSavedTime(0); }
  }

  async function saveProgress(time: number) {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || !currentLesson) return;
          
          await supabase.from("lesson_progress").upsert({
              user_id: user.id,
              lesson_id: currentLesson.id,
              stopped_at: Math.floor(time),
              updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, lesson_id' });
      } catch (e) { console.warn(e); }
  }

  async function markAsCompleted() {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || !currentLesson) return;

          await supabase.from("lesson_progress").upsert({
              user_id: user.id,
              lesson_id: currentLesson.id,
              completed: true,
              stopped_at: 0,
              updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, lesson_id' });
          
          setProgressMap(prev => ({
              ...prev,
              [currentLesson.id]: { ...prev[currentLesson.id], completed: true }
          }));
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

  // Verificar se a aula está bloqueada (só libera se a anterior estiver completa)
  function isLessonLocked(lessonIndex: number): boolean {
      if (lessonIndex === 0) return false; // Primeira aula sempre liberada
      
      const previousLesson = lessons[lessonIndex - 1];
      if (!previousLesson) return false;
      
      const previousProgress = progressMap[previousLesson.id];
      return !previousProgress?.completed;
  }

  if (loading) return <div className="min-h-screen bg-black flex flex-col items-center justify-center text-[#C9A66B]">
      <Loader2 className="animate-spin mb-4" size={40}/> 
      <h2 className="text-xl font-bold mb-2">Diagnosticando Sistema...</h2>
      <div className="mt-4 text-xs text-gray-500 font-mono text-left max-w-md bg-[#111] p-4 rounded border border-[#333] max-h-[400px] overflow-y-auto">
          {debugLog.length === 0 ? <div className="text-gray-600">Aguardando logs...</div> : debugLog.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
      </div>
  </div>;

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
                                {comments.length === 0 && <p className="text-center text-gray-600 text-xs py-4">Nenhuma dúvida ainda.</p>}
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
                {lessons.map((aula, i) => {
                    const isLocked = isLessonLocked(i);
                    const isCompleted = progressMap[aula.id]?.completed;
                    const isActive = currentLesson?.id === aula.id;

                    return (
                        <button 
                            key={aula.id} 
                            onClick={() => {
                                if (!isLocked) {
                                    setCurrentLesson(aula);
                                    setActiveTab('info');
                                    fetchLessonDetails(aula.id);
                                }
                            }}
                            disabled={isLocked}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left border transition-all ${
                                isLocked 
                                    ? "opacity-50 cursor-not-allowed border-transparent" 
                                    : isActive 
                                        ? "bg-[#C9A66B]/10 border-[#C9A66B]" 
                                        : "border-transparent hover:bg-white/5"
                            }`}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isLocked 
                                    ? "bg-[#222] text-gray-700" 
                                    : isCompleted 
                                        ? "bg-green-500 text-black" 
                                        : isActive 
                                            ? "bg-[#C9A66B] text-black" 
                                            : "bg-[#222] text-gray-500"
                            }`}>
                                {isLocked ? <Lock size={10} /> : isCompleted ? <CheckCircle size={12} /> : i + 1}
                            </div>
                            <span className={`text-sm font-bold line-clamp-1 ${isActive ? "text-white" : "text-gray-400"}`}>{aula.title}</span>
                            {isActive && <PlayCircle size={16} className="text-[#C9A66B] ml-auto" />}
                        </button>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
}
