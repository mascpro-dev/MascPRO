"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, Play, Lock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function AulaPlayerPage() {
  const params = useParams(); // Pega o parametro [code] da URL
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const courseCode = params?.code as string; // Ex: MOD_C1-BLONDE

  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Timer States
  const [watchTime, setWatchTime] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Carrega as Aulas do Módulo
  useEffect(() => {
    async function fetchLessons() {
      if (!courseCode) return;

      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_code", courseCode)
        .order("sequence_order", { ascending: true });

      if (data && data.length > 0) {
        setLessons(data);
        setCurrentLesson(data[0]); // Começa na primeira aula
      }
      setLoading(false);
    }
    fetchLessons();
  }, [courseCode, supabase]);

  // 2. O Relógio de Lucro (A cada 15 min / 900s)
  useEffect(() => {
    // Só conta se tiver uma aula carregada
    if (!currentLesson) return;

    timerRef.current = setInterval(async () => {
      setWatchTime((prev) => {
        const novoTempo = prev + 1;
        
        // Se bateu 900 segundos (15 min)
        if (novoTempo > 0 && novoTempo % 900 === 0) {
          pagarRecompensa();
        }
        return novoTempo;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentLesson]);

  async function pagarRecompensa() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Chama a função do banco que paga você e o padrinho
    const { error } = await supabase.rpc('reward_watch_time', { user_id: user.id });

    if (!error) {
      // Mostrar toast dourado
      setShowToast(true);
      
      // Remove após 5 segundos
      setTimeout(() => {
        setShowToast(false);
      }, 5000);
    }
  }

  if (loading) return <div className="p-10 text-white">Carregando aulas...</div>;
  if (!currentLesson) return <div className="p-10 text-white">Nenhuma aula encontrada neste módulo.</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8">
      {/* Topo */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium text-sm">VOLTAR</span>
        </Link>
        <div className="bg-[#C9A66B]/20 text-[#C9A66B] px-4 py-1.5 rounded text-xs font-bold border border-[#C9A66B]/30 tracking-wider">
          VALENDO 50 PRO / 15 MIN
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Área do Vídeo (70% no Desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-[#222] shadow-2xl shadow-black">
            
            {/* Máscara de Proteção (Impede clique no título) */}
            <div className="absolute inset-x-0 top-0 h-20 z-20 bg-transparent" />
            
            {/* Iframe Youtube Limpo */}
            <iframe 
              src={`https://www.youtube.com/embed/${currentLesson.video_id}?modestbranding=1&rel=0&controls=1&showinfo=0&fs=0&iv_load_policy=3`}
              title="MASC PRO Player"
              className="w-full h-full object-cover"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen={false} // Desabilita Fullscreen para evitar fuga
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold">{currentLesson.title}</h1>
            <p className="text-gray-500 text-sm mt-1">Conteúdo Exclusivo MASC PRO • Módulo {courseCode}</p>
          </div>
        </div>

        {/* Lista Lateral (30%) */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 h-fit">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Neste Módulo</h3>
          
          <div className="space-y-2">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === currentLesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setCurrentLesson(lesson);
                    setWatchTime(0); // Reinicia contador ao mudar aula (opcional)
                  }}
                  className={`w-full flex items-center gap-4 p-3 rounded-lg text-left transition-all ${
                    isActive 
                      ? "bg-[#C9A66B]/10 border border-[#C9A66B]/30" 
                      : "bg-transparent hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive ? "bg-[#C9A66B] text-black" : "bg-[#222] text-gray-400"
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isActive ? "text-white" : "text-gray-400"}`}>
                      {lesson.title}
                    </p>
                    {isActive && (
                      <span className="text-[10px] text-[#C9A66B] animate-pulse">Assistindo agora</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toast/Notificação Dourada */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-gradient-to-r from-[#C9A66B] to-[#D4B87A] text-black rounded-xl px-6 py-4 shadow-2xl border-2 border-[#C9A66B] flex items-center gap-3 min-w-[300px]">
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-bold text-sm">+50 PRO creditados! Continue assistindo para ganhar mais.</p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="ml-auto text-black/60 hover:text-black text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
