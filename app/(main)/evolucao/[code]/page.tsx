"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import { ArrowLeft, Play, Loader2, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import Link from "next/link";

export default function AulaPlayerPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  const courseCode = params?.code as string;

  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Timer
  const [secondsWatched, setSecondsWatched] = useState(0);
  
  // Controles do Player Customizado
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerContainer, setPlayerContainer] = useState<HTMLDivElement | null>(null);
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
  
  // Tempo do Vídeo
  const [currentTime, setCurrentTime] = useState(0); // Tempo atual em segundos
  const [duration, setDuration] = useState(0); // Duração total em segundos

  useEffect(() => {
    async function fetchLessons() {
      try {
        setLoading(true);
        // Busca aulas (insensível a maiúsculas/minúsculas)
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

    if (courseCode) fetchLessons();
  }, [courseCode, supabase]);

  // Timer de Recompensa e Atualização de Tempo do Vídeo
  useEffect(() => {
    if (!currentLesson) return;
    const interval = setInterval(() => {
      setSecondsWatched((prev) => {
        const novo = prev + 1;
        if (novo > 0 && novo % 900 === 0) pagarRecompensa(); // 15 min
        return novo;
      });
      
      // Atualiza tempo atual do vídeo
      if (youtubePlayer) {
        try {
          const currentTime = youtubePlayer.getCurrentTime();
          if (currentTime && !isNaN(currentTime)) {
            setCurrentTime(currentTime);
          }
        } catch (e) {
          // Ignora erros se o player não estiver pronto
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentLesson, youtubePlayer]);

  // Carrega API do YouTube IFrame
  useEffect(() => {
    if (!currentLesson) return;

    // Reseta tempo quando muda de vídeo
    setCurrentTime(0);
    setDuration(0);

    // Carrega script do YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Inicializa player quando API estiver pronta
    (window as any).onYouTubeIframeAPIReady = () => {
      const player = new (window as any).YT.Player(`youtube-player-${currentLesson.id}`, {
        videoId: currentLesson.video_id,
        playerVars: {
          autoplay: 1,
          mute: 1,
          modestbranding: 1,
          rel: 0,
          controls: 0, // Desabilita controles do YouTube
          showinfo: 0,
          fs: 0, // Desabilita fullscreen do YouTube
          iv_load_policy: 3,
          disablekb: 1,
          cc_load_policy: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            setYoutubePlayer(event.target);
            const duration = event.target.getDuration();
            setDuration(duration);
            setCurrentTime(0);
            event.target.playVideo();
          },
          onStateChange: (event: any) => {
            // Atualiza duração quando o vídeo está pronto
            if (event.data === (window as any).YT.PlayerState.PLAYING) {
              const duration = event.target.getDuration();
              if (duration) setDuration(duration);
            }
          },
        },
      });
    };

    return () => {
      if ((window as any).onYouTubeIframeAPIReady) {
        delete (window as any).onYouTubeIframeAPIReady;
      }
    };
  }, [currentLesson]);

  // Função para alternar mute/unmute
  const toggleMute = () => {
    if (youtubePlayer) {
      if (isMuted) {
        youtubePlayer.unMute();
        youtubePlayer.setVolume(50); // Volume padrão 50%
      } else {
        youtubePlayer.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  // Função para entrar/sair do fullscreen
  const toggleFullscreen = () => {
    if (!playerContainer) return;

    if (!isFullscreen) {
      // Entrar em fullscreen
      if (playerContainer.requestFullscreen) {
        playerContainer.requestFullscreen();
      } else if ((playerContainer as any).webkitRequestFullscreen) {
        (playerContainer as any).webkitRequestFullscreen();
      } else if ((playerContainer as any).mozRequestFullScreen) {
        (playerContainer as any).mozRequestFullScreen();
      } else if ((playerContainer as any).msRequestFullscreen) {
        (playerContainer as any).msRequestFullscreen();
      }
    } else {
      // Sair do fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  // Detecta mudanças no fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      ));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // PROTEÇÕES ANTI-COMPARTILHAMENTO E BLOQUEIO DE ACESSO EXTERNO
  useEffect(() => {
    // Bloqueia botão direito
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Bloqueia teclas de atalho (F12, Ctrl+Shift+I, Ctrl+U, etc)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
        e.preventDefault();
        return false;
      }
      if (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'p')) {
        e.preventDefault();
        return false;
      }
    };

    // Bloqueia seleção de texto
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Bloqueia drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Bloqueia copy
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Adiciona listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('copy', handleCopy);

    // Limpa listeners ao desmontar
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('copy', handleCopy);
    };
  }, []);

  async function pagarRecompensa() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.rpc('reward_watch_time', { user_id: user.id });
      console.log("💰 +50 PRO Pagos!");
    }
  }

  // Função para formatar tempo (segundos -> MM:SS)
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">
      <Loader2 className="w-8 h-8 animate-spin text-[#C9A66B]" />
    </div>
  );

  if (!currentLesson) return (
    <div className="min-h-screen bg-[#0A0A0A] p-10 text-white text-center">
        <h2 className="text-xl font-bold mb-2">Nenhuma aula encontrada.</h2>
        <Link href="/evolucao" className="text-[#C9A66B] hover:underline">Voltar</Link>
    </div>
  );

  return (
    <div 
      className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      
      {/* Topo */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-sm tracking-wide">VOLTAR</span>
        </Link>
        <div className="bg-[#C9A66B]/10 text-[#C9A66B] border border-[#C9A66B]/30 px-4 py-1.5 rounded text-xs font-bold tracking-widest animate-pulse">
          VALENDO 50 PRO
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ÁREA DO PLAYER */}
        <div className="lg:col-span-2 space-y-4">
          <div 
            ref={setPlayerContainer}
            className="relative aspect-video bg-black rounded-xl overflow-hidden border border-[#222] shadow-2xl shadow-black group select-none"
          >
            
            {/* --- MÁSCARA: BLOQUEIA LOGO DO YOUTUBE --- */}
            {/* Bloqueia apenas o logo do YouTube no canto inferior esquerdo */}
            <div 
              className="absolute left-0 bottom-0 w-32 h-20 z-25 bg-transparent"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            />

            {/* IFRAME DO YOUTUBE (sem controles) */}
            <div 
              id={`youtube-player-${currentLesson.id}`}
              className="w-full h-full"
            />

            {/* CONTROLES CUSTOMIZADOS DO PLAYER */}
            <div className="absolute bottom-4 right-4 z-30 flex items-center gap-3">
              
              {/* Botão de Volume */}
              <button
                onClick={toggleMute}
                className="bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-full p-2.5 transition-all hover:scale-110 border border-white/10"
                title={isMuted ? "Ativar som" : "Desativar som"}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Botão de Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-full p-2.5 transition-all hover:scale-110 border border-white/10"
                title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-white" />
                ) : (
                  <Maximize className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">{currentLesson.title}</h1>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <p className="text-gray-500 text-sm">
                    Tempo estudado: <span className="text-[#C9A66B] font-bold">{Math.floor(secondsWatched / 60)} min</span>
                  </p>
                  {duration > 0 && (
                    <>
                      <span className="text-gray-600">•</span>
                      <p className="text-gray-500 text-sm">
                        Assistido: <span className="text-white font-bold">{formatTime(currentTime)}</span> / <span className="text-gray-400">{formatTime(duration)}</span>
                      </p>
                      <span className="text-gray-600">•</span>
                      <p className="text-gray-500 text-sm">
                        Restante: <span className="text-[#C9A66B] font-bold">{formatTime(Math.max(0, duration - currentTime))}</span>
                      </p>
                    </>
                  )}
                </div>
            </div>
          </div>
        </div>

        {/* LISTA LATERAL */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-5 h-fit">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">
            Neste Módulo
          </h3>
          <div className="space-y-3">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === currentLesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setCurrentLesson(lesson);
                    setSecondsWatched(0);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all border ${
                    isActive 
                      ? "bg-[#C9A66B]/10 border-[#C9A66B]/40" 
                      : "bg-transparent border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isActive ? "bg-[#C9A66B] text-black" : "bg-[#222] text-gray-500"
                  }`}>
                    {isActive ? <Play size={10} fill="currentColor" /> : index + 1}
                  </div>
                  <p className={`text-sm font-bold leading-tight ${isActive ? "text-white" : "text-gray-400"}`}>
                    {lesson.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
