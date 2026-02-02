"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trophy, PlayCircle, CheckCircle, Lock } from "lucide-react";
import "plyr/dist/plyr.css";

export default function AulaPlayerPage() {
  const supabase = createClientComponentClient();
  const params = useParams();
  const playerInstance = useRef<any>(null);

  // Estados
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [userCoins, setUserCoins] = useState(0); // Saldo
  const [videoUrl, setVideoUrl] = useState<string>(""); 

  useEffect(() => {
    loadData();
  }, []);

  // 1. CARREGAR DADOS (FORÇANDO ATUALIZAÇÃO)
  async function loadData() {
    console.log("🔄 Recarregando dados da página...");
    
    // Pega o usuário
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // A. BUSCA SALDO ATUALIZADO (Correção do valor errado)
    const { data: profile } = await supabase
      .from("profiles")
      .select("coins, personal_coins, network_coins, store_coins") // Pega tudo para garantir
      .eq("id", user.id)
      .single();

    if (profile) {
        console.log("💰 Saldo encontrado:", profile.coins);
        // Se o total for zero mas tiver parciais, soma aqui no front para garantir
        const totalReal = profile.coins || (profile.personal_coins + profile.network_coins + profile.store_coins);
        setUserCoins(totalReal);
    }

    // B. BUSCA AS AULAS (Correção do vídeo)
    // Buscamos pelo curso 'MOD_VENDAS' explicitamente se o param falhar, ou pelo param
    const courseCode = params?.code || 'MOD_VENDAS';
    
    const { data: aulas, error } = await supabase
      .from("lessons")
      .select("*")
      .or(`course_code.eq.${courseCode},course_code.eq.MOD_VENDAS`) // Tenta os dois
      .order("sequence_order", { ascending: true });

    if (aulas && aulas.length > 0) {
        console.log("📚 Aulas carregadas:", aulas.length);
        // Remove duplicatas visualmente se o banco ainda tiver sujeira
        const uniqueAulas = aulas.filter((v,i,a)=>a.findIndex(t=>(t.title===v.title))===i);
        
        setLessons(uniqueAulas);
        setCurrentLesson(uniqueAulas[0]); // Começa na primeira
    } else {
        console.error("❌ Nenhuma aula encontrada!", error);
    }
    setLoading(false);
  }

  // 2. CONFIGURAR O PLAYER DE VÍDEO
  useEffect(() => {
    if (!currentLesson?.video_id) return;

    // LIMPEZA DE ID BRUTA (Garante que funcione mesmo com lixo)
    // Se vier url completa, pega só o ID. Se vier ID sujo, limpa.
    let cleanId = currentLesson.video_id.trim();
    if (cleanId.includes("v=")) cleanId = cleanId.split("v=")[1].substring(0, 11);
    else if (cleanId.length > 11) cleanId = cleanId.substring(0, 11); // Corta excesso

    console.log("🎥 ID do Vídeo limpo:", cleanId);
    setVideoUrl(cleanId);

    // Destroi player anterior
    if (playerInstance.current) {
        try { playerInstance.current.destroy(); } catch(e) {}
    }

    // Inicia Plyr
    const startPlayer = async () => {
        const Plyr = (await import("plyr")).default;
        const newPlayer = new Plyr("#player-target", {
            youtube: { noCookie: true, rel: 0, showinfo: 0, modestbranding: 1 }
        });
        
        newPlayer.source = {
            type: 'video',
            sources: [{ src: cleanId, provider: 'youtube' }]
        };
        
        playerInstance.current = newPlayer;
    };

    startPlayer();

    return () => {
        if (playerInstance.current) {
            try { playerInstance.current.destroy(); } catch(e) {}
        }
    };
  }, [currentLesson?.video_id]); 


  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-[#C9A66B]" /></div>;

  if (!currentLesson && lessons.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Nenhuma aula encontrada</h2>
          <p className="text-gray-400 mb-4">Não há aulas disponíveis para este curso.</p>
          <Link href="/evolucao" className="inline-flex items-center gap-2 text-[#C9A66B] hover:text-[#b08d55] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Evolução
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 pb-20">
      <style jsx global>{` :root { --plyr-color-main: #C9A66B; } .plyr--full-ui input[type=range] { color: #C9A66B; } .plyr__control--overlaid { background: rgba(201, 166, 107, 0.9); } .plyr--video { border-radius: 12px; overflow: hidden; border: 1px solid #333; } .plyr__video-embed iframe { pointer-events: none; } `}</style>

      {/* TOPO */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-sm tracking-wide">VOLTAR</span>
        </Link>
        <div className="bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-lg flex items-center gap-2">
          <Trophy size={14} className="text-[#C9A66B]" />
          <span className="font-bold text-[#C9A66B] text-xs">{userCoins} <span className="text-gray-500 font-normal">PRO</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* PLAYER */}
          <div className="aspect-video bg-black rounded-xl shadow-2xl shadow-black relative z-10">
            <div key={currentLesson?.id || 'loading'} className="plyr__video-embed w-full h-full" id="player-target"></div>
          </div>

          {/* INFO DA AULA */}
          {currentLesson && (
            <div className="bg-[#111] border border-[#222] rounded-lg p-4">
              <h1 className="text-lg font-bold text-white mb-2">{currentLesson.title}</h1>
              <p className="text-gray-400 text-xs leading-relaxed">{currentLesson.description || "Assista a aula completa."}</p>
            </div>
          )}
        </div>

        {/* LISTA DE AULAS */}
        <div className="bg-[#111] border border-[#222] rounded-lg p-5 h-fit relative z-10">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Trilha do Módulo</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === currentLesson?.id;
              return (
                <button 
                  key={lesson.id} 
                  onClick={() => setCurrentLesson(lesson)} 
                  className={`w-full flex items-center gap-3 p-3 rounded text-left transition-all border ${isActive ? "bg-[#C9A66B]/10 border-[#C9A66B]/30" : "hover:bg-white/5 border-transparent"}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isActive ? "bg-[#C9A66B] text-black" : "bg-[#222] text-gray-500"}`}>
                    {isActive ? <PlayCircle size={12} /> : index + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-bold leading-tight ${isActive ? "text-white" : "text-gray-400"}`}>{lesson.title}</p>
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
