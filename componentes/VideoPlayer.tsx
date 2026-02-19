"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, RefreshCw, Volume2, VolumeX, Loader2, Maximize, Minimize } from "lucide-react";
import LessonButton from "./LessonButton";

// Formata segundos em 00:00
const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function VideoPlayer({ 
  title, 
  videoUrl, 
  lessonId, 
  onVideoEnded 
}: { 
  title: string, 
  videoUrl: string,
  lessonId?: string,
  onVideoEnded?: (lessonId: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasCalledOnEnded = useRef(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoId, setVideoId] = useState("");
  const [originUrl, setOriginUrl] = useState("");

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 1. Pega a URL do site para desbloquear a API do YouTube
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
  }, []);

  // 2. Extração do ID do YouTube
  useEffect(() => {
    if (videoUrl) {
      const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = videoUrl.match(regExp);
      if (match && match[1]) {
        setVideoId(match[1]);
      } else if (videoUrl.length === 11) {
        setVideoId(videoUrl);
      }
    }
  }, [videoUrl]);

  // 3. Loop para atualizar o tempo (Polling)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        // Envia pergunta: "Qual o tempo agora?" e "Qual a duração?"
        // O YouTube responde via postMessage (infoDelivery)
        if (iframeRef.current && iframeRef.current.contentWindow) {
             iframeRef.current.contentWindow.postMessage('{"event":"listening","func":"onStateChange","args":""}', '*');
             iframeRef.current.contentWindow.postMessage('{"event":"command","func":"getCurrentTime","args":""}', '*');
             iframeRef.current.contentWindow.postMessage('{"event":"command","func":"getDuration","args":""}', '*');
        }
      }, 500); // Verifica a cada meio segundo para ficar mais fluido
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 4. Escuta as respostas do YouTube
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "string") return;

      try {
        const data = JSON.parse(event.data);
        
        // O YouTube manda as respostas como "infoDelivery"
        if (data.event === "infoDelivery" && data.info) {
             if (data.info.currentTime) setCurrentTime(data.info.currentTime);
             if (data.info.duration) setDuration(data.info.duration);
             
             // Se o vídeo estiver muito perto do fim (99%), marca como finalizado
             if (data.info.currentTime && data.info.duration) {
                 if (data.info.currentTime > data.info.duration - 2) {
                     setIsFinished(true);
                 }
             }
        }
        
        // Detecta quando o vídeo termina (onStateChange com estado ENDED = 0)
        if (data.event === "onStateChange" && data.info === 0) {
            setIsFinished(true);
        }
      } catch (e) {
        // Ignora lixo
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // 5. Chama onVideoEnded quando o vídeo termina (O PULO DO GATO ESTÁ AQUI)
  useEffect(() => {
    if (isFinished && lessonId && onVideoEnded && !hasCalledOnEnded.current) {
      hasCalledOnEnded.current = true;
      onVideoEnded(lessonId);
    }
  }, [isFinished, lessonId, onVideoEnded]);

  // Reset quando muda o vídeo
  useEffect(() => {
    hasCalledOnEnded.current = false;
    setIsFinished(false);
  }, [videoId]);

  const sendCommand = (command: string, args: any = null) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: command,
          args: args || []
        }),
        "*"
      );
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      sendCommand("pauseVideo");
      setIsPlaying(false);
    } else {
      sendCommand("playVideo");
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted) {
      sendCommand("unMute");
      setIsMuted(false);
    } else {
      sendCommand("mute");
      setIsMuted(true);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div onContextMenu={(e) => e.preventDefault()} className="select-none">
        
        <div 
            ref={containerRef} 
            className="relative w-full aspect-video bg-black border-b lg:border border-white/10 lg:rounded-b-2xl overflow-hidden group shadow-2xl"
        >
            <div className="absolute inset-0 pointer-events-none origin-center"> 
                {videoId && originUrl ? (
                    <iframe
                        ref={iframeRef}
                        width="100%"
                        height="100%"
                        // AQUI ESTÁ A CORREÇÃO: Adicionado &origin=${originUrl}
                        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${originUrl}&autoplay=0&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1&cc_load_policy=0`}
                        title="Aula MASC PRO"
                        allow="autoplay; encrypted-media"
                        className="w-full h-full object-cover"
                    ></iframe>
                ) : (
                    <div className="flex items-center justify-center h-full text-white gap-2">
                        <Loader2 className="animate-spin" /> Carregando...
                    </div>
                )}
            </div>

            <div 
                className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center bg-transparent"
                onClick={togglePlay}
            >
                {!isPlaying && (
                    <div className="w-24 h-24 bg-[#C9A66B]/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(201,166,107,0.5)] transition-transform hover:scale-110">
                        <Play fill="black" className="ml-2 text-black" size={40} />
                    </div>
                )}
            </div>

            <div className={`absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20 transition-opacity duration-300 flex flex-col justify-end px-4 pb-4 pt-8 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                
                {/* BARRA DE PROGRESSO */}
                <div className="w-full h-1 bg-white/20 rounded-full mb-4 relative overflow-hidden">
                    <div 
                        className="h-full bg-[#C9A66B] absolute top-0 left-0 transition-all duration-500 ease-linear"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="text-white hover:text-[#C9A66B] transition-colors">
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                        </button>

                        <button onClick={toggleMute} className="text-white hover:text-[#C9A66B] transition-colors">
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        
                        <span className="text-xs font-mono font-bold text-white/90">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-[#C9A66B] font-black italic text-sm tracking-tighter hidden sm:block">
                            MASC <span className="text-white">PRO</span>
                        </div>
                        <button onClick={toggleFullscreen} className="text-white hover:text-[#C9A66B] transition-colors">
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {!isPlaying && !iframeRef.current && videoId && (
                 <div 
                    className="absolute inset-0 z-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(https://img.youtube.com/vi/${videoId}/maxresdefault.jpg)` }}
                />
            )}
        </div>

        <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-wrap items-center gap-4">
                <LessonButton amount={50} locked={!isFinished} />
                
                {isFinished && (
                    <button 
                        onClick={() => {
                            setIsPlaying(true);
                            sendCommand("seekTo", 0);
                            sendCommand("playVideo");
                        }} 
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/5"
                    >
                        <RefreshCw size={18} /> Replay
                    </button>
                )}
            </div>

            <div className="prose prose-invert max-w-none border-t border-white/10 pt-6">
                <h3 className="text-xl font-bold text-white mb-2">Sobre esta aula</h3>
                <p className="text-slate-400 leading-relaxed">
                   Conteúdo Exclusivo MASC PRO.
                </p>
            </div>
        </div>
    </div>
  );
}