"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Play, Pause, Volume2, VolumeX, Maximize, Minimize, CheckCircle, Lock, Trophy, MessageSquare, Send, User, Bookmark } from "lucide-react";
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
  const [isSending, setIsSending] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  const [videoStarted, setVideoStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'sobre' | 'materiais' | 'duvidas'>('sobre');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  // ESTADOS PARA O @MENTION
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const playerRef = useRef<any>(null);
  const progressInterval = useRef<any>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          setCurrentUser(session.user);
          // Carregar alunos para o @mention
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
    const { data } = await supabase.from('comments').select('*, profiles(full_name, avatar_url)').eq('lesson_id', currentLesson.id).order('created_at', { ascending: false });
    setComments(data || []);
  }

  // --- LÓGICA DO PLAYER ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (videoStarted && currentLesson?.video_id && window.YT) {
      if (playerRef.current) playerRef.current.destroy();
      playerRef.current = new window.YT.Player('ninja-player', {
        videoId: currentLesson.video_id,
        height: '100%', width: '100%',
        playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, disablekb: 1, iv_load_policy: 3 },
        events: {
          onReady: (event: any) => {
            setDuration(event.target.getDuration());
            setIsPlaying(true);
            progressInterval.current = setInterval(() => {
              if (playerRef.current?.getCurrentTime) setCurrentTime(playerRef.current.getCurrentTime());
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
    await supabase.rpc('process_lesson_completion', { lesson_uuid: currentLesson.id });
    const newSet = new Set(completedLessons);
    newSet.add(currentLesson.id);
    setCompletedLessons(newSet);
    router.refresh();
  };

  // --- LÓGICA DE MENCIONAR COM @ ---
  const handleCommentChange = (e: any) => {
    const val = e.target.value;
    setNewComment(val);
    
    const words = val.split(/\s/);
    const lastWord = words[words.length - 1];
    
    if (lastWord.startsWith("@") && lastWord.length > 1) {
      setMentionQuery(lastWord.slice(1).toLowerCase());
      setShowMentionList(true);
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
    const { error } = await supabase.from('comments').insert({
      lesson_id: currentLesson.id,
      user_id: currentUser.id,
      content: newComment,
      post_id: null // Fix para o erro de not-null constraint
    });
    if (!error) { setNewComment(""); loadComments(); }
    setIsSending(false);
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans">
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />

      {/* HEADER */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <Link href="/evolucao" className="flex items-center gap-3 text-zinc-500 hover:text-white transition-all font-bold text-[10px] uppercase tracking-widest italic">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <div className="text-[10px] font-black text-[#C9A66B] uppercase tracking-[0.3em] italic">{course?.title}</div>
        <div className="w-10"></div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
          <div className="max-w-5xl mx-auto">
            
            {/* PLAYER NINJA */}
            <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden border border-white/5 relative group shadow-2xl">
              {!videoStarted ? (
                <button onClick={() => setVideoStarted(true)} className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                  <img src={`https://img.youtube.com/vi/${currentLesson?.video_id}/maxresdefault.jpg`} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                  <div className="w-16 h-16 bg-[#C9A66B] rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110">
                    <Play size={24} className="text-black ml-1 fill-black" />
                  </div>
                </button>
              ) : (
                <>
                    <div className="w-full h-full pointer-events-none"><div id="ninja-player" className="w-full h-full"></div></div>
                    <div className={`absolute inset-0 z-30 flex flex-col justify-end bg-gradient-to-t from-black/90 via-transparent to-transparent transition-opacity`}>
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-[9px] font-bold text-white/50">{formatTime(currentTime)}</span>
                                <div className="flex-1 h-1 bg-white/10 rounded-full relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full bg-[#C9A66B]" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                                </div>
                                <span className="text-[9px] font-bold text-white/50">{formatTime(duration)}</span>
                            </div>
                        </div>
                    </div>
                </>
              )}
            </div>

            {/* CONTEÚDO E ABAS */}
            <div className="mt-8 border-t border-white/5 pt-8">
                <div className="flex gap-10 mb-8">
                    {['sobre', 'materiais', 'duvidas'].map((t) => (
                        <button key={t} onClick={() => setActiveTab(t as any)} className={`text-[10px] font-bold uppercase tracking-[0.2em] pb-2 transition-all border-b-2 ${activeTab === t ? 'text-[#C9A66B] border-[#C9A66B]' : 'text-zinc-600 border-transparent'}`}>{t}</button>
                    ))}
                </div>
                <div className="min-h-[200px]">
                    {activeTab === 'duvidas' && (
                        <div className="max-w-2xl relative">
                            {/* CAIXA DE TEXTO COM @MENTION REATIVADO */}
                            <div className="relative mb-8">
                                <textarea 
                                    value={newComment} 
                                    onChange={handleCommentChange} 
                                    placeholder="Use @ para marcar alguém..." 
                                    className="w-full bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-sm focus:border-[#C9A66B]/30 outline-none min-h-[100px] resize-none" 
                                />
                                <button onClick={handlePostComment} disabled={isSending} className="absolute bottom-4 right-4 p-2.5 bg-[#C9A66B] rounded-lg text-black disabled:opacity-50">
                                    {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                </button>

                                {/* LISTA DE @MENTION FLUTUANTE */}
                                {showMentionList && (
                                    <div className="absolute bottom-full left-0 w-64 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl mb-2 overflow-hidden z-50">
                                        {allUsers.filter(u => u.full_name?.toLowerCase().includes(mentionQuery)).map(user => (
                                            <button key={user.id} onClick={() => selectUser(user.full_name)} className="w-full p-3 flex items-center gap-3 hover:bg-[#C9A66B] hover:text-black transition-all text-left">
                                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center text-[10px] font-bold">
                                                    {user.avatar_url ? <img src={user.avatar_url} className="rounded-full" /> : user.full_name?.[0]}
                                                </div>
                                                <span className="text-xs font-medium">{user.full_name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
          </div>

                            <div className="space-y-6">
                                {comments.map((c) => (
                                    <div key={c.id} className="flex gap-4 p-4 rounded-xl hover:bg-white/5 transition-all">
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-[10px] border border-white/5">
                                            {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="rounded-full" /> : <User size={12} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-xs font-bold text-white uppercase">{c.profiles?.full_name}</span>
                                                <span className="text-[9px] text-zinc-600 font-black uppercase">
                                                    {c.created_at ? formatDistanceToNow(new Date(c.created_at), { locale: ptBR, addSuffix: true }) : 'agora'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-400">{c.content}</p>
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

        {/* PLAYLIST LATERAL */}
        <div className="w-full lg:w-80 bg-black border-l border-white/5 overflow-y-auto shrink-0">
            <div className="p-6 border-b border-white/5 sticky top-0 bg-black z-10"><h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">Aulas</h3></div>
            {lessons.map((lesson, idx) => {
                const isActive = currentLesson?.id === lesson.id;
                const isUnlocked = idx === 0 || completedLessons.has(lessons[idx - 1].id);
                return (
                    <button key={lesson.id} disabled={!isUnlocked} onClick={() => setCurrentLesson(lesson)} className={`w-full p-5 text-left flex gap-4 border-b border-white/5 transition-all ${isActive ? 'bg-zinc-900 border-l-2 border-[#C9A66B]' : ''} ${!isUnlocked ? 'opacity-20' : 'hover:bg-zinc-900/50'}`}>
                        <div className="mt-1">{!isUnlocked ? <Lock size={12}/> : completedLessons.has(lesson.id) ? <CheckCircle size={14} className="text-green-500"/> : <Play size={14}/>}</div>
                        <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-zinc-500'}`}>{lesson.title}</span>
                </button>
              );
            })}
          </div>
        </div>
    </div>
  );
}
