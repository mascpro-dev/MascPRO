"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Save, History, Download, Send, Trophy, Lock, CheckCircle, PlayCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import "plyr/dist/plyr.css"; 

export default function AulaPlayerPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  const courseCode = params?.code as string;

  const playerInstance = useRef<any>(null);
  
  // Dados
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [progressMap, setProgressMap] = useState<Record<string, any>>({}); 
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState(0);
  
  // Interação
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Player & Memória
  const [savedTime, setSavedTime] = useState(0); 
  const [hasJumped, setHasJumped] = useState(false);

  const COINS_PER_LESSON = 10; 

  // 1. CARREGAMENTO DOS DADOS
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, lessonsRes, progressRes] = await Promise.all([
            supabase.from("profiles").select("coins, personal_coins").eq("id", user.id).single(),
            supabase.from("lessons").select("*").ilike("course_code", courseCode).order("sequence_order", { ascending: true }),
            supabase.from("lesson_progress").select("lesson_id, completed, seconds_watched").eq("user_id", user.id)
        ]);

        if (profileRes.data) {
            setUserCoins((profileRes.data.coins || 0) + (profileRes.data.personal_coins || 0));
        }

        const pMap: Record<string, any> = {};
        if (progressRes.data) {
            progressRes.data.forEach((p: any) => pMap[p.lesson_id] = p);
            setProgressMap(pMap);
        }

        if (lessonsRes.data && lessonsRes.data.length > 0) {
            setLessons(lessonsRes.data);
            const nextToWatch = lessonsRes.data.find((l: any) => !pMap[l.id]?.completed) || lessonsRes.data[0];
            setCurrentLesson(nextToWatch);
        }
      } catch (err) {
        console.error("Erro carregamento:", err);
      } finally {
        setLoading(false);
      }
    }
    if (courseCode) fetchInitialData();
  }, [courseCode, supabase]);

  // 2. PREPARAR AULA (Ler Memória)
  useEffect(() => {
    if (!currentLesson) return;
    
    setHasJumped(false);
    setSavedTime(0);

    // Verifica no mapa local se tem tempo salvo
    const myProgress = progressMap[currentLesson.id];
    if (myProgress?.seconds_watched > 0) {
        setSavedTime(myProgress.seconds_watched);
    }
    
    fetchComments();
  }, [currentLesson]); 

  async function fetchComments() {
      if (!currentLesson) return;
      const { data } = await supabase
        .from("lesson_comments")
        .select(`id, content, created_at, profiles(full_name, avatar_url)`)
        .eq("lesson_id", currentLesson.id)
        .order("created_at", { ascending: false });
      if (data) setComments(data);
  }

  // 3. PLAYER DE VÍDEO (COM MEMÓRIA ATIVA)
  useEffect(() => {
    if (!currentLesson || !currentLesson.video_id) return;

    let player: any = null;
    if (playerInstance.current) {
        try { playerInstance.current.destroy(); } catch(e) {}
        playerInstance.current = null;
    }

    const loadPlayer = async () => {
        const Plyr = (await import("plyr")).default;
        player = new Plyr("#player-target", {
            autoplay: true,
            controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
            youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
        });
        playerInstance.current = player;

        // --- AQUI ESTÁ A MÁGICA DA MEMÓRIA ---
        player.on('ready', () => {
            // Se tiver tempo salvo maior que 5 segundos, pula para ele
            if (savedTime > 5) { 
                setTimeout(() => {
                    player.currentTime = savedTime; // Pula para o minuto 30 (exemplo)
                    setHasJumped(true); // Avisa visualmente "Retomando"
                }, 1000); 
            }
        });

        // Salva a cada 5 segundos
        player.on('timeupdate', (event: any) => {
            const currentTime = event.detail.plyr.currentTime;
            if (Math.floor(currentTime) > 0 && Math.floor(currentTime) % 5 === 0) {
                 salvarProgresso(currentTime, false);
            }
        });

        player.on('ended', () => {
            salvarProgresso(player.duration, true);
            pagarRecompensa();
        });
    };

    setTimeout(() => loadPlayer(), 50);

    return () => {
        if (playerInstance.current) { try { playerInstance.current.destroy(); } catch(e) {} }
    };
  }, [currentLesson?.id, savedTime]); // Adicionei savedTime para garantir que ele tenha o valor ao carregar

  // --- AÇÕES ---

  const salvarProgresso = async (time: number, isCompleted: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && currentLesson) {
        const updates: any = {
            user_id: user.id,
            lesson_id: currentLesson.id,
            seconds_watched: Math.floor(time),
            last_updated: new Date().toISOString()
        };
        if (isCompleted) updates.completed = true;

        // Atualiza UI
        setProgressMap(prev => ({
            ...prev,
            [currentLesson.id]: { 
                ...prev[currentLesson.id], 
                seconds_watched: time, 
                completed: isCompleted ? true : prev[currentLesson.id]?.completed 
            }
        }));

        // Salva Banco
        supabase.from("lesson_progress").upsert(updates).then(({ error }) => {
            if (error) console.error("Erro save:", error);
        });
    }
  };

  const reiniciarAula = async () => {
    if (playerInstance.current) {
        playerInstance.current.currentTime = 0; 
        playerInstance.current.play(); 
    }
    setHasJumped(false);
    await salvarProgresso(0, false);
  };

  async function pagarRecompensa() {
    const { data: { user } } = await supabase.auth.getUser();
    const isAlreadyCompleted = progressMap[currentLesson.id]?.completed;
    
    if (user && !isAlreadyCompleted) {
        // Atualiza UI instantaneamente
        setUserCoins(prev => prev + COINS_PER_LESSON);
        
        // Processa banco em background
        supabase.rpc('add_pro_system', { 
            user_id_param: user.id, 
            amount: COINS_PER_LESSON, 
            type_id: 1 
        }); 
    }
  }

  async function handleSendComment() {
      if (!newComment.trim()) return;
      setSendingComment(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && currentLesson) {
          const { error } = await supabase.from("lesson_comments").insert({
              user_id: user.id,
              lesson_id: currentLesson.id,
              content: newComment
          });
          if (!error) {
              setNewComment("");
              fetchComments();
          }
      }
      setSendingComment(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">
      <Loader2 className="w-8 h-8 animate-spin text-[#C9A66B]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 pb-20">
      
      <style jsx global>{`
        :root { --plyr-color-main: #C9A66B; }
        .plyr--full-ui input[type=range] { color: #C9A66B; }
        .plyr__control--overlaid { background: rgba(201, 166, 107, 0.9); }
        .plyr--video { border-radius: 12px; overflow: hidden; border: 1px solid #333; }
        .plyr__video-embed iframe { pointer-events: none; }
      `}</style>

      {/* TOPO */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-sm tracking-wide">VOLTAR</span>
        </Link>
        <div className="flex items-center gap-4">
            <div className="bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-lg flex items-center gap-2">
                <Trophy size={14} className="text-[#C9A66B]" />
                <span className="font-bold text-[#C9A66B] text-xs">{userCoins} <span className="text-gray-500 font-normal">PRO</span></span>
            </div>
            {hasJumped && (
                <div className="flex items-center gap-1 text-xs text-green-500 font-bold animate-in fade-in">
                    <History size={12} /> <span className="hidden sm:inline">Retomando de {Math.floor(savedTime/60)}min</span>
                </div>
            )}
             <div className="flex items-center gap-1 text-[10px] text-gray-600">
                <Save size={10} />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- ÁREA PRINCIPAL --- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video bg-black rounded-xl shadow-2xl shadow-black relative z-10">
            {currentLesson?.video_id ? (
                <div key={currentLesson.id} className="plyr__video-embed" id="player-target">
                    <iframe
                        src={`https://www.youtube.com/embed/${currentLesson.video_id}?origin=https://plyr.io&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1`}
                        allowFullScreen
                        allow="autoplay"
                    ></iframe>
                </div>
            ) : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Carregando vídeo...</div>}
          </div>

          <div className="bg-[#111] border border-[#222] rounded-lg overflow-hidden">
             <div className="flex border-b border-[#222]">
                <button onClick={() => setActiveTab('info')} className={`px-4 py-3 text-xs font-bold uppercase transition-colors ${activeTab === 'info' ? "bg-[#C9A66B] text-black" : "text-gray-400 hover:bg-[#1a1a1a]"}`}>Material</button>
                <button onClick={() => setActiveTab('comments')} className={`px-4 py-3 text-xs font-bold uppercase transition-colors ${activeTab === 'comments' ? "bg-[#C9A66B] text-black" : "text-gray-400 hover:bg-[#1a1a1a]"}`}>Dúvidas</button>
             </div>
             <div className="p-4">
                {activeTab === 'info' && currentLesson && (
                    <div className="animate-in fade-in">
                        <div className="flex justify-between items-start mb-2">
                            <h1 className="text-lg font-bold text-white">{currentLesson.title}</h1>
                            <span className="bg-[#C9A66B]/10 text-[#C9A66B] text-[10px] font-bold px-2 py-0.5 rounded border border-[#C9A66B]/20 whitespace-nowrap">+{COINS_PER_LESSON} PRO</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed mb-4">{currentLesson.description || "Assista a aula completa para liberar o próximo módulo."}</p>
                        
                        <div className="flex gap-3">
                            {currentLesson.material_url && (
                                <a href={currentLesson.material_url} target="_blank" className="inline-flex items-center gap-2 bg-[#222] hover:bg-[#333] border border-[#333] text-white px-3 py-2 rounded text-xs font-bold transition-all"><Download size={14} className="text-[#C9A66B]" /> Baixar PDF</a>
                            )}
                            <button onClick={reiniciarAula} className="inline-flex items-center gap-2 bg-[#222] hover:bg-[#333] border border-[#333] text-gray-300 hover:text-white px-3 py-2 rounded text-xs font-bold transition-all">
                                <RotateCcw size={14} /> Reiniciar Aula
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'comments' && (
                    <div className="animate-in fade-in">
                        <div className="flex gap-2 mb-4">
                            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendComment()} placeholder="Sua dúvida..." className="flex-1 bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-xs text-white focus:border-[#C9A66B] outline-none"/>
                            <button onClick={handleSendComment} disabled={sendingComment} className="bg-[#C9A66B] text-black px-3 py-2 rounded hover:bg-[#b08d55] disabled:opacity-50">{sendingComment ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />}</button>
                        </div>
                        <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-2 items-start border-b border-[#222] pb-3 last:border-0">
                                    <div className="w-5 h-5 rounded-full bg-[#222] overflow-hidden shrink-0">{comment.profiles?.avatar_url && <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" />}</div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5"><span className="font-bold text-[#C9A66B] text-[10px]">{comment.profiles?.full_name}</span><span className="text-[10px] text-gray-600">{new Date(comment.created_at).toLocaleDateString()}</span></div>
                                        <p className="text-xs text-gray-300">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* --- TRILHA --- */}
        <div className="bg-[#111] border border-[#222] rounded-lg p-5 h-fit">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Trilha do Módulo</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === currentLesson?.id;
              const isLocked = index > 0 && !progressMap[lessons[index-1].id]?.completed;
              const isCompleted = progressMap[lesson.id]?.completed;

              return (
                <button key={lesson.id} disabled={isLocked} onClick={() => { setHasJumped(false); setCurrentLesson(lesson); setActiveTab('info'); }} className={`w-full flex items-center gap-3 p-3 rounded text-left transition-all border ${isActive ? "bg-[#C9A66B]/10 border-[#C9A66B]/30" : isLocked ? "opacity-50 cursor-not-allowed border-transparent" : "hover:bg-white/5 border-transparent"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isCompleted ? "bg-green-500 text-black" : isActive ? "bg-[#C9A66B] text-black" : "bg-[#222] text-gray-500"}`}>{isCompleted ? <CheckCircle size={12} /> : isLocked ? <Lock size={10} /> : index + 1}</div>
                  <div className="flex-1"><p className={`text-xs font-bold leading-tight ${isActive ? "text-white" : "text-gray-400"}`}>{lesson.title}</p></div>
                  {isActive && <PlayCircle size={14} className="text-[#C9A66B]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
