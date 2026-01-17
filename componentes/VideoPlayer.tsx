"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, RefreshCw, Volume2, VolumeX, Loader2 } from "lucide-react";
import LessonButton from "./LessonButton";

export default function VideoPlayer({ title, videoUrl }: { title: string, videoUrl: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoId, setVideoId] = useState("");

  // 1. Extração do ID
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

  // 2. O COMANDANTE (Envia ordens para o YouTube sem tocar nele)
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
      
      // Lógica da Recompensa
      if (!isFinished) {
        setTimeout(() => {
          setIsFinished(true);
        }, 15000); // 15 segundos para liberar
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation(); // Não pausa o vídeo ao clicar no mute
    if (isMuted) {
      sendCommand("unMute");
      setIsMuted(false);
    } else {
      sendCommand("mute");
      setIsMuted(true);
    }
  };

  return (
    // Bloqueia menu de contexto (Botão direito)
    <div onContextMenu={(e) => e.preventDefault()} className="select-none">
        
        {/* ÁREA DO VÍDEO */}
        <div className="relative w-full aspect-video bg-black border-b lg:border border-white/10 lg:rounded-b-2xl overflow-hidden group shadow-2xl">
            
            {/* IFRAME DO YOUTUBE (TOTALMENTE BLOQUEADO PARA O MOUSE) */}
            <div className="absolute inset-0 pointer-events-none scale-[1.35] origin-center"> 
            {/* O scale 1.35 dá um zoom para cortar qualquer borda preta ou logo teimoso nas laterais */}
                {videoId ? (
                    <iframe
                        ref={iframeRef}
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1`}
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

            {/* --- PAREDE DE VIDRO (Interação Personalizada) --- */}
            {/* O usuário clica AQUI, e não no YouTube. Isso controla o Play/Pause */}
            <div 
                className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center bg-transparent"
                onClick={togglePlay}
            >
                {/* Ícone Gigante de Play/Pause (Só aparece quando mexe ou está pausado) */}
                {!isPlaying && (
                    <div className="w-24 h-24 bg-[#C9A66B]/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(201,166,107,0.5)] transition-transform hover:scale-110">
                        <Play fill="black" className="ml-2 text-black" size={40} />
                    </div>
                )}
            </div>

            {/* --- BARRA DE CONTROLES PERSONALIZADA (Rodapé) --- */}
            <div className={`absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent z-20 flex items-center justify-between transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                
                <div className="flex items-center gap-4">
                    {/* Botão Play/Pause Pequeno */}
                    <button onClick={togglePlay} className="text-white hover:text-[#C9A66B] transition-colors">
                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                    </button>

                    {/* Botão Mute */}
                    <button onClick={toggleMute} className="text-white hover:text-[#C9A66B] transition-colors">
                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                    
                    <span className="text-xs font-bold text-white/70 uppercase tracking-widest">
                        {isPlaying ? "Reproduzindo" : "Pausado"}
                    </span>
                </div>

                {/* Logo da Sua Marca (Canto direito) - Substitui o logo do YouTube */}
                <div className="text-[#C9A66B] font-black italic text-sm tracking-tighter">
                    MASC <span className="text-white">PRO</span>
                </div>
            </div>

            {/* CAPA (Aparece antes de dar o primeiro play para carregar bonito) */}
            {!isPlaying && !iframeRef.current && videoId && (
                 <div 
                    className="absolute inset-0 z-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(https://img.youtube.com/vi/${videoId}/maxresdefault.jpg)` }}
                />
            )}
        </div>

        {/* CONTROLES E BOTÃO DE RESGATE */}
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