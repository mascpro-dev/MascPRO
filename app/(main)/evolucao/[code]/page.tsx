"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Play, Pause, Volume2, VolumeX, Maximize, CheckCircle, Lock, Trophy, MessageSquare, Send, User, Bookmark, Reply, X } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

declare global {
  interface Window { onYouTubeIframeAPIReady: () => void; YT: any; }
}

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [aulasConcluidas, setAulasConcluidas] = useState<string[]>([]);
  
  const [videoStarted, setVideoStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'sobre' | 'materiais' | 'duvidas'>('sobre');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{id: string, name: string} | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const playerRef = useRef<any>(null);
  const progressInterval = useRef<any>(null);

  // Carrega progresso do usuário na tabela user_progress
  useEffect(() => {
    if (!currentUser) return;

    async function carregarProgresso() {
      const { data } = await supabase
        .from('user_progress')
        .select('lesson_id')
        .eq('user_id', currentUser.id);

      if (data) setAulasConcluidas(data.map((p: any) => p.lesson_id));
    }

    carregarProgresso();
  }, [currentUser, supabase]);

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          setCurrentUser(session.user);
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url');
          setAllUsers(profiles || []);
      }
      const { data: courseData } = await supabase.from("courses").select("*").or(`code.eq.${params.code},slug.eq.${params.code}`).single();
      setCourse(courseData);
      const { data: lessonsData } = await supabase.from("lessons").select("*").eq("course_code", courseData.code).order("sequence_order", { ascending: true });
      setLessons(lessonsData || []);
      const { data: progress } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", session?.user.id);
      const completedSet = new Set<string>();
      progress?.forEach((p: any) => completedSet.add(p.lesson_id));
      setCompletedLessons(completedSet);
      setCurrentLesson(lessonsData?.[0]);
      setLoading(false);
    }
    loadData();
  }, [params.code]);

  useEffect(() => {
    if (currentLesson?.id) loadComments();
  }, [currentLesson]);

  async function loadComments() {
    const { data } = await supabase.from('lesson_comments').select('*, profiles(full_name, avatar_url)').eq('lesson_id', currentLesson.id).order('created_at', { ascending: false });
    setComments(data || []);
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- FUNÇÃO PARA SALVAR ONDE PAROU ---
  const saveProgress = async (time: number) => {
    if (!currentUser || !currentLesson) return;
    await supabase.from('lesson_progress').upsert({ 
        user_id: currentUser.id, 
        lesson_id: currentLesson.id, 
        last_position: time 
    });
  };

  // --- MARCAR AULA COMO ASSISTIDA (user_progress) ---
  const finalizarAula = async (idDaAula: string) => {
    if (!currentUser) return;

    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: currentUser.id,
        lesson_id: idDaAula,
        completed: true
      });

    if (!error) {
      setAulasConcluidas(prev =>
        prev.includes(idDaAula) ? prev : [...prev, idDaAula]
      );
    }
  };

  // --- CONTROLE DE PLAY/PAUSE CORRIGIDO PARA CELULAR ---
  const togglePlay = (e?: any) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (!playerRef.current) return;
    
    const state = playerRef.current.getPlayerState();
    if (state === 1) { // 1 = Tocando
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      saveProgress(playerRef.current.getCurrentTime());
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (videoStarted && currentLesson?.video_id && window.YT) {
      if (playerRef.current) playerRef.current.destroy();
      
      playerRef.current = new window.YT.Player('ninja-player', {
        videoId: currentLesson.video_id,
        height: '100%', width: '100%',
        playerVars: { 
            autoplay: 1, 
            controls: 0, 
            modestbranding: 1, 
            rel: 0, 
            disablekb: 1, 
            iv_load_policy: 3,
            playsinline: 1, // OBRIGATÓRIO PARA CELULAR
            enablejsapi: 1
        },
        events: {
          onReady: async (event: any) => {
            setDuration(event.target.getDuration());
            
            // MEMÓRIA: BUSCA POSIÇÃO SALVA
            const { data } = await supabase.from('lesson_progress')
                .select('last_position')
                .eq('lesson_id', currentLesson.id)
                .eq('user_id', currentUser?.id)
                .single();
            
            if (data?.last_position) event.target.seekTo(data.last_position);
            
            // No mobile, forçamos o play após interação
            event.target.playVideo();
            setIsPlaying(true);

            progressInterval.current = setInterval(() => {
              if (playerRef.current?.getCurrentTime) {
                  const now = playerRef.current.getCurrentTime();
                  setCurrentTime(now);
                  // Salva no banco a cada 10 segundos
                  if (Math.floor(now) % 10 === 0) saveProgress(now);
              }
            }, 1000);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
            if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
            if (event.data === window.YT.PlayerState.ENDED) handleFinish();
          }
        }
      });
    }
    return () => clearInterval(progressInterval.current);
  }, [videoStarted, currentLesson]);

  const handleFinish = async () => {
    // Gamificação / backend
    await supabase.rpc('process_lesson_completion', { lesson_uuid: currentLesson.id });

    // Progresso permanente do usuário
    await finalizarAula(currentLesson.id);

    const newSet = new Set(completedLessons);
    newSet.add(currentLesson.id);
    setCompletedLessons(newSet);
    router.refresh();
  };

  // --- LÓGICA DE DÚVIDAS (MANTIDA) ---
  const handleCommentChange = (e: any) => {
    const text = e.target.value;
    setNewComment(text);
    const words = text.split(/\s/);
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith("@")) {
      setMentionQuery(lastWord.substring(1));
      setShowMentionList(true);
      // Mostra o menu de usuários para marcar
    } else {
      setShowMentionList(false);
    }
  };

  const selectUser = (name: string) => {
    const words = newComment.split(/\s/);
    words.pop();
    setNewComment([...words, `@${name} `].join(" "));
    setShowMentionList(false);
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    setIsSending(true);
    const { error } = await supabase.from('lesson_comments').insert({
      lesson_id: currentLesson.id,
      user_id: currentUser.id,
      content: replyingTo ? `@${replyingTo.name} ${newComment}` : newComment.trim(), // Adiciona o @ no texto
      parent_id: replyingTo?.id || null // Se for resposta, salva o ID do pai
    });
    if (!error) {
      setNewComment("");
      setReplyingTo(null);
      loadComments(); // Atualiza a lista de dúvidas
    }
    setIsSending(false);
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-[#C9A66B]/30">
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />

      {/* HEADER (TEXTO REFINADO) */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <Link href="/evolucao" className="flex items-center gap-3 text-zinc-500 hover:text-white transition-all">
          <ArrowLeft size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest italic">Voltar</span>
        </Link>
        <div className="flex flex-col items-center text-center">
          <span className="text-[9px] text-zinc-600 font-medium uppercase tracking-[0.4em] mb-1">Módulo</span>
          <span className="text-[11px] font-medium text-[#C9A66B] uppercase tracking-[0.2em] italic max-w-[150px] md:max-w-none truncate">{course?.title}</span>
        </div>
        <div className="w-10"></div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
          <div className="max-w-5xl mx-auto">
            
            {/* PLAYER NINJA (CORRIGIDO PARA TOUCH) */}
            <div className="aspect-video w-full bg-black rounded-xl overflow-hidden border border-white/5 relative group shadow-2xl">
              {!videoStarted ? (
                <button onClick={() => setVideoStarted(true)} className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                  <img src={`https://img.youtube.com/vi/${currentLesson?.video_id}/maxresdefault.jpg`} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                  <div className="w-16 h-16 bg-[#C9A66B] rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110">
                    <Play size={24} className="text-black ml-1 fill-black" />
                  </div>
                </button>
              ) : (
                <>
                    <div className="w-full h-full pointer-events-none">
                        <div id="ninja-player" className="w-full h-full"></div>
                    </div>
                    {/* MÁSCARA QUE ACEITA TOQUE (TOUCH) E CLIQUE */}
                    <div 
                        className="absolute inset-0 z-30 cursor-pointer" 
                        onPointerDown={togglePlay} // onPointerDown funciona melhor que onClick em celulares
                    >
                        <div className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex-1 h-1 bg-white/10 rounded-full relative overflow-hidden">
                                        <div className="absolute top-0 left-0 h-full bg-[#C9A66B] transition-all" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-bold text-white/50 uppercase tracking-widest">
                                    <div className="flex items-center gap-4">
                                        {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
                                        <span className="hidden sm:inline">{(currentTime/60).toFixed(0)}:{(currentTime%60).toFixed(0).padStart(2,'0')} / {(duration/60).toFixed(0)}:{(duration%60).toFixed(0).padStart(2,'0')}</span>
                                    </div>
                                    <span>{Math.floor((currentTime / duration) * 100)}% assistido</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
              )}
          </div>

            {/* TITULO E ABAS (VISUAL MANTIDO) */}
            <div className="mt-8 flex justify-between items-center mb-12">
                <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight italic uppercase">{currentLesson?.title}</h1>
                <div className="hidden md:flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-bold border border-[#C9A66B]/20 bg-[#C9A66B]/5">
                    <Trophy size={14} className="text-[#C9A66B]" /> {completedLessons.has(currentLesson?.id) ? 'PRO ADQUIRIDO' : '+10 PRO'}
          </div>
        </div>

            <div className="mt-8 border-t border-white/5 pt-8">
                <div className="flex gap-6 md:gap-10 mb-8 overflow-x-auto no-scrollbar">
                    {['sobre', 'materiais', 'duvidas'].map((t) => (
                        <button key={t} onClick={() => setActiveTab(t as any)} className={`text-[10px] font-bold uppercase tracking-[0.2em] pb-2 transition-all border-b-2 whitespace-nowrap ${activeTab === t ? 'text-[#C9A66B] border-[#C9A66B]' : 'text-zinc-600 border-transparent'}`}>{t}</button>
                    ))}
                </div>
                
                {/* CONTEÚDO DAS ABAS (MANTIDO) */}

                <div className="min-h-[200px]">
                    {activeTab === 'duvidas' && (
                        <div className="max-w-3xl relative">
                            <div className="relative mb-10">
                                {replyingTo && (
                                    <div className="flex items-center justify-between bg-[#C9A66B]/10 border border-[#C9A66B]/20 p-3 rounded-t-xl mb-[-1px]">
                                        <span className="text-[10px] font-bold text-[#C9A66B] uppercase tracking-widest">Respondendo a {replyingTo.name}</span>
                                        <button onClick={() => setReplyingTo(null)} className="text-[#C9A66B]"><X size={14}/></button>
                                    </div>
                                )}
                                <div className="relative">
                                    <textarea value={newComment} onChange={handleCommentChange} placeholder="Tire sua dúvida... use @ para marcar" className={`w-full bg-zinc-900/30 border border-white/5 p-5 text-sm focus:border-[#C9A66B]/30 outline-none min-h-[100px] resize-none transition-all ${replyingTo ? 'rounded-b-xl' : 'rounded-xl'}`} />
                                    <button onClick={handlePostComment} disabled={isSending} className="absolute bottom-5 right-5 p-2.5 bg-[#C9A66B] rounded-lg text-black disabled:opacity-50">
                                        {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    </button>
                                </div>
                                
                                {/* MENU DE MENÇÃO (Aparece se digitar @) */}
                                {showMentionList && mentionQuery !== null && (
                                    <div className="absolute bottom-full mb-2 bg-zinc-900 border border-white/10 w-64 rounded-xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                                        <p className="p-3 text-[10px] text-zinc-500 font-bold uppercase border-b border-white/5">Marcar usuário...</p>
                                        {allUsers.filter(u => u.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())).length > 0 ? (
                                            allUsers.filter(u => u.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())).map(user => (
                <button
                                                    key={user.id} 
                                                    onClick={() => selectUser(user.full_name)} 
                                                    className="w-full text-left px-4 py-3 hover:bg-zinc-800 flex items-center gap-3 text-sm border-b border-white/5 last:border-0 transition-colors"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border border-white/10">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={12} className="text-zinc-500" />
                                                        )}
                                                    </div>
                                                    <span className="truncate font-medium text-zinc-300">{user.full_name}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-2 text-xs text-zinc-500">Ninguém encontrado...</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {/* LISTA DE DÚVIDAS (MANTIDA COM SCROLL) */}
                            <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {comments.filter(c => !c.parent_id).map((c) => (
                                    <div key={c.id} className="space-y-4">
                                        <div className="flex gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.02]">
                                            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center font-bold text-xs shrink-0">
                                                {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="rounded-full w-full h-full object-cover" /> : c.profiles?.full_name?.[0]}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-white uppercase">{c.profiles?.full_name}</span>
                                                    <span className="text-[9px] text-zinc-600 font-black uppercase">{formatDistanceToNow(new Date(c.created_at), { locale: ptBR, addSuffix: true })}</span>
                  </div>
                                                <p className="text-sm text-zinc-400 leading-relaxed">
                                                    {c.content.split(" ").map((word: string, i: number) => 
                                                        word.startsWith("@") ? (
                                                            <span key={i} className="text-[#C9A66B] font-bold">{word} </span>
                                                        ) : (
                                                            word + " "
                                                        )
                                                    )}
                                                </p>
                                                <button onClick={() => { setReplyingTo({ id: c.id, name: c.profiles?.full_name || "Usuário" }); window.scrollTo({ top: 300, behavior: 'smooth' }); }} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#C9A66B] mt-4 hover:underline">
                                                    <Reply size={12} /> Responder
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                  </div>
            </div>
          </div>
        </div>

        {/* LISTA LATERAL (MANTIDA) */}
        <div className="w-full lg:w-80 bg-black border-l border-white/5 overflow-y-auto shrink-0">
            <div className="p-6 border-b border-white/5 sticky top-0 bg-black z-10"><h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">Aulas</h3></div>
            {lessons.map((lesson, idx) => {
                const isActive = currentLesson?.id === lesson.id;
                const isUnlocked = idx === 0 || completedLessons.has(lessons[idx - 1].id);
                return (
                    <button key={lesson.id} disabled={!isUnlocked} onClick={() => setCurrentLesson(lesson)} className={`w-full p-6 text-left flex gap-4 border-b border-white/5 transition-all ${isActive ? 'bg-zinc-900 border-l-2 border-[#C9A66B]' : ''} ${!isUnlocked ? 'opacity-20' : 'hover:bg-zinc-900/50'}`}>
                        <div className="mt-1">{!isUnlocked ? <Lock size={12}/> : completedLessons.has(lesson.id) ? <CheckCircle size={14} className="text-green-500"/> : <Play size={14}/>}</div>
                        <span className={`text-xs font-medium tracking-tight ${isActive ? 'text-white' : 'text-zinc-500'}`}>{lesson.title}</span>
                </button>
              );
            })}
          </div>
        </div>
    </div>
  );
}
