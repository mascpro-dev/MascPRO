"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import { ArrowLeft, Play, Lock, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AulaPlayerPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  const courseCode = params?.code as string;

  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Timer e Controle
  const [secondsWatched, setSecondsWatched] = useState(0);

  useEffect(() => {
    async function fetchLessons() {
      try {
        setLoading(true);
        // Busca as aulas ignorando maiúsculas/minúsculas no código
        const { data, error } = await supabase
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

  // Lógica do Timer (Moedas)
  useEffect(() => {
    if (!currentLesson) return;
    const interval = setInterval(() => {
      setSecondsWatched((prev) => {
        const novo = prev + 1;
        if (novo > 0 && novo % 900 === 0) pagarRecompensa(); // 15 min
        return novo;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentLesson]);

  // PROTEÇÕES ANTI-COMPARTILHAMENTO
  useEffect(() => {
    // Bloqueia botão direito
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Bloqueia teclas de atalho (F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, etc)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      // Ctrl+S (Save)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
      // Ctrl+P (Print)
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+C (Inspect)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
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
      // Feedback visual simples ou use toast se tiver
      console.log("💰 +50 PRO Pagos!");
    }
  }

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
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-[#222] shadow-2xl shadow-black group select-none">
            
            {/* --- MÁSCARAS DE PROTEÇÃO AGRESSIVAS --- */}
            {/* Máscara completa cobrindo toda a área (bloqueia cliques) */}
            <div 
              className="absolute inset-0 z-30 bg-transparent cursor-default"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              style={{ pointerEvents: 'none' }}
            />
            
            {/* Máscara no topo (bloqueia título e logo YouTube) */}
            <div 
              className="absolute inset-x-0 top-0 h-20 z-25 bg-transparent"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Máscara no canto inferior direito (bloqueia logo YouTube) */}
            <div 
              className="absolute right-0 bottom-0 w-32 h-20 z-25 bg-transparent"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Máscara lateral direita (bloqueia botões de compartilhar) */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-16 z-25 bg-transparent"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            />

            {/* IFRAME DO YOUTUBE - MÁXIMA PRIVACIDADE */}
            {/* Parâmetros para esconder completamente o YouTube */}
            <iframe 
              src={`https://www.youtube.com/embed/${currentLesson.video_id}?autoplay=1&mute=1&modestbranding=1&rel=0&controls=1&showinfo=0&fs=0&iv_load_policy=3&disablekb=1&cc_load_policy=0&playsinline=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
              title="Player MASC PRO"
              className="w-full h-full object-cover pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen={false}
              sandbox="allow-scripts allow-same-origin allow-presentation"
              style={{ 
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            />
          </div>

          <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold text-white">{currentLesson.title}</h1>
                <p className="text-gray-500 text-sm mt-1">
                Tempo estudado: <span className="text-[#C9A66B] font-bold">{Math.floor(secondsWatched / 60)} min</span>
                </p>
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
