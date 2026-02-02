"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trophy, PlayCircle, Download, Send, CheckCircle } from "lucide-react";
import "plyr/dist/plyr.css"; // Importante para as máscaras

// Função de limpeza de ID (A mesma que salvou a gente)
const getCleanVideoId = (url: string) => {
    if (!url) return "";
    let clean = url.trim();
    if (clean.includes("v=")) clean = clean.split("v=")[1].split("&")[0];
    if (clean.includes("youtu.be/")) clean = clean.split("youtu.be/")[1].split("?")[0];
    if (clean.length > 11) clean = clean.substring(0, 11);
    return clean;
};

export default function AulaPlayerPage() {
  const supabase = createClientComponentClient();
  const params = useParams();
  const playerRef = useRef<any>(null);

  // Estados
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [userCoins, setUserCoins] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info');
  
  // Comentários
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Progresso
  const [savedTime, setSavedTime] = useState(0);

  useEffect(() => { loadData(); }, []);

  // CONFIGURAÇÃO DO PLAYER (PLYR)
  useEffect(() => {
    if (!currentLesson?.video_id) return;

    const videoId = getCleanVideoId(currentLesson.video_id);
    console.log("🎬 Iniciando Player com ID:", videoId);

    // Destroi anterior se existir
    if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
    }

    const initPlayer = async () => {
        const Plyr = (await import("plyr")).default;
        
        // Configuração visual (Máscaras)
        const player = new Plyr("#player-target", {
            youtube: { noCookie: true, rel: 0, showinfo: 0, modestbranding: 1 },
            controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
        });

        player.source = {
            type: 'video',
            sources: [{ src: videoId, provider: 'youtube' }]
        };

        // EVENTO: Quando o player estiver pronto
        player.on('ready', () => {
            // Se tiver tempo salvo, pula para ele (Memória)
            if (savedTime > 0) {
                console.log("⏩ Restaurando memória:", savedTime);
                player.currentTime = savedTime;
            }
        });

        // EVENTO: Atualiza progresso a cada 5 segundos (Para não sobrecarregar)
        let lastSave = 0;
        player.on('timeupdate', async () => {
            const now = Date.now();
            if (now - lastSave > 5000 && player.currentTime > 0) {
                lastSave = now;
                saveProgress(player.currentTime);
            }
        });

        // EVENTO: Aula concluída
        player.on('ended', () => {
             markAsCompleted();
        });

        playerRef.current = player;
    };

    // Pequeno delay para garantir que a DIV renderizou
    setTimeout(initPlayer, 100);

    // Busca comentários e progresso específico desta aula
    fetchLessonDetails(currentLesson.id);

  }, [currentLesson]);

  // CARREGAR DADOS GERAIS
  async function loadData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Saldo
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile) setUserCoins(profile.coins || (profile.personal_coins + profile.network_coins + profile.store_coins) || 0);

        // 2. Aulas
        const code = params?.code || 'MOD_VENDAS';
        const { data: aulas } = await supabase
            .from("lessons")
            .select("*")
            .or(`course_code.eq.${code},course_code.eq.MOD_VENDAS`)
            .order("sequence_order", { ascending: true });

        if (aulas?.length) {
            // Remove duplicatas
            const unicas = aulas.filter((v,i,a)=>a.findIndex(t=>(t.title===v.title))===i);
            setLessons(unicas);
            setCurrentLesson(unicas[0]);
        }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  // BUSCAR DETALHES (Comentários + Memória)
  async function fetchLessonDetails(lessonId: string) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Comentários
      const { data: coms } = await supabase
        .from("lesson_comments")
        .select(`*, profiles(full_name, avatar_url)`)
        .eq("lesson_id", lessonId)
        .order('created_at', { ascending: false });
      setComments(coms || []);

      // Memória (Onde parou?)
      const { data: progress } = await supabase
        .from("lesson_progress")
        .select("current_time, completed")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .single();
      
      if (progress) {
          setSavedTime(progress.current_time || 0);
      } else {
          setSavedTime(0);
      }
  }

  // SALVAR PROGRESSO (Memória)
  async function saveProgress(time: number) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentLesson) return;

      await supabase.from("lesson_progress").upsert({
          user_id: user.id,
          lesson_id: currentLesson.id,
          current_time: Math.floor(time),
          updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, lesson_id' });
  }

  // MARCAR COMO CONCLUÍDA
  async function markAsCompleted() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentLesson) return;

      await supabase.from("lesson_progress").upsert({
          user_id: user.id,
          lesson_id: currentLesson.id,
          completed: true,
          updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, lesson_id' });
      
      // Opcional: Dar moedas aqui
  }

  // ENVIAR COMENTÁRIO
  async function handleSendComment() {
      if (!newComment.trim() || !currentLesson) return;
      setSendingComment(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
          await supabase.from("lesson_comments").insert({
              user_id: user.id,
              lesson_id: currentLesson.id,
              content: newComment
          });
          setNewComment("");
          fetchLessonDetails(currentLesson.id); // Recarrega
      }
      setSendingComment(false);
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando sistema...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-20">
      <style jsx global>{`
        :root { --plyr-color-main: #C9A66B; }
        .plyr--video { border-radius: 12px; overflow: hidden; border: 1px solid #333; }
      `}</style>
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
        
        {/* COLUNA ESQUERDA: VÍDEO E ABAS */}
        <div className="lg:col-span-2 space-y-4">
            {/* PLAYER COM MÁSCARAS (PLYR) */}
            <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-[#333] shadow-2xl relative z-10">
                <div id="player-target" className="w-full h-full"></div>
            </div>

            {/* ABAS (MATERIAL / DÚVIDAS) */}
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                <div className="flex border-b border-[#222]">
                    <button onClick={() => setActiveTab('info')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'info' ? "bg-[#C9A66B] text-black" : "text-gray-400 hover:bg-[#1a1a1a]"}`}>Material</button>
                    <button onClick={() => setActiveTab('comments')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'comments' ? "bg-[#C9A66B] text-black" : "text-gray-400 hover:bg-[#1a1a1a]"}`}>Dúvidas ({comments.length})</button>
                </div>

                <div className="p-5 min-h-[200px]">
                    {/* ABA MATERIAL */}
                    {activeTab === 'info' && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                            <h1 className="text-xl font-bold text-white mb-2">{currentLesson?.title}</h1>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">{currentLesson?.description || "Sem descrição disponível."}</p>
                            
                            {currentLesson?.material_url ? (
                                <a href={currentLesson.material_url} target="_blank" className="inline-flex items-center gap-2 bg-[#222] border border-[#333] px-4 py-2 rounded-lg text-sm font-bold text-white hover:bg-[#333] transition-colors">
                                    <Download size={16} className="text-[#C9A66B]"/> Baixar PDF
                                </a>
                            ) : (
                                <div className="text-xs text-gray-600 italic">Nenhum material extra anexado.</div>
                            )}
                        </div>
                    )}

                    {/* ABA DÚVIDAS */}
                    {activeTab === 'comments' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex gap-2 mb-6">
                                <input 
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                                    placeholder="Tem alguma dúvida? Pergunte aqui..." 
                                    className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-sm text-white focus:border-[#C9A66B] outline-none placeholder:text-gray-700"
                                />
                                <button onClick={handleSendComment} disabled={sendingComment} className="bg-[#C9A66B] text-black p-2 rounded-lg hover:bg-[#b08d55] disabled:opacity-50 transition-colors">
                                    {sendingComment ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                                </button>
                            </div>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {comments.length === 0 && <p className="text-center text-gray-600 text-xs py-4">Seja o primeiro a perguntar!</p>}
                                {comments.map((c) => (
                                    <div key={c.id} className="flex gap-3 items-start border-b border-[#222] pb-3 last:border-0 last:pb-0">
                                        <div className="w-8 h-8 rounded-full bg-[#222] overflow-hidden shrink-0 border border-[#333]">
                                            {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xs">{c.profiles?.full_name?.charAt(0)}</div>}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[#C9A66B] font-bold text-xs">{c.profiles?.full_name || "Aluno"}</span>
                                                <span className="text-gray-600 text-[10px]">{new Date(c.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-gray-300 text-sm leading-snug">{c.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* COLUNA DIREITA: LISTA DE AULAS */}
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 h-fit max-h-[600px] overflow-y-auto">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider flex items-center gap-2">
                Trilha do Curso <span className="bg-[#222] text-gray-400 px-1.5 py-0.5 rounded text-[10px]">{lessons.length} aulas</span>
            </h3>
            <div className="space-y-2">
                {lessons.map((aula, index) => (
                    <button 
                        key={aula.id} 
                        onClick={() => { setCurrentLesson(aula); setActiveTab('info'); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border group ${currentLesson?.id === aula.id ? "bg-[#C9A66B]/10 border-[#C9A66B]" : "bg-transparent text-gray-300 border-transparent hover:bg-white/5 hover:border-[#333]"}`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${currentLesson?.id === aula.id ? "bg-[#C9A66B] text-black" : "bg-[#222] text-gray-500 group-hover:bg-[#333]"}`}>
                            {index + 1}
                        </div>
                        <span className={`text-sm font-bold line-clamp-2 ${currentLesson?.id === aula.id ? "text-white" : "text-gray-400 group-hover:text-gray-200"}`}>{aula.title}</span>
                        {currentLesson?.id === aula.id ? 
                            <PlayCircle size={16} className="text-[#C9A66B] ml-auto shrink-0 animate-pulse" /> : 
                            <CheckCircle size={16} className="text-[#222] ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        }
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
