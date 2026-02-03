"use client";

// --- FORÇAR REVALIDAÇÃO (ESSENCIAL PARA ATUALIZAR MOEDAS) ---
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams, useRouter } from "next/navigation"; // Adicionado useRouter
import { ArrowLeft, Download, Loader2, Play, Pause, CheckCircle, Lock, ListVideo, Send, MessageSquare, User, Info, HelpCircle, FileText, Maximize, Volume2, VolumeX, Clock, Coins } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

// Tipagem global
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

// Formatador de tempo (00:00)
const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter(); // Para atualizar o saldo global
  const supabase = createClientComponentClient();
  
  // DADOS
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  // PLAYER CUSTOMIZADO
  const [videoStarted, setVideoStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  
  // GAMIFICAÇÃO
  const [justEarned, setJustEarned] = useState(false); // Efeito visual de moedas ganhas

  const playerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // INTERFACE
  const [activeTab, setActiveTab] = useState<"sobre" | "duvidas" | "material">("sobre");
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]); 
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  // 1. CARREGAR DADOS
  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        const codeFromUrl = params?.code; 
        if (!codeFromUrl) return;

        // Curso
        const { data: courseData } = await supabase.from("courses").select("*").or(`code.eq.${codeFromUrl},slug.eq.${codeFromUrl}`).single();
        if (!courseData) throw new Error("Curso não encontrado.");
        setCourse(courseData);

        // Aulas
        const { data: lessonsData } = await supabase.from("lessons").select("*").eq("course_code", courseData.code).order("sequence_order", { ascending: true });
        
        // Progresso
        const { data: { session } } = await supabase.auth.getSession();
        const completedSet = new Set<string>();
        if (session) {
            const { data: progressData } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", session.user.id);
            progressData?.forEach((p: any) => completedSet.add(p.lesson_id));
        }
        setCompletedLessons(completedSet);

        // Define Aula
        if (lessonsData && lessonsData.length > 0) {
            setLessons(lessonsData);
            const firstUnwatched = lessonsData.find((l: any) => !completedSet.has(l.id));
            setCurrentLesson(firstUnwatched || lessonsData[0]);
        }
        // Usuários
        const { data: usersData } = await supabase.from("profiles").select("id, full_name, avatar_url").limit(300); 
        setAllUsers(usersData || []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadContent();
  }, [params]);

  // 2. RESETAR AO MUDAR AULA
  useEffect(() => {
    if (!currentLesson?.id) return;
    setVideoStarted(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setJustEarned(false); // Reseta animação de moedas
    setActiveTab("sobre");
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    // Limpa player anterior
    if (playerRef.current) {
        try {
            playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
    }
    
    async function loadComments() {
        const { data } = await supabase.from("lesson_comments").select(`*, profiles:user_id ( full_name, avatar_url )`).eq("lesson_id", currentLesson.id).order("created_at", { ascending: false });
        setComments(data || []);
    }
    loadComments();
  }, [currentLesson]);

  // 3. INICIALIZAR YOUTUBE (MODO NINJA 🥷)
  useEffect(() => {
    if (videoStarted && currentLesson?.video_id && window.YT) {
        if (playerRef.current) { try { playerRef.current.destroy(); } catch(e){} }

        setTimeout(() => {
            playerRef.current = new window.YT.Player('ninja-player', {
                videoId: currentLesson.video_id,
                height: '100%',
                width: '100%',
                playerVars: {
                    autoplay: 1,      
                    controls: 0,       // SEM BARRA NATIVA
                    disablekb: 1,      // SEM TECLADO
                    fs: 0,             // SEM BOTÃO FULLSCREEN NATIVO
                    modestbranding: 1, // TENTA ESCONDER LOGO
                    rel: 0,            // SEM RELACIONADOS
                    showinfo: 0,
                    iv_load_policy: 3
                },
                events: {
                    'onReady': (event: any) => {
                        setDuration(event.target.getDuration());
                        setIsPlaying(true);
                        // Loop para atualizar barra de progresso
                        intervalRef.current = setInterval(() => {
                            if (playerRef.current && playerRef.current.getCurrentTime) {
                                try {
                                    setCurrentTime(playerRef.current.getCurrentTime());
                                } catch (e) {}
                            }
                        }, 500);
                    },
                    'onStateChange': onPlayerStateChange
                }
            });
        }, 100);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [videoStarted, currentLesson?.video_id]);


  // CONTROLES DO PLAYER
  const togglePlay = () => {
      if (!playerRef.current) return;
      if (isPlaying) { playerRef.current.pauseVideo(); } else { playerRef.current.playVideo(); }
      setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);
      if (playerRef.current) playerRef.current.seekTo(time, true);
  };

  const toggleMute = () => {
      if (!playerRef.current) return;
      if (isMuted) { playerRef.current.unMute(); } else { playerRef.current.mute(); }
      setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
      const elem = containerRef.current;
      if (elem) {
          if (!document.fullscreenElement) { elem.requestFullscreen().catch(err => console.log(err)); } 
          else { document.exitFullscreen(); }
      }
  };

  // --- LÓGICA AUTOMÁTICA & MOEDAS ---
  const onPlayerStateChange = async (event: any) => {
    // 0 = ENDED (ACABOU)
    if (event.data === 0) { 
        console.log("💰 Aula concluída! Atualizando moedas...");
        setIsPlaying(false);
        
        // 1. Atualiza Visualmente (Aula Concluída)
        const newSet = new Set(completedLessons);
        newSet.add(currentLesson.id);
        setCompletedLessons(newSet);

        // 2. Animação de Moedas
        setJustEarned(true);
        setTimeout(() => setJustEarned(false), 3000); // Remove animação após 3s

        // 3. Salva no Banco e Atualiza Header
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from("lesson_progress").upsert({
                user_id: user.id,
                lesson_id: currentLesson.id
            }, { onConflict: 'user_id, lesson_id' });
            
            // ATUALIZAÇÃO GLOBAL: Força o Next.js a recarregar dados do servidor (incluindo saldo no Header)
            router.refresh(); 
        }
        
        // 4. Próxima Aula
        setTimeout(() => {
            const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
            if (currentIndex < lessons.length - 1) {
                setCurrentLesson(lessons[currentIndex + 1]);
            }
        }, 3000); // Dá tempo de ver a animação das moedas
    }
    if (event.data === 1) setIsPlaying(true);
    if (event.data === 2) setIsPlaying(false);
  };

  // --- COMENTÁRIOS E MENÇÕES ---
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value; setNewComment(text);
    const words = text.split(/\s+/); const lastWord = words[words.length - 1];
    if (lastWord.startsWith("@")) { setShowMentions(true); setMentionQuery(lastWord.substring(1).toLowerCase()); } 
    else { setShowMentions(false); }
  };
  const insertMention = (user: any) => {
    const words = newComment.split(/\s+/); words.pop(); 
    const finalText = [...words, `@${user.full_name} `].join(" "); setNewComment(finalText); setShowMentions(false);
  };
  const handleSendComment = async () => {
    if (!newComment.trim() || !currentLesson) return;
    setSendingComment(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { error } = await supabase.from("lesson_comments").insert({ lesson_id: currentLesson.id, user_id: user.id, content: newComment });
        if (!error) {
            allUsers.forEach(async (mentionedUser) => {
                if (newComment.includes(`@${mentionedUser.full_name}`) && mentionedUser.id !== user.id) {
                    await supabase.from("notifications").insert({ user_id: mentionedUser.id, actor_id: user.id, content: `te marcou na aula "${currentLesson.title}"`, link_url: `/evolucao/${course.code}`, is_read: false });
                }
            });
            setNewComment(""); setShowMentions(false);
            const { data } = await supabase.from("lesson_comments").select("*, profiles:user_id(full_name, avatar_url)").eq("lesson_id", currentLesson.id).order("created_at", { ascending: false });
            setComments(data || []);
        }
    }
    setSendingComment(false);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;
  if (!course) return <div className="min-h-screen bg-black text-white p-10">Curso não encontrado.</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden">
      
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />

      {/* HEADER */}
      <div className="h-16 border-b border-[#222] flex items-center px-6 justify-between bg-[#111] shrink-0">
          <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={20} /> <span className="text-sm font-bold uppercase hidden md:inline">Voltar</span>
          </Link>
          <div className="text-sm font-bold text-[#C9A66B] uppercase tracking-wider truncate mx-4">{course.title}</div>
          <div className="w-10"></div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          
          {/* ESQUERDA: Player + Abas */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black scrollbar-hide">
              <div className="max-w-4xl mx-auto pb-20">
                
                {/* --- PLAYER CLEAN (ZOOM HACK) --- */}
                <div 
                    ref={containerRef}
                    key={currentLesson?.id}
                    className="aspect-video w-full bg-[#000] rounded-xl overflow-hidden border border-[#333] shadow-2xl mb-6 relative group select-none"
                    onMouseEnter={() => setShowControls(true)}
                    onMouseLeave={() => setShowControls(false)}
                >
                    {currentLesson?.video_id ? (
                        <>
                            {videoStarted ? (
                                <>
                                    {/* 1. CONTAINER DO YOUTUBE COM ZOOM (Esconde os logos) */}
                                    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                                        <div className="w-[140%] h-[140%] -ml-[20%] -mt-[10%]">
                                            <div id="ninja-player" className="w-full h-full"></div>
                                        </div>
                                    </div>
                                    
                                    {/* 2. ESCUDO DE CLIQUE (Click Shield) */}
                                    <div 
                                        className="absolute inset-0 z-10 w-full h-full cursor-pointer bg-transparent"
                                        onClick={togglePlay}
                                    ></div>

                                    {/* 3. ÍCONE DE PLAY GIGANTE (Pause) */}
                                    {!isPlaying && (
                                        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-200">
                                            <div className="w-20 h-20 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                                                <Play size={36} className="text-white ml-2 fill-white" />
                                            </div>
                                        </div>
                                    )}

                                    {/* 4. BARRA DE CONTROLE PERSONALIZADA */}
                                    <div className={`absolute bottom-0 left-0 right-0 px-4 pb-4 pt-16 bg-gradient-to-t from-black/90 to-transparent z-30 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                                        
                                        {/* Barra de Progresso */}
                                        <div className="relative w-full h-1 bg-gray-600 rounded-full mb-4 group/bar cursor-pointer hover:h-2 transition-all">
                                            <div className="absolute top-0 left-0 h-full bg-[#C9A66B] rounded-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                                            <input 
                                                type="range" min={0} max={duration || 100} step="1"
                                                value={currentTime} onChange={handleSeek}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white hover:text-[#C9A66B] transition-colors">
                                                    {isPlaying ? <Pause size={24} fill="white"/> : <Play size={24} fill="white"/>}
                                                </button>
                                                
                                                <div className="flex items-center gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="text-white hover:text-gray-300">
                                                        {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
                                                    </button>
                                                </div>

                                                <span className="text-xs font-mono text-gray-300 tracking-widest">
                                                    {formatTime(currentTime)} / {formatTime(duration)}
                                                </span>
                                            </div>

                                            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white hover:text-[#C9A66B] transition-colors">
                                                <Maximize size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // CAPA DOURADA (Inicial)
                                <button 
                                    onClick={() => {
                                        setVideoStarted(true);
                                        setTimeout(() => { if(!window.YT) window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(); }, 100);
                                    }} 
                                    className="absolute inset-0 w-full h-full cursor-pointer z-10 flex flex-col items-center justify-center group"
                                >
                                    <img src={`https://img.youtube.com/vi/${currentLesson.video_id}/hqdefault.jpg`} alt="Capa" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                                    <div className="w-24 h-24 bg-[#C9A66B] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(201,166,107,0.6)] group-hover:scale-110 transition-transform duration-300 z-20">
                                        <Play size={36} className="text-black ml-1 fill-black" />
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]"><Play size={48} className="text-gray-700 mb-2" /><p className="text-gray-500 text-sm">Aula sem vídeo.</p></div>
                    )}
                </div>

                {/* INFO DA AULA + MOEDAS */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{currentLesson?.title}</h1>
                        <p className="text-sm text-gray-500">Módulo: {course.title}</p>
                    </div>
                    
                    {/* ÁREA DE STATUS E MOEDAS */}
                    <div className="flex items-center gap-3">
                        {/* MOEDAS */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all duration-500
                            ${justEarned 
                                ? 'bg-[#C9A66B] text-black border-[#C9A66B] shadow-[0_0_20px_rgba(201,166,107,0.6)] scale-110' 
                                : completedLessons.has(currentLesson?.id)
                                    ? 'bg-green-900/20 text-green-500 border-green-800'
                                    : 'bg-[#1a1a1a] text-[#C9A66B] border-[#333]'
                            }
                        `}>
                            <Coins size={16} />
                            {justEarned 
                                ? "+10 Recebidas!" 
                                : completedLessons.has(currentLesson?.id) 
                                    ? "Recompensa Resgatada" 
                                    : "+10 Moedas"
                            }
                        </div>

                        {/* STATUS */}
                        {!completedLessons.has(currentLesson?.id) && (
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border bg-[#222] text-gray-400 border-[#333]">
                                <Clock size={14} /> Pendente
                            </div>
                        )}
                    </div>
                </div>

                {/* ABAS */}
                <div className="flex items-center gap-6 border-b border-[#222] mb-6 overflow-x-auto">
                    <button onClick={() => setActiveTab("sobre")} className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === "sobre" ? "border-[#C9A66B] text-[#C9A66B]" : "border-transparent text-gray-500 hover:text-gray-300"}`}><Info size={16} /> Sobre</button>
                    <button onClick={() => setActiveTab("duvidas")} className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === "duvidas" ? "border-[#C9A66B] text-[#C9A66B]" : "border-transparent text-gray-500 hover:text-gray-300"}`}><HelpCircle size={16} /> Dúvidas ({comments.length})</button>
                    <button onClick={() => setActiveTab("material")} className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === "material" ? "border-[#C9A66B] text-[#C9A66B]" : "border-transparent text-gray-500 hover:text-gray-300"}`}><FileText size={16} /> Material</button>
                </div>

                {/* CONTEÚDO ABAS */}
                <div className="min-h-[200px]">
                    {activeTab === "sobre" && <div className="bg-[#111] p-6 rounded-xl border border-[#222] animate-in fade-in"><p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">{currentLesson?.description || "Sem descrição."}</p></div>}
                    {activeTab === "material" && <div className="bg-[#111] p-6 rounded-xl border border-[#222] animate-in fade-in">{(currentLesson?.material_url || course?.material_url) ? <div className="flex flex-col gap-3"><p className="text-gray-400 text-sm mb-2">Download disponível:</p><a href={currentLesson?.material_url || course?.material_url} target="_blank" className="flex items-center gap-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#333] hover:border-[#C9A66B] hover:bg-[#222] transition-all group"><div className="w-10 h-10 bg-[#C9A66B]/10 rounded-full flex items-center justify-center text-[#C9A66B] group-hover:scale-110 transition-transform"><Download size={20} /></div><div><h4 className="font-bold text-gray-200 text-sm">Baixar Arquivo</h4><p className="text-xs text-gray-500">Google Drive / PDF</p></div></a></div> : <div className="text-center py-8 text-gray-500"><p>Sem material extra.</p></div>}</div>}
                    {activeTab === "duvidas" && (
                        <div className="animate-in fade-in relative">
                            <div className="flex gap-4 mb-8"><div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center shrink-0 border border-[#333]"><User size={20} className="text-gray-500" /></div><div className="flex-1 relative"><textarea value={newComment} onChange={handleCommentChange} placeholder="Use @ para marcar alguém..." className="w-full bg-[#111] border border-[#333] rounded-lg p-4 text-sm text-white focus:outline-none focus:border-[#C9A66B] min-h-[100px] resize-none" />{showMentions && <div className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl w-64 max-h-48 overflow-y-auto z-50">{allUsers.length === 0 ? <div className="px-4 py-2 text-xs text-gray-500">Carregando lista...</div> : allUsers.filter(u => u.full_name?.toLowerCase().includes(mentionQuery)).map(user => (<button key={user.id} onClick={() => insertMention(user)} className="w-full text-left px-4 py-3 hover:bg-[#333] flex items-center gap-3 text-sm border-b border-[#222] last:border-0 transition-colors"><div className="w-6 h-6 rounded-full bg-[#333] overflow-hidden flex items-center justify-center">{user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : <User size={12}/>}</div><span className="truncate font-medium text-gray-300">{user.full_name}</span></button>))}</div>}<div className="absolute bottom-3 right-3"><button onClick={handleSendComment} disabled={sendingComment || !newComment.trim()} className="bg-[#C9A66B] p-2 rounded-full text-black hover:bg-[#b08d55] disabled:opacity-50 transition-colors">{sendingComment ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}</button></div></div></div>
                            <div className="space-y-6">{comments.map((comment) => (<div key={comment.id} className="flex gap-4 group"><div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center shrink-0 border border-[#333] overflow-hidden">{comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" /> : <User size={20} className="text-gray-500" />}</div><div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className="font-bold text-sm text-[#C9A66B]">{comment.profiles?.full_name || "Membro"}</span><span className="text-xs text-gray-600">{new Date(comment.created_at).toLocaleDateString('pt-BR')}</span></div><div className="text-gray-300 text-sm bg-[#111] p-3 rounded-lg border border-[#222]">{comment.content.split(" ").map((word:string, i:number) => word.startsWith("@") ? <span key={i} className="text-blue-400 font-bold">{word} </span> : word + " ")}</div></div></div>))}</div>
                        </div>
                    )}
                </div>
              </div>
          </div>

          {/* DIREITA: Lista de Aulas */}
          <div className="w-full md:w-80 bg-[#0a0a0a] border-l border-[#222] overflow-y-auto shrink-0 md:h-full h-96">
              <div className="p-4 border-b border-[#222] bg-[#0a0a0a] sticky top-0 z-10"><h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2"><ListVideo size={14} /> Conteúdo</h3></div>
              <div className="flex flex-col pb-20">{lessons.map((lesson, idx) => { const isActive = currentLesson?.id === lesson.id; const isCompleted = completedLessons.has(lesson.id); const isUnlocked = idx === 0 || completedLessons.has(lessons[idx - 1].id); return (<button key={lesson.id} disabled={!isUnlocked} onClick={() => isUnlocked && setCurrentLesson(lesson)} className={`p-4 text-left border-b border-[#1a1a1a] transition-colors flex gap-3 group ${isActive ? 'bg-[#161616] border-l-4 border-l-[#C9A66B]' : 'border-l-4 border-l-transparent'} ${!isUnlocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-[#111] cursor-pointer'}`}><div className="mt-1">{!isUnlocked ? <Lock size={14} className="text-gray-600" /> : isCompleted ? <CheckCircle size={14} className="text-green-500" /> : isActive ? <Play size={14} className="text-[#C9A66B] fill-[#C9A66B]" /> : <span className="text-xs text-gray-600 font-mono">{String(idx + 1).padStart(2, '0')}</span>}</div><div><h4 className={`text-sm font-medium mb-1 ${isActive ? 'text-white' : 'text-gray-400'} ${isUnlocked && 'group-hover:text-gray-200'}`}>{lesson.title}</h4><span className="text-[10px] text-gray-600">{lesson.durations_minutos > 0 ? `${lesson.durations_minutos} min` : 'Vídeo'}</span></div></button>)})}</div>
          </div>
      </div>
    </div>
  );
}
