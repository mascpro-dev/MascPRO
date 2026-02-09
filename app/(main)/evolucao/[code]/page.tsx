"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Play, Pause, Volume2, VolumeX, Maximize, Minimize, CheckCircle, Lock, Trophy, MessageSquare, Send, User, Bookmark } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

declare global {
  interface Window { onYouTubeIframeAPIReady: () => void; YT: any; }
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
  
  // ESTADOS DO PLAYER PERSONALIZADO
  const [videoStarted, setVideoStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'sobre' | 'materiais' | 'duvidas'>('sobre');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [justEarned, setJustEarned] = useState(false);

  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const saveInterval = useRef<any>(null);

  // CARREGAMENTO DE DADOS (Mantido igual)
  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUser(session.user);

      const { data: courseData } = await supabase.from("courses").select("*").or(`code.eq.${params.code},slug.eq.${params.code}`).single();
      setCourse(courseData);

      const { data: lessonsData } = await supabase.from("lessons").select("*").eq("course_code", courseData.code).order("sequence_order", { ascending: true });
      setLessons(lessonsData || []);

      const { data: progress } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", session?.user.id);
      const completedSet = new Set<string>();
      progress?.forEach((p: any) => completedSet.add(p.lesson_id));
      setCompletedLessons(completedSet);

      setCurrentLesson(lessonsData?.[0]);
      setLoading(false);
    }
    loadData();
  }, [params.code, supabase]);

  useEffect(() => {
    if (currentLesson?.id) loadComments();
  }, [currentLesson]);

  async function loadComments() {
    if (!currentLesson?.id) return;
    const { data } = await supabase.from('comments').select('*, profiles(full_name, avatar_url)').eq('lesson_id', currentLesson.id).order('created_at', { ascending: false });
    setComments(data || []);
  }

  // --- FUNÇÕES DE CONTROLE DO PLAYER PERSONALIZADO ---
  
  // Gerencia a exibição dos controles ao passar o mouse
  const handleMouseEnter = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
    }
  };

  const togglePlay = () => {
      if (!playerRef.current) return;
      if (isPlaying) {
          playerRef.current.pauseVideo();
          // Mantém controles visíveis ao pausar
          setShowControls(true);
          clearTimeout(controlsTimeoutRef.current);
      } else {
          playerRef.current.playVideo();
          // Esconde após 2.5s se der play
          controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
      }
      // O estado isPlaying atualiza no onStateChange do YT
  };

  const toggleMute = () => {
      if (!playerRef.current) return;
      if (isMuted) { playerRef.current.unMute(); setIsMuted(false); }
      else { playerRef.current.mute(); setIsMuted(true); }
  };

  const toggleFullscreen = () => {
      if (!playerContainerRef.current) return;
      if (!document.fullscreenElement) {
          playerContainerRef.current.requestFullscreen().catch(err => console.error(err));
          setIsFullscreen(true);
      } else {
          document.exitFullscreen();
          setIsFullscreen(false);
      }
  };

  // Inicialização do YouTube API com controles ocultos
  useEffect(() => {
    if (videoStarted && currentLesson?.video_id && window.YT) {
      if (playerRef.current) playerRef.current.destroy();

      playerRef.current = new window.YT.Player('ninja-player', {
        videoId: currentLesson.video_id,
        height: '100%', width: '100%',
        playerVars: { 
            autoplay: 1, 
            controls: 0, // ESCONDE CONTROLES NATIVOS
            modestbranding: 1, // MINIMIZA LOGO
            rel: 0, // SEM VÍDEOS RELACIONADOS NO FINAL
            disablekb: 1, // DESABILITA TECLADO NATIVO
            fs: 0, // DESABILITA BOTÃO FS NATIVO
            iv_load_policy: 3 // ESCONDE ANOTAÇÕES
        },
        events: {
          onReady: async (event: any) => {
            setIsPlaying(true);
            // Auto-hide controles após iniciar
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);

            // Buscar posição salva e retomar
            if (currentUser) {
              const { data } = await supabase.from('lesson_progress').select('last_position').eq('lesson_id', currentLesson.id).eq('user_id', currentUser.id).single();
              if (data?.last_position && data.last_position > 5) {
                   event.target.seekTo(data.last_position);
              }
              
              // Salvar progresso a cada 10s
              saveInterval.current = setInterval(() => {
                if (playerRef.current && playerRef.current.getCurrentTime) {
                  const time = playerRef.current.getCurrentTime();
                  if (time > 0) {
                      supabase.from('lesson_progress').upsert({ 
                          user_id: currentUser.id, lesson_id: currentLesson.id, last_position: time 
                      }).then();
                  }
                }
              }, 10000);
            }
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
                 setIsPlaying(true);
            }
            if (event.data === window.YT.PlayerState.PAUSED) {
                 setIsPlaying(false);
                 setShowControls(true); // Mostra controles ao pausar
            }
            if (event.data === window.YT.PlayerState.ENDED) handleFinish();
          }
        }
      });
    }
    return () => {
        clearInterval(saveInterval.current);
        clearTimeout(controlsTimeoutRef.current);
    };
  }, [videoStarted, currentLesson, currentUser]);

  // houve mudança de aula, reseta estados
  useEffect(() => {
      setVideoStarted(false);
      setIsPlaying(false);
      setShowControls(true);
  }, [currentLesson]);

  // Listener para fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleFinish = async () => {
    if (!currentLesson?.id || !currentUser) return;
    await supabase.rpc('process_lesson_completion', { lesson_uuid: currentLesson.id });
    setJustEarned(true);
    const newSet = new Set(completedLessons);
    newSet.add(currentLesson.id);
    setCompletedLessons(newSet);
    router.refresh();
    // Volta ao início para não mostrar relacionados
    if (playerRef.current) {
      playerRef.current.seekTo(0);
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      setShowControls(true);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    const { error } = await supabase.from('comments').insert({
      lesson_id: currentLesson.id,
      user_id: currentUser.id,
      content: newComment
    });
    if (!error) { setNewComment(""); loadComments(); }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans">
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />

      {/* HEADER (Visual Mantido) */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <Link href="/evolucao" className="flex items-center gap-3 text-zinc-500 hover:text-white transition-all group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Painel de Evolução</span>
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.4em] mb-1">Módulo Atual</span>
          <span className="text-xs font-medium text-white tracking-tight">{course?.title}</span>
        </div>
        <div className="w-20"></div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1">
        {/* LADO DO PLAYER E CONTEÚDO */}
        <div className="flex-1 p-6 lg:p-12">
          <div className="max-w-5xl mx-auto">
            
            {/* --- ÁREA DO PLAYER PERSONALIZADO --- */}
            <div 
                ref={playerContainerRef}
                className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-white/5 relative group shadow-2xl"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
              {!videoStarted ? (
                // CAPA INICIAL (Mantida)
                <button onClick={() => setVideoStarted(true)} className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                  <img src={`https://img.youtube.com/vi/${currentLesson?.video_id}/maxresdefault.jpg`} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                  <div className="w-16 h-16 bg-[#C9A66B] rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110">
                    <Play size={24} className="text-black ml-1 fill-black" />
                  </div>
                </button>
              ) : (
                <>
                    {/* IFRAME YOUTUBE (Invisível para cliques) */}
                    <div className="w-full h-full pointer-events-none">
                        <div id="ninja-player" className="w-full h-full"></div>
                    </div>

                    {/* MÁSCARA DE CONTROLE PERSONALIZADA */}
                    <div 
                        className={`absolute inset-0 z-30 flex flex-col justify-between bg-gradient-to-t from-black/90 via-transparent to-black/60 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        onClick={(e) => { if (e.target === e.currentTarget) togglePlay(); }} // Clicar no vídeo alterna play/pause
                    >
                        {/* Topo da Máscara */}
                        <div className="p-4 flex justify-between items-start">
                            <div className="bg-[#C9A66B]/90 text-black text-[9px] font-black px-3 py-1 rounded uppercase tracking-widest">
                                MascPRO Player
                            </div>
                        </div>

                        {/* Botão Play Central Gigante (só aparece quando pausado) */}
                        {!isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-20 h-20 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                                    <Play size={32} className="text-white fill-white ml-2" />
                                </div>
                            </div>
                        )}

                        {/* Barra de Controles Inferior */}
                        <div className="p-4 flex items-center justify-between bg-gradient-to-t from-black to-transparent">
                            <div className="flex items-center gap-4">
                                {/* Play/Pause Pequeno */}
                                <button onClick={togglePlay} className="text-white hover:text-[#C9A66B] transition-colors">
                                    {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
                                </button>

                                {/* Volume */}
                                <button onClick={toggleMute} className="text-white hover:text-[#C9A66B] transition-colors">
                                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </button>
                            </div>

                            {/* Fullscreen */}
                            <button onClick={toggleFullscreen} className="text-white hover:text-[#C9A66B] transition-colors">
                                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                            </button>
                        </div>
                    </div>
                </>
              )}
            </div>
            {/* --- FIM DO PLAYER PERSONALIZADO --- */}


            {/* INFO ABAIXO DO VÍDEO (Visual Mantido) */}
            <div className="mt-8 flex flex-col md:flex-row justify-between items-start gap-6">
              <div>
                <h1 className="text-2xl font-medium text-white tracking-tight">{currentLesson?.title}</h1>
                <div className="mt-2 flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#C9A66B] bg-[#C9A66B]/10 px-3 py-1 rounded-full border border-[#C9A66B]/20">
                        <Bookmark size={12} /> STATUS: {completedLessons.has(currentLesson?.id) ? 'CONCLUÍDO' : 'EM ANDAMENTO'}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">10 PRO EM JOGO</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-zinc-900/50 p-1.5 rounded-full border border-white/5">
                <div className="w-8 h-8 rounded-full bg-[#C9A66B] flex items-center justify-center text-black">
                    <Trophy size={14} />
                </div>
                <span className="pr-4 text-[10px] font-bold text-white uppercase tracking-tighter">{justEarned ? "Recebido!" : "Selo PRO"}</span>
              </div>
            </div>

            {/* ABAS UNIFICADAS (Visual Mantido) */}
            <div className="mt-16 border-t border-white/5 pt-8">
                <div className="flex gap-10 mb-8">
                    {['sobre', 'materiais', 'duvidas'].map((t) => (
                        <button key={t} onClick={() => setActiveTab(t as any)} 
                        className={`text-[10px] font-bold uppercase tracking-[0.2em] pb-2 transition-all border-b-2 ${activeTab === t ? 'text-[#C9A66B] border-[#C9A66B]' : 'text-zinc-600 border-transparent'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                <div className="min-h-[200px] text-sm text-zinc-400 leading-relaxed">
                    {activeTab === 'sobre' && <p>{currentLesson?.description || "Sem descrição disponível."}</p>}
                    {activeTab === 'materiais' && <div className="p-8 border border-dashed border-white/10 rounded-xl text-center">Nenhum anexo para esta aula.</div>}
                    {activeTab === 'duvidas' && (
                        <div className="max-w-2xl">
                            <div className="relative mb-8">
                                <textarea 
                                    value={newComment} onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Dúvida ou feedback..."
                                    className="w-full bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-sm focus:border-[#C9A66B]/30 outline-none min-h-[100px]"
                                />
                                <button onClick={handlePostComment} className="absolute bottom-4 right-4 p-2 bg-[#C9A66B] rounded-lg text-black hover:bg-white transition-all">
                                    <Send size={18} />
                                </button>
                            </div>
                            <div className="space-y-6">
                                {comments.map((c) => (
                                    <div key={c.id} className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
                                            {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" /> : <User size={16} className="text-zinc-600 m-auto" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-xs font-bold text-white uppercase">{c.profiles?.full_name || "Membro PRO"}</span>
                                                <span className="text-[9px] text-zinc-600">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}</span>
                                            </div>
                                            <p className="text-xs text-zinc-400">{c.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>

        {/* PLAYLIST (Visual Mantido) */}
        <div className="w-full lg:w-80 bg-black border-l border-white/5 overflow-y-auto">
            <div className="p-6 border-b border-white/5">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">Lista de Aulas</h3>
            </div>
            {lessons.map((lesson, idx) => {
                const isUnlocked = idx === 0 || completedLessons.has(lessons[idx - 1].id);
                const isActive = currentLesson?.id === lesson.id;
                return (
                    <button key={lesson.id} disabled={!isUnlocked} onClick={() => setCurrentLesson(lesson)}
                        className={`w-full p-5 text-left flex gap-4 border-b border-white/5 transition-all ${isActive ? 'bg-zinc-900 border-l-2 border-[#C9A66B]' : ''} ${!isUnlocked ? 'opacity-20' : 'hover:bg-zinc-900/50'}`}>
                        <div className="mt-1">{!isUnlocked ? <Lock size={12}/> : completedLessons.has(lesson.id) ? <CheckCircle size={14} className="text-green-500"/> : <Play size={14} className="text-zinc-600"/>}</div>
                        <div className="flex flex-col">
                            <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-zinc-500'}`}>{lesson.title}</span>
                            {!isUnlocked && <span className="text-[8px] text-[#C9A66B] font-bold uppercase mt-1">Bloqueada</span>}
                        </div>
                    </button>
                );
            })}
        </div>
      </div>
    </div>
  );
}
