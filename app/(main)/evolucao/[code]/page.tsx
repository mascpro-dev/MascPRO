"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Save, History, Download, MessageSquare, Send, Trophy } from "lucide-react";
import Link from "next/link";
import "plyr/dist/plyr.css"; 

export default function AulaPlayerPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  const courseCode = params?.code as string;

  const playerInstance = useRef<any>(null);
  
  // Dados Principais
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState(0); // Gamificação
  
  // Abas e Comentários
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Player Logic
  const [sessionSeconds, setSessionSeconds] = useState(0); 
  const [savedTime, setSavedTime] = useState(0); 
  const [hasJumped, setHasJumped] = useState(false);

  // 1. CARREGAR AULAS E PERFIL
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Carrega Usuário e Moedas
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from("profiles").select("coins, personal_coins").eq("id", user.id).single();
            if (profile) setUserCoins((profile.coins || 0) + (profile.personal_coins || 0));
        }

        // Carrega Aulas
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
    if (courseCode) fetchData();
  }, [courseCode, supabase]);

  // 2. CARREGAR MEMÓRIA E COMENTÁRIOS (Ao trocar de aula)
  useEffect(() => {
    async function loadLessonData() {
        if (!currentLesson) return;
        setHasJumped(false);
        setSessionSeconds(0);
        setSavedTime(0);

        // A. Memória do Vídeo
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from("lesson_progress")
                .select("seconds_watched")
                .eq("user_id", user.id)
                .eq("lesson_id", currentLesson.id)
                .maybeSingle(); 
            
            const time = data?.seconds_watched || 0;
            setSavedTime(time);
        }

        // B. Carregar Comentários
        fetchComments();
    }
    loadLessonData();
  }, [currentLesson, supabase]);

  async function fetchComments() {
      if (!currentLesson) return;
      const { data } = await supabase
        .from("lesson_comments")
        .select(`id, content, created_at, profiles(full_name, avatar_url)`)
        .eq("lesson_id", currentLesson.id)
        .order("created_at", { ascending: false });
      
      if (data) setComments(data);
  }

  // 3. INICIAR O PLAYER PLYR
  useEffect(() => {
    if (!currentLesson) return;

    let player: any = null;
    const loadPlayer = async () => {
        const Plyr = (await import("plyr")).default;

        if (playerInstance.current) playerInstance.current.destroy();

        player = new Plyr("#player-target", {
            autoplay: true,
            controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
            youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
        });

        playerInstance.current = player;

        player.on('ready', () => {
            if (savedTime > 0) {
                setTimeout(() => {
                    player.currentTime = savedTime;
                    setHasJumped(true);
                }, 1500); 
            }
        });

        player.on('timeupdate', (event: any) => {
            const currentTime = event.detail.plyr.currentTime;
            if (Math.floor(currentTime) % 5 === 0 && currentTime > 0) {
                 salvarProgresso(currentTime);
            }
        });
    };

    loadPlayer();

    return () => {
        if (playerInstance.current) playerInstance.current.destroy();
    };
  }, [currentLesson, savedTime]);

  // 4. LÓGICA DE RECOMPENSA (MOEDAS)
  useEffect(() => {
      if (!currentLesson) return;
      const interval = setInterval(() => {
          const player = playerInstance.current;
          if (player && player.playing) {
              setSessionSeconds(prev => {
                  const novo = prev + 1;
                  // A cada 1 minuto (60s) atualiza visualmente, a cada 10min (600s) paga no banco
                  if (novo > 0 && novo % 600 === 0) pagarRecompensa();
                  return novo;
              });
          }
      }, 1000);
      return () => clearInterval(interval);
  }, [currentLesson]);

  // --- AÇÕES ---

  const salvarProgresso = async (time: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from("lesson_progress").upsert({
            user_id: user.id,
            lesson_id: currentLesson.id,
            seconds_watched: Math.floor(time),
            last_updated: new Date().toISOString()
        });
    }
  };

  async function pagarRecompensa() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.rpc('reward_watch_time_v2', { user_id: user.id });
        // Atualiza visualmente as moedas
        setUserCoins(prev => prev + 2); // Exemplo: ganha 2 moedas visualmente (ajuste conforme sua regra)
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
              fetchComments(); // Recarrega lista
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

      {/* TOPO: Voltar + Pontuação */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-sm tracking-wide">VOLTAR</span>
        </Link>
        
        <div className="flex items-center gap-4">
            {/* BADGE DE MOEDAS */}
            <div className="bg-[#1a1a1a] border border-[#333] px-4 py-1.5 rounded-full flex items-center gap-2">
                <Trophy size={14} className="text-[#C9A66B]" />
                <span className="font-bold text-[#C9A66B] text-sm">{userCoins} <span className="text-gray-500 text-xs font-normal">PRO</span></span>
            </div>

            {hasJumped && (
                <div className="flex items-center gap-1 text-xs text-green-500 font-bold animate-in fade-in">
                    <History size={12} /> Retomando
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- COLUNA ESQUERDA: VÍDEO + INFO --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PLAYER */}
          <div className="aspect-video bg-black rounded-xl shadow-2xl shadow-black relative z-10">
            {currentLesson ? (
                <div key={currentLesson.id} className="plyr__video-embed" id="player-target">
                    <iframe
                        src={`https://www.youtube.com/embed/${currentLesson.video_id}?origin=https://plyr.io&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1`}
                        allowFullScreen
                        allow="autoplay"
                    ></iframe>
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">Carregando...</div>
            )}
          </div>

          {/* ABAS (DESCRIÇÃO / COMENTÁRIOS) */}
          <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
             <div className="flex border-b border-[#222]">
                <button 
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-4 text-sm font-bold uppercase transition-colors ${activeTab === 'info' ? "bg-[#C9A66B] text-black" : "text-gray-500 hover:bg-[#1a1a1a]"}`}
                >
                    Material & Info
                </button>
                <button 
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 py-4 text-sm font-bold uppercase transition-colors ${activeTab === 'comments' ? "bg-[#C9A66B] text-black" : "text-gray-500 hover:bg-[#1a1a1a]"}`}
                >
                    Comentários ({comments.length})
                </button>
             </div>

             <div className="p-6 min-h-[200px]">
                
                {/* CONTEÚDO: INFO */}
                {activeTab === 'info' && currentLesson && (
                    <div className="animate-in fade-in slide-in-from-left-2">
                        <h1 className="text-2xl font-bold text-white mb-2">{currentLesson.title}</h1>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            {currentLesson.description || "Sem descrição disponível para esta aula."}
                        </p>
                        
                        {currentLesson.material_url && (
                            <a 
                                href={currentLesson.material_url} 
                                target="_blank"
                                className="inline-flex items-center gap-2 bg-[#222] hover:bg-[#333] border border-[#333] hover:border-[#C9A66B] text-white px-4 py-3 rounded-lg transition-all"
                            >
                                <Download size={18} className="text-[#C9A66B]" />
                                <div className="text-left">
                                    <p className="text-xs text-gray-500 font-bold uppercase">Material de Apoio</p>
                                    <p className="text-sm font-bold">Baixar Arquivos da Aula</p>
                                </div>
                            </a>
                        )}
                    </div>
                )}

                {/* CONTEÚDO: COMENTÁRIOS */}
                {activeTab === 'comments' && (
                    <div className="animate-in fade-in slide-in-from-right-2">
                        
                        {/* INPUT */}
                        <div className="flex gap-2 mb-6">
                            <input 
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                                placeholder="Tem alguma dúvida sobre esta aula?"
                                className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:border-[#C9A66B] outline-none"
                            />
                            <button 
                                onClick={handleSendComment} 
                                disabled={sendingComment}
                                className="bg-[#C9A66B] text-black p-3 rounded-lg hover:bg-[#b08d55] disabled:opacity-50"
                            >
                                {sendingComment ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
                            </button>
                        </div>

                        {/* LISTA */}
                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {comments.length === 0 && <p className="text-center text-gray-600 text-sm py-4">Seja o primeiro a comentar!</p>}
                            
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3 items-start border-b border-[#222] pb-4 last:border-0">
                                    <div className="w-8 h-8 rounded-full bg-[#222] overflow-hidden shrink-0 mt-1">
                                        {comment.profiles?.avatar_url && <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-[#C9A66B] text-xs">{comment.profiles?.full_name || "Aluno"}</span>
                                            <span className="text-[10px] text-gray-600">{new Date(comment.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-300">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
             </div>
          </div>

        </div>

        {/* --- COLUNA DIREITA: LISTA DE AULAS --- */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5 h-fit">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            Módulos da Jornada
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === currentLesson?.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setHasJumped(false);
                    setCurrentLesson(lesson);
                    setActiveTab('info'); // Volta para info ao trocar aula
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all border ${
                    isActive ? "bg-[#C9A66B]/10 border-[#C9A66B]/40" : "bg-transparent border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isActive ? "bg-[#C9A66B] text-black" : "bg-[#222] text-gray-500"
                  }`}>
                    {isActive ? "▶" : index + 1}
                  </div>
                  <div>
                      <p className={`text-sm font-bold leading-tight ${isActive ? "text-white" : "text-gray-400"}`}>
                        {lesson.title}
                      </p>
                      <p className="text-[10px] text-gray-600 mt-1">Videoaula</p>
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
