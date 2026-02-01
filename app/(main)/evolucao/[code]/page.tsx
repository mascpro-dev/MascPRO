"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Save, History, Download, Send, Trophy, Lock, CheckCircle, PlayCircle } from "lucide-react";
import Link from "next/link";
import "plyr/dist/plyr.css"; 

export default function AulaPlayerPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  const courseCode = params?.code as string;

  const playerInstance = useRef<any>(null);
  
  // Estados de Dados
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [progressMap, setProgressMap] = useState<Record<string, any>>({}); 
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState(0);
  
  // Estados de Interação
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Estados do Player
  const [savedTime, setSavedTime] = useState(0); 
  const [hasJumped, setHasJumped] = useState(false);

  const COINS_PER_LESSON = 10; 

  // 1. CARREGAR TUDO
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        console.log("🔍 Buscando curso:", courseCode);

        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            // A. Perfil (Moedas)
            const { data: profile } = await supabase.from("profiles").select("coins, personal_coins").eq("id", user.id).single();
            if (profile) setUserCoins((profile.coins || 0) + (profile.personal_coins || 0));

            // B. Aulas (Busca Explícita)
            // Aqui garantimos que pegamos as colunas certas, independente de lixo no banco
            const { data: lessonsData, error: lessonsError } = await supabase
              .from("lessons")
              .select("id, title, video_id, description, material_url, sequence_order, course_code")
              .ilike("course_code", courseCode) 
              .order("sequence_order", { ascending: true });

            if (lessonsError) {
                console.error("❌ Erro ao buscar aulas:", lessonsError);
            }

            if (lessonsData && lessonsData.length > 0) {
              console.log("✅ Aulas encontradas:", lessonsData.length);
              setLessons(lessonsData);
              
              // C. Progresso (Travas)
              const { data: allProgress } = await supabase
                .from("lesson_progress")
                .select("lesson_id, completed, seconds_watched")
                .eq("user_id", user.id);
              
              const pMap: Record<string, any> = {};
              allProgress?.forEach((p: any) => pMap[p.lesson_id] = p);
              setProgressMap(pMap);

              // D. Define Primeira Aula (Lógica da Trava)
              // Encontra a primeira que NÃO está completa
              const nextToWatch = lessonsData.find((l: any) => !pMap[l.id]?.completed) || lessonsData[0];
              setCurrentLesson(nextToWatch);
            } else {
                console.warn("⚠️ Nenhuma aula encontrada para este código.");
            }
        }
      } catch (err) {
        console.error("Erro Geral:", err);
      } finally {
        setLoading(false);
      }
    }
    if (courseCode) fetchData();
  }, [courseCode, supabase]);

  // 2. DETALHES DA AULA ATUAL (Comentários e Tempo)
  useEffect(() => {
    if (!currentLesson) return;
    
    // Reseta estados
    setHasJumped(false);
    setSavedTime(0);

    // Carrega tempo salvo localmente (sem chamar banco de novo)
    const myProgress = progressMap[currentLesson.id];
    if (myProgress?.seconds_watched) {
        setSavedTime(myProgress.seconds_watched);
        console.log("⏱️ Tempo recuperado:", myProgress.seconds_watched);
    }

    // Carrega comentários
    fetchComments();
  }, [currentLesson]); // Removemos dependencies desnecessárias para evitar loops

  async function fetchComments() {
      if (!currentLesson) return;
      const { data, error } = await supabase
        .from("lesson_comments")
        .select(`id, content, created_at, profiles(full_name, avatar_url)`)
        .eq("lesson_id", currentLesson.id)
        .order("created_at", { ascending: false });
      
      if (error) console.error("Erro comentários:", error);
      if (data) setComments(data);
  }

  // 3. PLAYER DE VÍDEO
  useEffect(() => {
    if (!currentLesson || !currentLesson.video_id) return;

    let player: any = null;
    
    // Destrói anterior
    if (playerInstance.current) {
        try { playerInstance.current.destroy(); } catch(e) {}
        playerInstance.current = null;
    }

    const loadPlayer = async () => {
        const Plyr = (await import("plyr")).default;

        player = new Plyr("#player-target", {
            autoplay: true,
            controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
            youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
        });
        playerInstance.current = player;

        // Evento: Pronto para Tocar
        player.on('ready', () => {
            // Só pula se tiver tempo salvo relevante (> 5s)
            if (savedTime > 5) { 
                setTimeout(() => {
                    player.currentTime = savedTime;
                    setHasJumped(true); // Mostra o aviso "Retomando"
                }, 1000); 
            }
        });

        // Evento: Atualização de Tempo (Salva a cada 5s)
        player.on('timeupdate', (event: any) => {
            const currentTime = event.detail.plyr.currentTime;
            if (Math.floor(currentTime) > 0 && Math.floor(currentTime) % 5 === 0) {
                 salvarProgresso(currentTime, false);
            }
        });

        // Evento: Fim do Vídeo (Libera próxima aula)
        player.on('ended', () => {
            console.log("🏁 Aula finalizada!");
            salvarProgresso(player.duration, true);
            pagarRecompensa();
        });
    };

    // Pequeno delay para garantir renderização do HTML
    setTimeout(() => loadPlayer(), 100);

    return () => {
        if (playerInstance.current) {
             try { playerInstance.current.destroy(); } catch(e) {}
        }
    };
  }, [currentLesson?.id]); 

  // --- FUNÇÕES DE AÇÃO ---

  const salvarProgresso = async (time: number, isCompleted: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && currentLesson) {
        const payload: any = {
            user_id: user.id,
            lesson_id: currentLesson.id,
            seconds_watched: Math.floor(time),
            last_updated: new Date().toISOString()
        };
        // Importante: Se completou, marca true. Se não, mantém o que estava antes (ou false)
        if (isCompleted) payload.completed = true;

        const { error } = await supabase.from("lesson_progress").upsert(payload);
        
        if (error) {
            console.error("Erro ao salvar progresso:", error);
        } else {
            // Atualiza o mapa local para destravar a próxima aula instantaneamente na UI
            setProgressMap(prev => ({
                ...prev,
                [currentLesson.id]: { 
                    ...prev[currentLesson.id], 
                    seconds_watched: time, 
                    completed: isCompleted ? true : prev[currentLesson.id]?.completed 
                }
            }));
        }
    }
  };

  async function pagarRecompensa() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Tenta chamar a função segura do banco
        const { error } = await supabase.rpc('add_pro_system', { user_id_param: user.id, amount: COINS_PER_LESSON, type_id: 1 }); 
        
        if (!error) {
            setUserCoins(prev => prev + COINS_PER_LESSON);
            // Feedback Visual (Pode substituir por um Toast se tiver)
            console.log(`🎉 +${COINS_PER_LESSON} PRO Recebidos!`);
        } else {
             console.error("Erro ao pagar moedas:", error);
        }
    }
  }

  async function handleSendComment() {
      if (!newComment.trim()) return;
      setSendingComment(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && currentLesson) {
          const { error } = await supabase.from("lesson_comments").insert({
              user_id: user.id,
              lesson_id: currentLesson.id,
              content: newComment
          });
          
          if (!error) {
              setNewComment("");
              fetchComments();
          } else {
              alert("Erro ao enviar comentário. Tente novamente.");
              console.error(error);
          }
      }
      setSendingComment(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">
      <Loader2 className="w-8 h-8 animate-spin text-[#C9A66B]" />
      <span className="ml-3 text-sm text-gray-400">Carregando Sala de Aula...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 pb-20">
      
      <style jsx global>{`
        :root { --plyr-color-main: #C9A66B; }
        .plyr--full-ui input[type=range] { color: #C9A66B; }
        .plyr__control--overlaid { background: rgba(201, 166, 107, 0.9); }
        .plyr--video { border-radius: 12px; overflow: hidden; border: 1px solid #333; }
        .plyr__video-embed iframe { pointer-events: none; }
      `}</style>

      {/* TOPO */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-sm tracking-wide">VOLTAR</span>
        </Link>
        <div className="flex items-center gap-4">
            <div className="bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-lg flex items-center gap-2">
                <Trophy size={14} className="text-[#C9A66B]" />
                <span className="font-bold text-[#C9A66B] text-xs">{userCoins} <span className="text-gray-500 font-normal">PRO</span></span>
            </div>
            {hasJumped && (
                <div className="flex items-center gap-1 text-xs text-green-500 font-bold animate-in fade-in">
                    <History size={12} /> <span className="hidden sm:inline">Retomando</span>
                </div>
            )}
             <div className="flex items-center gap-1 text-[10px] text-gray-600">
                <Save size={10} />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- ÁREA PRINCIPAL --- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video bg-black rounded-xl shadow-2xl shadow-black relative z-10">
            {currentLesson?.video_id ? (
                <div key={currentLesson.id} className="plyr__video-embed" id="player-target">
                    <iframe
                        src={`https://www.youtube.com/embed/${currentLesson.video_id}?origin=https://plyr.io&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1`}
                        allowFullScreen
                        allow="autoplay"
                    ></iframe>
                </div>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[#C9A66B]" />
                    <span className="text-xs">Carregando vídeo...</span>
                    {/* Debug visual para ajudar a entender o erro */}
                    <span className="text-[10px] text-gray-700">ID: {currentLesson?.id || 'N/A'}</span>
                </div>
            )}
          </div>

          {/* ABAS */}
          <div className="bg-[#111] border border-[#222] rounded-lg overflow-hidden">
             <div className="flex border-b border-[#222]">
                <button onClick={() => setActiveTab('info')} className={`px-4 py-3 text-xs font-bold uppercase transition-colors ${activeTab === 'info' ? "bg-[#C9A66B] text-black" : "text-gray-400 hover:bg-[#1a1a1a]"}`}>Material</button>
                <button onClick={() => setActiveTab('comments')} className={`px-4 py-3 text-xs font-bold uppercase transition-colors ${activeTab === 'comments' ? "bg-[#C9A66B] text-black" : "text-gray-400 hover:bg-[#1a1a1a]"}`}>Dúvidas</button>
             </div>

             <div className="p-4">
                {activeTab === 'info' && currentLesson && (
                    <div className="animate-in fade-in">
                        <div className="flex justify-between items-start mb-2">
                            <h1 className="text-lg font-bold text-white">{currentLesson.title}</h1>
                            <span className="bg-[#C9A66B]/10 text-[#C9A66B] text-[10px] font-bold px-2 py-0.5 rounded border border-[#C9A66B]/20 whitespace-nowrap">+{COINS_PER_LESSON} PRO</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed mb-4">{currentLesson.description || "Assista a aula completa para liberar o próximo módulo."}</p>
                        {currentLesson.material_url && (
                            <a href={currentLesson.material_url} target="_blank" className="inline-flex items-center gap-2 bg-[#222] hover:bg-[#333] border border-[#333] text-white px-3 py-2 rounded text-xs font-bold transition-all"><Download size={14} className="text-[#C9A66B]" /> Baixar PDF</a>
                        )}
                    </div>
                )}

                {activeTab === 'comments' && (
                    <div className="animate-in fade-in">
                        <div className="flex gap-2 mb-4">
                            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendComment()} placeholder="Sua dúvida..." className="flex-1 bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-xs text-white focus:border-[#C9A66B] outline-none"/>
                            <button onClick={handleSendComment} disabled={sendingComment} className="bg-[#C9A66B] text-black px-3 py-2 rounded hover:bg-[#b08d55] disabled:opacity-50">{sendingComment ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />}</button>
                        </div>
                        <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
                            {comments.length === 0 && <p className="text-gray-600 text-xs text-center py-2">Nenhum comentário ainda.</p>}
                            {comments.map((comment) => (
                                <div key={comment.id} className="flex gap-2 items-start border-b border-[#222] pb-3 last:border-0">
                                    <div className="w-5 h-5 rounded-full bg-[#222] overflow-hidden shrink-0">{comment.profiles?.avatar_url && <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" />}</div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5"><span className="font-bold text-[#C9A66B] text-[10px]">{comment.profiles?.full_name}</span><span className="text-[10px] text-gray-600">{new Date(comment.created_at).toLocaleDateString()}</span></div>
                                        <p className="text-xs text-gray-300">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
             </div>
          </div>
        </div>

        {/* --- LISTA LATERAL (TRILHA) --- */}
        <div className="bg-[#111] border border-[#222] rounded-lg p-5 h-fit">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Trilha do Módulo</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === currentLesson?.id;
              
              // Regra da Trava: Index 0 livre. Outros dependem do anterior.
              const isLocked = index > 0 && !progressMap[lessons[index-1].id]?.completed;
              const isCompleted = progressMap[lesson.id]?.completed;

              return (
                <button 
                    key={lesson.id} 
                    disabled={isLocked} 
                    onClick={() => { setHasJumped(false); setCurrentLesson(lesson); setActiveTab('info'); }} 
                    className={`w-full flex items-center gap-3 p-3 rounded text-left transition-all border ${isActive ? "bg-[#C9A66B]/10 border-[#C9A66B]/30" : isLocked ? "opacity-50 cursor-not-allowed border-transparent" : "hover:bg-white/5 border-transparent"}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isCompleted ? "bg-green-500 text-black" : isActive ? "bg-[#C9A66B] text-black" : "bg-[#222] text-gray-500"}`}>
                    {isCompleted ? <CheckCircle size={12} /> : isLocked ? <Lock size={10} /> : index + 1}
                  </div>
                  <div className="flex-1">
                      <p className={`text-xs font-bold leading-tight ${isActive ? "text-white" : "text-gray-400"}`}>{lesson.title}</p>
                  </div>
                  {isActive && <PlayCircle size={14} className="text-[#C9A66B]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
