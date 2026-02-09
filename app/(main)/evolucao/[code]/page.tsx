"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useState, useRef, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Play, CheckCircle, Lock, ListVideo, Trophy, FileText, Download, MessageSquare, Heart, Reply, Send, MoreVertical, AtSign, User, Info } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from "next/image";

declare global {
  interface Window {
    YT: any;
  }
}

// Componente para o texto com menções
const MentionTextarea = ({ value, onChange, onSubmit, placeholder, users = [] }: any) => {
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
  
    const handleInputChange = (e: any) => {
      const newValue = e.target.value;
      onChange(newValue);
  
      const lastWord = newValue.split(' ').pop();
      if (lastWord.startsWith('@') && lastWord.length > 1) {
        setMentionQuery(lastWord.slice(1).toLowerCase());
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    };
  
    const insertMention = (userName: string) => {
      const words = value.split(' ');
      words.pop();
      const newValue = words.join(' ') + ` @${userName} `;
      onChange(newValue);
      setShowMentions(false);
      textareaRef.current?.focus();
    };
  
    const filteredUsers = users.filter((u: any) => u.full_name?.toLowerCase().includes(mentionQuery));
  
    return (
      <div className="relative w-full">
        <div className="relative flex items-center">
            <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl p-4 pr-12 text-sm text-white focus:border-[#C9A66B] outline-none resize-none min-h-[60px]"
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                e.preventDefault();
                onSubmit();
                }
            }}
            />
            <button 
                onClick={onSubmit}
                disabled={!value.trim()}
                className="absolute right-3 p-2 bg-[#C9A66B] text-black rounded-lg hover:bg-[#b08d55] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Send size={18} />
            </button>
        </div>
        
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-0 w-64 bg-[#111] border border-[#222] rounded-lg shadow-xl mb-2 overflow-hidden z-50">
            {filteredUsers.map((user: any) => (
              <button
                key={user.id}
                onClick={() => insertMention(user.full_name)}
                className="flex items-center gap-3 p-3 w-full hover:bg-[#222] transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#333] overflow-hidden">
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt={user.full_name} width={32} height={32} className="object-cover" />
                  ) : (
                    <AtSign className="w-full h-full p-2 text-gray-500" />
                  )}
                </div>
                <span className="text-sm font-bold truncate">{user.full_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estados para Abas e Comentários
  const [activeTab, setActiveTab] = useState<'sobre' | 'materiais'>('sobre');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const playerRef = useRef<any>(null);

  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/login'); return; }
        setCurrentUser(session.user);

        const { data: courseData } = await supabase.from("courses").select("*").or(`code.eq.${params.code},slug.eq.${params.code}`).single();
        if (!courseData) throw new Error("Curso não encontrado.");
        setCourse(courseData);

        const { data: lessonsData } = await supabase.from("lessons").select("*").eq("course_code", courseData.code).order("sequence_order", { ascending: true });

        const completedSet = new Set<string>();
        const { data: progressData } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", session.user.id);
        progressData?.forEach((p: any) => completedSet.add(p.lesson_id));
        
        setCompletedLessons(completedSet);
        setLessons(lessonsData || []);
        setCurrentLesson(lessonsData?.[0] || null);

        // Carregar usuários para menção
        const { data: usersData } = await supabase.from('profiles').select('id, full_name, avatar_url');
        setAllUsers(usersData || []);

      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadContent();
  }, [params.code, router, supabase]);

  const loadComments = useCallback(async () => {
    if (!currentLesson?.id) return;
    
    const { data } = await supabase
        .from('comments')
        .select('*, profiles(full_name, avatar_url)')
        .eq('lesson_id', currentLesson.id)
        .order('created_at', { ascending: true });
    
    // Organiza em árvore (comentários e respostas)
    const commentTree = data?.filter(c => !c.parent_id).map(comment => ({
        ...comment,
        replies: data.filter(reply => reply.parent_id === comment.id)
    })) || [];

    setComments(commentTree);
  }, [currentLesson, supabase]);

  // Carregar comentários quando a aula muda
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleFinish = useCallback(async () => {
    if (!currentLesson?.id) return;
    
    setErrorMsg(null);
    const { data, error } = await supabase.rpc('process_lesson_completion', {
        lesson_uuid: currentLesson.id
    });

    if (error || (data && !data.success)) {
        setErrorMsg(data?.message || "Erro ao validar evolução.");
        return;
    }

    setJustEarned(true);
    setCompletedLessons(prev => {
      const newSet = new Set(prev);
      newSet.add(currentLesson.id);
      return newSet;
    });

    router.refresh();

    setTimeout(() => {
        setLessons(prevLessons => {
            const currentIndex = prevLessons.findIndex(l => l.id === currentLesson.id);
            if (currentIndex < prevLessons.length - 1) {
                setCurrentLesson(prevLessons[currentIndex + 1]);
                setJustEarned(false);
                setVideoStarted(true);
            }
            return prevLessons;
        });
    }, 2500);
  }, [currentLesson, supabase, router]);

  useEffect(() => {
    if (videoStarted && currentLesson?.video_id && window.YT) {
        if (playerRef.current) { try { playerRef.current.destroy(); } catch(e){} }
        playerRef.current = new window.YT.Player('ninja-player', {
            videoId: currentLesson.video_id,
            height: '100%', width: '100%',
            playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0 },
            events: {
              'onStateChange': (event: any) => {
                if (event.data === 0) handleFinish();
              }
            }
        });
    }
  }, [videoStarted, currentLesson, handleFinish]);

  const handlePostComment = async (parentId: string | null = null, content: string) => {
    if (!content.trim() || !currentUser) return;

    const { error } = await supabase.from('comments').insert({
        lesson_id: currentLesson.id,
        user_id: currentUser.id,
        content: content,
        parent_id: parentId
    });

    if (!error) {
        setNewComment("");
        setReplyingTo(null);
        loadComments();
    }
  };

  const handleLikeComment = async (commentId: string) => {
    // Lógica simplificada de like (apenas visual por enquanto, precisaria de uma tabela 'comment_likes')
    console.log("Like no comentário:", commentId);
    // Aqui você implementaria a chamada real ao banco para dar/tirar o like
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden">
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />

      <div className="h-16 border-b border-[#222] flex items-center px-6 justify-between bg-[#0a0a0a] shrink-0">
          <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={18} /> <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
          </Link>
          <div className="text-xs font-black text-[#C9A66B] uppercase tracking-[0.2em] truncate">{course?.title}</div>
          <div className="w-10"></div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black custom-scrollbar">
              <div className="max-w-4xl mx-auto pb-20">

                {errorMsg && (
                    <div className="bg-red-900/20 border border-red-800 text-red-500 p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2">
                        <Lock size={16} /> {errorMsg}
                    </div>
                )}

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

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">{currentLesson?.title}</h1>
                        <p className="text-sm text-gray-500 font-medium">Foco total na sua evolução.</p>
                    </div>
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-black border transition-all duration-500
                        ${justEarned ? 'bg-[#C9A66B] text-black border-[#C9A66B]' : 'bg-[#111] text-[#C9A66B] border-[#222]'}
                    `}>
                        <Trophy size={18} /> {justEarned ? "+10 PRO RECEBIDO!" : completedLessons.has(currentLesson?.id) ? "PRO ADQUIRIDO" : "+10 PRO"}
                    </div>
                </div>

                {/* ABAS DE CONTEÚDO E MATERIAIS */}
                <div className="mb-12">
                    <div className="flex border-b border-[#222] mb-6">
                        <button
                            onClick={() => setActiveTab('sobre')}
                            className={`pb-4 px-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'sobre' ? 'text-[#C9A66B]' : 'text-gray-500 hover:text-white'}`}
                        >
                            <FileText size={16} className="inline mr-2 mb-0.5" /> Sobre a Aula
                            {activeTab === 'sobre' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C9A66B]"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('materiais')}
                            className={`pb-4 px-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === 'materiais' ? 'text-[#C9A66B]' : 'text-gray-500 hover:text-white'}`}
                        >
                            <Download size={16} className="inline mr-2 mb-0.5" /> Materiais de Apoio
                            {activeTab === 'materiais' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C9A66B]"></div>}
                        </button>
                    </div>

                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 min-h-[200px]">
                        {activeTab === 'sobre' ? (
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4">Descrição</h3>
                                <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">
                                    {currentLesson?.description || "Nenhuma descrição disponível para esta aula."}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-lg font-bold text-white mb-4">Downloads Disponíveis</h3>
                                {currentLesson?.materials && currentLesson.materials.length > 0 ? (
                                    <div className="space-y-3">
                                        {currentLesson.materials.map((material: any, index: number) => (
                                            <a 
                                                key={index}
                                                href={material.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-4 p-4 bg-[#111] border border-[#222] rounded-xl hover:border-[#C9A66B]/50 transition-all group"
                                            >
                                                <div className="bg-[#222] p-3 rounded-lg text-[#C9A66B] group-hover:bg-[#C9A66B] group-hover:text-black transition-all">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white">{material.title}</h4>
                                                    <p className="text-xs text-gray-500 uppercase font-bold mt-1">Clique para baixar</p>
                                                </div>
                                                <Download size={20} className="ml-auto text-gray-500 group-hover:text-[#C9A66B]" />
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 flex items-center gap-2"><Info size={16} /> Nenhum material de apoio para esta aula.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ÁREA DE COMENTÁRIOS */}
                <div className="mt-12">
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-8 flex items-center gap-3">
                        <MessageSquare className="text-[#C9A66B]" /> Dúvidas e Comentários ({comments.length})
                    </h3>
                    
                    {/* Caixa de Novo Comentário */}
                    <div className="flex gap-4 mb-10">
                        <div className="w-10 h-10 rounded-full bg-[#222] border border-[#333] overflow-hidden shrink-0">
                            {currentUser?.user_metadata?.avatar_url ? (
                                <Image src={currentUser.user_metadata.avatar_url} alt={currentUser.user_metadata.full_name} width={40} height={40} className="object-cover" />
                            ) : (
                                <User className="w-full h-full p-2 text-gray-500" />
                            )}
                        </div>
                        <MentionTextarea
                            value={newComment}
                            onChange={setNewComment}
                            onSubmit={() => handlePostComment(null, newComment)}
                            placeholder="Escreva sua dúvida ou comentário... (Use @ para marcar alguém)"
                            users={allUsers}
                        />
                    </div>

                    {/* Lista de Comentários */}
                    <div className="space-y-8">
                        {comments.map((comment) => (
                            <div key={comment.id} className="group">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#222] border border-[#333] overflow-hidden shrink-0">
                                        {comment.profiles?.avatar_url ? (
                                            <Image src={comment.profiles.avatar_url} alt={comment.profiles.full_name} width={40} height={40} className="object-cover" />
                                        ) : (
                                            <User className="w-full h-full p-2 text-gray-500" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 relative group-hover:border-[#333] transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-bold text-white flex items-center gap-2">
                                                    {comment.profiles?.full_name || "Usuário"}
                                                    {comment.user_id === course?.instructor_id && (
                                                        <span className="bg-[#C9A66B] text-black text-[10px] px-2 py-0.5 rounded-full font-black uppercase">Instrutor</span>
                                                    )}
                                                </h4>
                                                <span className="text-xs text-gray-600 font-medium">
                                                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                                                </span>
                                            </div>
                                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                                            
                                            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#1a1a1a]">
                                                <button onClick={() => handleLikeComment(comment.id)} className="flex items-center gap-1 text-xs text-gray-500 font-bold uppercase hover:text-[#C9A66B] transition-colors">
                                                    <Heart size={14} /> Curtir
                                                </button>
                                                <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="flex items-center gap-1 text-xs text-gray-500 font-bold uppercase hover:text-[#C9A66B] transition-colors">
                                                    <Reply size={14} /> Responder
                                                </button>
                                            </div>
                                        </div>

                                        {/* Caixa de Resposta */}
                                        {replyingTo === comment.id && (
                                            <div className="mt-4 ml-4 flex gap-4">
                                                 <div className="w-8 h-8 rounded-full bg-[#222] border border-[#333] overflow-hidden shrink-0">
                                                    {currentUser?.user_metadata?.avatar_url ? (
                                                        <Image src={currentUser.user_metadata.avatar_url} alt={currentUser.user_metadata.full_name} width={32} height={32} className="object-cover" />
                                                    ) : (
                                                        <User className="w-full h-full p-2 text-gray-500" />
                                                    )}
                                                </div>
                                                <MentionTextarea
                                                    value={newComment}
                                                    onChange={setNewComment}
                                                    onSubmit={() => handlePostComment(comment.id, newComment)}
                                                    placeholder={`Respondendo a ${comment.profiles?.full_name}...`}
                                                    users={allUsers}
                                                />
                                            </div>
                                        )}

                                        {/* Respostas Aninhadas */}
                                        {comment.replies?.length > 0 && (
                                            <div className="mt-4 ml-6 space-y-4 pl-4 border-l-2 border-[#1a1a1a]">
                                                {comment.replies.map((reply: any) => (
                                                    <div key={reply.id} className="flex gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-[#222] border border-[#333] overflow-hidden shrink-0">
                                                            {reply.profiles?.avatar_url ? (
                                                                <Image src={reply.profiles.avatar_url} alt={reply.profiles.full_name} width={32} height={32} className="object-cover" />
                                                            ) : (
                                                                <User className="w-full h-full p-2 text-gray-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <h4 className="font-bold text-white text-sm">{reply.profiles?.full_name || "Usuário"}</h4>
                                                                <span className="text-[10px] text-gray-600 font-medium">
                                                                    {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ptBR })}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-300 text-sm">{reply.content}</p>
                                                            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#1a1a1a]">
                                                                <button onClick={() => handleLikeComment(reply.id)} className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase hover:text-[#C9A66B] transition-colors">
                                                                    <Heart size={12} /> Curtir
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

              </div>
          </div>

          {/* LISTA DE AULAS COM TRAVA REAL (Mantida) */}
          <div className="w-full md:w-85 bg-[#050505] border-l border-[#1a1a1a] overflow-y-auto shrink-0 md:h-full h-96 custom-scrollbar">
              <div className="p-6 border-b border-[#1a1a1a] bg-[#050505] sticky top-0 z-10">
                <h3 className="font-black text-gray-500 text-[10px] uppercase tracking-[0.3em] flex items-center gap-2"><ListVideo size={14} /> Playlist</h3>
              </div>
              <div className="flex flex-col">
                {lessons.map((lesson, idx) => {
                    const isActive = currentLesson?.id === lesson.id;
                    const isCompleted = completedLessons.has(lesson.id);
                    const isUnlocked = idx === 0 || completedLessons.has(lessons[idx - 1].id);

                    return (
                        <button
                            key={lesson.id}
                            disabled={!isUnlocked}
                            onClick={() => isUnlocked && setCurrentLesson(lesson)}
                            className={`p-5 text-left border-b border-[#111] transition-all flex gap-4
                                ${isActive ? 'bg-[#0f0f0f] border-l-4 border-l-[#C9A66B]' : 'border-l-4 border-l-transparent'}
                                ${!isUnlocked ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-[#0a0a0a] cursor-pointer'}
                            `}
                        >
                            <div className="mt-1">
                                {!isUnlocked ? <Lock size={14} className="text-gray-700" /> : isCompleted ? <CheckCircle size={16} className="text-green-500" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-800" />}
                            </div>
                            <div className="flex-1">
                                <h4 className={`text-sm font-bold leading-tight ${isActive ? 'text-white' : 'text-gray-500'}`}>{lesson.title}</h4>
                                {!isUnlocked && <span className="text-[9px] text-[#C9A66B] font-black uppercase tracking-widest mt-1 block">Bloqueada</span>}
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
