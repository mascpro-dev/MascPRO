"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trophy, PlayCircle } from "lucide-react";

export default function AulaPlayerPage() {
  const supabase = createClientComponentClient();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [userCoins, setUserCoins] = useState(0);
  const [embedUrl, setEmbedUrl] = useState<string>("");

  useEffect(() => {
    // Carrega tudo ao abrir a página
    fetchData();
  }, []);

  // Atualiza o link do vídeo quando troca a aula
  useEffect(() => {
    if (currentLesson?.video_id) {
        // Limpeza BRUTA do ID (para garantir que funcione)
        let cleanId = currentLesson.video_id.trim();
        // Se for URL completa, pega só o ID
        if (cleanId.includes("v=")) cleanId = cleanId.split("v=")[1].split("&")[0];
        if (cleanId.includes("youtu.be/")) cleanId = cleanId.split("youtu.be/")[1].split("?")[0];
        // Corta para 11 caracteres (padrão YouTube) se estiver sujo
        if (cleanId.length > 11) cleanId = cleanId.substring(0, 11);

        console.log("📺 ID Gerado para o Iframe:", cleanId);
        setEmbedUrl(`https://www.youtube.com/embed/${cleanId}?autoplay=1&rel=0&modestbranding=1`);
    }
  }, [currentLesson]);

  async function fetchData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Busca Saldo (Soma direta para não ter erro)
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
            
        if (profile) {
            // Força a soma visual
            const total = (profile.personal_coins || 0) + (profile.network_coins || 0) + (profile.store_coins || 0);
            setUserCoins(total > 0 ? total : profile.coins); 
        }

        // 2. Busca Aulas (Sem filtros complexos)
        // Pega TODAS as aulas que tenham 'vendas' no código ou o código da URL
        const code = params?.code || 'MOD_VENDAS';
        const { data: aulas } = await supabase
            .from("lessons")
            .select("*")
            .or(`course_code.eq.${code},course_code.eq.MOD_VENDAS,course_code.ilike.%vendas%`)
            .order("sequence_order", { ascending: true });

        if (aulas && aulas.length > 0) {
            // Remove duplicatas (pelo título)
            const unicas = aulas.filter((aula, index, self) => 
                index === self.findIndex((t) => t.title === aula.title)
            );
            setLessons(unicas);
            setCurrentLesson(unicas[0]); // Seleciona a primeira
        }
    } catch (error) {
        console.error("Erro ao carregar:", error);
    } finally {
        setLoading(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando sistema...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* TOPO */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-[#C9A66B] transition-colors">
            <ArrowLeft size={20} /> <span className="font-bold text-sm">VOLTAR</span>
        </Link>
        <div className="flex items-center gap-2 bg-[#111] border border-[#333] px-3 py-1.5 rounded-full">
            <Trophy size={14} className="text-[#C9A66B]" />
            <span className="font-bold text-[#C9A66B] text-sm">{userCoins} PRO</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PLAYER DE VÍDEO (IFRAME NATIVO) */}
        <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-[#333] shadow-2xl relative">
                {embedUrl ? (
                    <iframe 
                        src={embedUrl} 
                        title="YouTube video player" 
                        className="w-full h-full absolute top-0 left-0"
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                    ></iframe>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                        Selecione uma aula
                    </div>
                )}
            </div>
            
            <div className="bg-[#111] p-4 rounded-xl border border-[#222]">
                <h1 className="text-xl font-bold text-white">{currentLesson?.title}</h1>
                <p className="text-gray-400 text-sm mt-2">{currentLesson?.description || "Sem descrição disponível."}</p>
            </div>
        </div>

        {/* LISTA DE AULAS */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 h-fit max-h-[600px] overflow-y-auto">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Conteúdo do Curso</h3>
            <div className="space-y-2">
                {lessons.map((aula, index) => (
                    <button 
                        key={aula.id} 
                        onClick={() => setCurrentLesson(aula)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border ${currentLesson?.id === aula.id ? "bg-[#C9A66B] text-black border-[#C9A66B]" : "bg-transparent text-gray-300 border-transparent hover:bg-white/5"}`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${currentLesson?.id === aula.id ? "bg-black text-[#C9A66B]" : "bg-[#222] text-gray-500"}`}>
                            {index + 1}
                        </div>
                        <span className="text-sm font-bold line-clamp-2">{aula.title}</span>
                        {currentLesson?.id === aula.id && <PlayCircle size={16} className="ml-auto" />}
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
