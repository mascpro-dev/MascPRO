"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ArrowLeft, Clock, Loader2, PlayCircle } from "lucide-react"
import XPModal from "@/components/xp-modal"

export default function CoursePlayerPage() {
  const router = useRouter()
  const { id } = useParams()
  const supabase = createClientComponentClient()

  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [secondsActive, setSecondsActive] = useState(0)
  const [showXPModal, setShowXPModal] = useState(false)
  const [xpGanho, setXpGanho] = useState(0)

  // 🛠️ FUNÇÃO MÁGICA: Converte qualquer link do YouTube para Embed Profissional
  const formatYoutubeUrl = (url: string) => {
    if (!url) return null;
    
    let videoId = "";
    if (url.includes("v=")) {
      videoId = url.split("v=")[1].split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    } else if (url.includes("embed/")) {
      videoId = url.split("embed/")[1].split("?")[0];
    }

    // Parâmetros: 
    // rel=0 (não mostra vídeos de outros canais no fim)
    // modestbranding=1 (esconde logo do YT)
    // showinfo=0 (esconde título e uploader)
    // controls=1 (mantém controles para o aluno)
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&color=white`;
  }

  useEffect(() => {
    const fetchCourse = async () => {
      const { data } = await supabase
        .from('Course')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) setCourse(data)
      setLoading(false)
    }
    fetchCourse()
  }, [id, supabase])

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsActive((prev) => prev + 1)
    }, 1000)

    if (secondsActive >= 900) {
      adicionarXPAtividade()
      setSecondsActive(0)
    }

    return () => clearInterval(interval)
  }, [secondsActive])

  const adicionarXPAtividade = async () => {
    try {
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tipo_usuario, xp')
        .eq('id', user.id)
        .single()

      let valorBase = 100 
      let multiplicador = 0.2 

      if (profile?.tipo_usuario === 'embaixador') multiplicador = 0.5
      if (profile?.tipo_usuario === 'cabeleireiro') multiplicador = 0.3

      const totalAdicionar = Math.floor(valorBase * multiplicador)

      await supabase
        .from('profiles')
        .update({ xp: (profile?.xp || 0) + totalAdicionar })
        .eq('id', user.id)

      setXpGanho(totalAdicionar)
      setShowXPModal(true)
    } catch (error) {
      console.error("Erro ao processar XP:", error)
    }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  )

  const finalVideoUrl = formatYoutubeUrl(course?.videoUrl);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 max-w-6xl mx-auto space-y-6 font-sans">
      
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all font-bold group"
      >
        <div className="p-2 bg-white rounded-full border shadow-sm group-hover:shadow-md transition-shadow">
          <ArrowLeft size={20} />
        </div>
        Voltar para Academy
      </button>

      {/* PLAYER DE VÍDEO PROFISSIONAL */}
      <div className="bg-black rounded-[40px] overflow-hidden shadow-2xl aspect-video relative border-[6px] border-white ring-1 ring-slate-200">
        {finalVideoUrl ? (
          <iframe 
            src={finalVideoUrl} 
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white gap-4 bg-slate-900">
            <PlayCircle size={64} className="text-slate-700 animate-pulse" />
            <p className="font-bold text-slate-500 uppercase tracking-widest text-xs">Aguardando vídeo...</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
             <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full uppercase tracking-tighter">Masc Academy</span>
             <span className="text-slate-300">•</span>
             <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aula {course?.id}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
            {course?.title || "Aula em Processamento"}
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed font-medium">
            {course?.description || "Prepare-se para transformar sua carreira com este conteúdo exclusivo da Masc PRO."}
          </p>
        </div>

        {/* CARD DO CRONÔMETRO */}
        <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={80} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8 text-blue-400">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Clock size={20} />
              </div>
              <span className="font-black text-[10px] uppercase tracking-[0.2em]">Foco na Atividade</span>
            </div>
            
            <div className="text-5xl font-black mb-1 font-mono tracking-tighter">
              {Math.floor((900 - secondsActive) / 60)}:
              {String((900 - secondsActive) % 60).padStart(2, '0')}
            </div>
            
            <p className="text-slate-500 text-[10px] font-bold mb-8 uppercase tracking-widest italic">
              Para liberar seus pontos
            </p>

            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden p-[3px] border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.3)]" 
                style={{ width: `${(secondsActive / 900) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <XPModal 
        amount={xpGanho} 
        visible={showXPModal} 
        onClose={() => setShowXPModal(false)} 
      />
    </div>
  )
}