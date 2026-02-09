"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Play, CheckCircle, Lock, ListVideo, Trophy, FileText, Download, MessageSquare, Heart, Reply, Send, User } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

declare global {
  interface Window {
    YT: any;
  }
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
  const [videoStarted, setVideoStarted] = useState(false);
  const [justEarned, setJustEarned] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'sobre' | 'materiais'>('sobre');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const playerRef = useRef<any>(null);

  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setCurrentUser(session.user);

        const { data: courseData } = await supabase.from("courses").select("*").or(`code.eq.${params.code},slug.eq.${params.code}`).single();
        if (!courseData) throw new Error("Curso não encontrado.");
        setCourse(courseData);

        const { data: lessonsData } = await supabase.from("lessons").select("*").eq("course_code", courseData.code).order("sequence_order", { ascending: true });

        const completedSet = new Set<string>();
        if (session) {
          const { data: progressData } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", session.user.id);
          progressData?.forEach((p: any) => completedSet.add(p.lesson_id));
        }
        
        setCompletedLessons(completedSet);
        setLessons(lessonsData || []);
        setCurrentLesson(lessonsData?.[0] || null);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadContent();
  }, [params.code, supabase]);

  useEffect(() => {
    if (currentLesson?.id) loadComments();
  }, [currentLesson]);

  async function loadComments() {
    if (!currentLesson?.id) return;
    const { data } = await supabase.from('comments').select('*, profiles(full_name, avatar_url)').eq('lesson_id', currentLesson.id).order('created_at', { ascending: true });
    setComments(data || []);
  }

  const handleFinish = async () => {
    if (!currentLesson?.id) return;
    // Chamada segura ao banco (SQL que criamos)
    const { data, error } = await supabase.rpc('process_lesson_completion', { lesson_uuid: currentLesson.id });
    if (!error && data?.success) {
        setJustEarned(true);
        const newSet = new Set(completedLessons);
        newSet.add(currentLesson.id);
        setCompletedLessons(newSet);
        router.refresh();
    }
  };

  useEffect(() => {
    if (videoStarted && currentLesson?.video_id && window.YT) {
        if (playerRef.current) { try { playerRef.current.destroy(); } catch(e){} }
        playerRef.current = new window.YT.Player('ninja-player', {
            videoId: currentLesson.video_id,
            height: '100%', width: '100%',
            playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 },
            events: { 'onStateChange': (event: any) => { if (event.data === 0) handleFinish(); } }
        });
    }
  }, [videoStarted, currentLesson, handleFinish]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    const { error } = await supabase.from('comments').insert({
        lesson_id: currentLesson.id,
        user_id: currentUser.id,
        content: newComment,
        parent_id: replyingTo
    });
    if (!error) { setNewComment(""); setReplyingTo(null); loadComments(); }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden">
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />

      {/* HEADER */}
      <div className="h-16 border-b border-[#222] flex items-center px-6 justify-between bg-[#0a0a0a] shrink-0">
          <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={18} /> <span className="text-xs font-bold uppercase tracking-widest italic">Voltar</span>
          </Link>
          <div className="text-xs font-black text-[#C9A66B] uppercase tracking-[0.2em] italic">{course?.title}</div>
          <div className="w-10"></div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black custom-scrollbar">
              <div className="max-w-4xl mx-auto pb-20">

                {/* PLAYER */}
                <div className="aspect-video w-full bg-[#050505] rounded-3xl overflow-hidden border border-[#1a1a1a] mb-8 relative shadow-2xl">
                    {videoStarted ? (
                        <div id="ninja-player" className="w-full h-full"></div>
                    ) : (
                        <button onClick={() => setVideoStarted(true)} className="absolute inset-0 flex flex-col items-center justify-center group">
                            <img src={`https://img.youtube.com/vi/${currentLesson?.video_id}/maxresdefault.jpg`} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                            <div className="w-24 h-24 bg-[#C9A66B] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(201,166,107,0.4)] group-hover:scale-110 transition-transform z-10">
                                <Play size={32} className="text-black ml-1 fill-black" />
                            </div>
                        </button>
                    )}
                </div>

                {/* TÍTULO E BADGE PRO */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">{currentLesson?.title}</h1>
                        <p className="text-sm text-gray-500 font-medium tracking-tight">Evoluindo em {course?.title}</p>
                    </div>
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-black border transition-all duration-500 shadow-xl
                        ${justEarned ? 'bg-[#C9A66B] text-black border-[#C9A66B]' : 'bg-[#111] text-[#C9A66B] border-[#222]'}
                    `}>
                        <Trophy size={18} /> {justEarned ? "+10 PRO RECEBIDO!" : completedLessons.has(currentLesson?.id) ? "PRO ADQUIRIDO" : "+10 PRO"}
                    </div>
                </div>

                {/* ABAS: DESCRIÇÃO E MATERIAIS */}
                <div className="mb-12">
                    <div className="flex border-b border-[#1a1a1a] mb-6">
                        <button onClick={() => setActiveTab('sobre')} className={`pb-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === 'sobre' ? 'text-[#C9A66B]' : 'text-gray-600 hover:text-gray-400'}`}>
                            Sobre a Aula
                            {activeTab === 'sobre' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C9A66B]"></div>}
                        </button>
                        <button onClick={() => setActiveTab('materiais')} className={`pb-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all ${activeTab === 'materiais' ? 'text-[#C9A66B]' : 'text-gray-600 hover:text-gray-400'}`}>
                            Materiais
                            {activeTab === 'materiais' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C9A66B]"></div>}
                        </button>
                    </div>

                    <div className="bg-[#0a0a0a] border border-[#111] rounded-2xl p-6 min-h-[120px] shadow-inner">
                        {activeTab === 'sobre' ? (
                            <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{currentLesson?.description || "Aproveite esta aula para subir seu nível."}</p>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-4 text-gray-600">
                                <FileText size={32} className="mb-2 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest">Nenhum material disponível</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* COMENTÁRIOS COM DATA REAL */}
                <div className="mt-12">
                    <h3 className="text-xl font-black text-white uppercase italic mb-8 flex items-center gap-3 tracking-tighter">
                        <MessageSquare className="text-[#C9A66B]" size={20} /> Dúvidas ({comments.length})
                    </h3>
                    
                    <div className="flex gap-4 mb-10">
                        <textarea 
                            value={newComment} onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Escreva sua dúvida..."
                            className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl p-4 text-sm text-white focus:border-[#C9A66B] outline-none min-h-[80px] transition-all"
                        />
                        <button onClick={handlePostComment} className="bg-[#C9A66B] text-black px-6 rounded-xl hover:bg-white transition-all active:scale-95"><Send size={20}/></button>
                    </div>

                    <div className="space-y-6">
                        {comments.map((c) => (
                            <div key={c.id} className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 rounded-2xl hover:border-[#333] transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#111] border border-[#333] overflow-hidden flex items-center justify-center">
                                            {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" /> : <User size={16} className="text-gray-600" />}
                                        </div>
                                        <span className="font-bold text-sm text-white tracking-tight">{c.profiles?.full_name || "Membro PRO"}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-600 font-bold uppercase">
                                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                                    </span>
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed">{c.content}</p>
                            </div>
                        ))}
                    </div>
                </div>

              </div>
          </div>

          {/* PLAYLIST LATERAL COM TRAVA SEQUENCIAL */}
          <div className="w-full md:w-85 bg-[#050505] border-l border-[#1a1a1a] overflow-y-auto shrink-0 md:h-full h-96">
              <div className="p-6 border-b border-[#1a1a1a] sticky top-0 bg-[#050505] z-10">
                <h3 className="font-black text-gray-500 text-[10px] uppercase tracking-[0.3em] italic">Playlist do Módulo</h3>
              </div>
              <div className="flex flex-col">
                {lessons.map((lesson, idx) => {
                    const isActive = currentLesson?.id === lesson.id;
                    const isCompleted = completedLessons.has(lesson.id);
                    const isUnlocked = idx === 0 || completedLessons.has(lessons[idx - 1].id);

                    return (
                        <button key={lesson.id} disabled={!isUnlocked} onClick={() => isUnlocked && setCurrentLesson(lesson)} 
                            className={`p-5 text-left border-b border-[#111] transition-all flex gap-4 ${isActive ? 'bg-[#0f0f0f] border-l-4 border-l-[#C9A66B]' : 'border-l-4 border-l-transparent'} ${!isUnlocked ? 'opacity-20 grayscale cursor-not-allowed' : 'hover:bg-[#0a0a0a]'}`}
                        >
                            <div className="mt-1">{!isUnlocked ? <Lock size={14} className="text-gray-800" /> : isCompleted ? <CheckCircle size={16} className="text-green-500" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-800" />}</div>
                            <div className="flex-1">
                                <h4 className={`text-sm font-bold tracking-tight ${isActive ? 'text-white' : 'text-gray-600'}`}>{lesson.title}</h4>
                                {!isUnlocked && <span className="text-[9px] text-[#C9A66B] font-black uppercase tracking-widest block mt-1">Bloqueada</span>}
                            </div>
                        </button>
                    )
                })}
              </div>
          </div>
      </div>
    </div>
  );
}
