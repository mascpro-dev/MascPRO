"use client";

// --- CONFIGURAÇÃO VERCEL ---
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, Play, CheckCircle, Lock, ListVideo, Send, MessageSquare, User, Info, HelpCircle, FileText, Clock } from "lucide-react";
import Link from "next/link";
import Script from "next/script"; // Importante para a API do YouTube

// Tipagem global
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export default function PlayerPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  
  // DADOS
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  // PLAYER
  const [isPlaying, setIsPlaying] = useState(false); // Controla Capa vs Vídeo
  const playerRef = useRef<any>(null);

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
        // Usuários para o @
        const { data: usersData } = await supabase.from("profiles").select("id, full_name, avatar_url").limit(300); 
        setAllUsers(usersData || []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadContent();
  }, [params]);

  // 2. RESETAR AO MUDAR AULA
  useEffect(() => {
    if (!currentLesson?.id) return;
    setIsPlaying(false); // Volta para a capa
    setActiveTab("sobre");
    
    async function loadComments() {
        const { data } = await supabase.from("lesson_comments").select(`*, profiles:user_id ( full_name, avatar_url )`).eq("lesson_id", currentLesson.id).order("created_at", { ascending: false });
        setComments(data || []);
    }
    loadComments();
  }, [currentLesson]);

  // 3. INICIALIZAR YOUTUBE (USANDO OS PARÂMETROS QUE VOCÊ PEDIU)
  useEffect(() => {
    if (isPlaying && currentLesson?.video_id && window.YT) {
        // Pequeno delay para garantir que a DIV existe
        setTimeout(() => {
            if (playerRef.current) { try { playerRef.current.destroy(); } catch(e){} }
            
            // AQUI ESTÁ A MÁGICA: Usamos a API mas com SEUS parâmetros
            playerRef.current = new window.YT.Player('youtube-player-div', {
                videoId: currentLesson.video_id,
                height: '100%',
                width: '100%',
                host: 'https://www.youtube-nocookie.com', // Tenta usar o dominio nocookie
                playerVars: {
                    autoplay: 1,      
                    controls: 1,       // Você pediu controls=1
                    modestbranding: 1, // Você pediu modestbranding=1
                    rel: 0,            // Você pediu rel=0
                    fs: 1,             // Você pediu fs=1
                    disablekb: 1,      // Você pediu disablekb=1
                    playsinline: 1,    // Você pediu playsinline=1
                    iv_load_policy: 3  // Você pediu iv_load_policy=3
                },
                events: {
                    'onStateChange': onPlayerStateChange
                }
            });
        }, 50);
    }
  }, [isPlaying]);

  // 4. LÓGICA AUTOMÁTICA (Fim do Vídeo)
  const onPlayerStateChange = async (event: any) => {
    // 0 = ENDED (Acabou)
    if (event.data === 0) {
        // Marca Verde
        const newSet = new Set(completedLessons);
        newSet.add(currentLesson.id);
        setCompletedLessons(newSet);

        // Salva no Banco
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from("lesson_progress").upsert({
                user_id: user.id,
                lesson_id: currentLesson.id
            }, { onConflict: 'user_id, lesson_id' });
        }

        // Próxima aula (3s delay)
        setTimeout(() => {
            const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
            if (currentIndex < lessons.length - 1) {
                setCurrentLesson(lessons[currentIndex + 1]);
            }
        }, 3000);
    }
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
                
                {/* 1. PLAYER (HÍBRIDO: Visual do seu código + Lógica da API) */}
                <div 
                    key={currentLesson?.id} 
                    className="relative w-full pb-[56.25%] bg-[#000] rounded-xl overflow-hidden border border-[#333] shadow-2xl mb-6 group"
                >
                    {currentLesson?.video_id ? (
                        <>
                            {isPlaying ? (
                                // DIV QUE VIRA O SEU IFRAME (Via API)
                                <div id="youtube-player-div" className="absolute inset-0 h-full w-full rounded-lg"></div>
                            ) : (
                                // CAPA DOURADA (Clica para carregar o seu player)
                                <button 
                                    onClick={() => setIsPlaying(true)}
                                    className="absolute inset-0 w-full h-full cursor-pointer z-10 flex flex-col items-center justify-center group"
                                >
                                    <img 
                                        src={`https://img.youtube.com/vi/${currentLesson.video_id}/hqdefault.jpg`} 
                                        alt="Capa"
                                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                                    />
                                    <div className="w-24 h-24 bg-[#C9A66B] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(201,166,107,0.6)] group-hover:scale-110 transition-transform duration-300 z-20">
                                        <Play size={36} className="text-black ml-1 fill-black" />
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]">
                            <Play size={48} className="text-gray-700 mb-2" />
                            <p className="text-gray-500 text-sm">Aula sem vídeo.</p>
                        </div>
                    )}
                </div>

                {/* 2. INFO (Sem botão concluir) */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{currentLesson?.title}</h1>
                        <p className="text-sm text-gray-500">Módulo: {course.title}</p>
                    </div>
                    {/* Badge Automática */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border
                        ${completedLessons.has(currentLesson?.id) ? 'bg-green-900/20 text-green-500 border-green-800' : 'bg-[#222] text-gray-400 border-[#333]'}
                    `}>
                        {completedLessons.has(currentLesson?.id) ? <><CheckCircle size={14} /> Concluída</> : <><Clock size={14} /> Em andamento</>}
                    </div>
                </div>

                {/* 3. MENU DE ABAS */}
                <div className="flex items-center gap-6 border-b border-[#222] mb-6 overflow-x-auto">
                    <button onClick={() => setActiveTab("sobre")} className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === "sobre" ? "border-[#C9A66B] text-[#C9A66B]" : "border-transparent text-gray-500 hover:text-gray-300"}`}><Info size={16} /> Sobre</button>
                    <button onClick={() => setActiveTab("duvidas")} className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === "duvidas" ? "border-[#C9A66B] text-[#C9A66B]" : "border-transparent text-gray-500 hover:text-gray-300"}`}><HelpCircle size={16} /> Dúvidas ({comments.length})</button>
                    <button onClick={() => setActiveTab("material")} className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === "material" ? "border-[#C9A66B] text-[#C9A66B]" : "border-transparent text-gray-500 hover:text-gray-300"}`}><FileText size={16} /> Material</button>
                </div>

                {/* 4. CONTEÚDO DAS ABAS */}
                <div className="min-h-[200px]">
                    {activeTab === "sobre" && (
                        <div className="bg-[#111] p-6 rounded-xl border border-[#222] animate-in fade-in">
                             <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">{currentLesson?.description || "Sem descrição."}</p>
                        </div>
                    )}
                    {activeTab === "material" && (
                        <div className="bg-[#111] p-6 rounded-xl border border-[#222] animate-in fade-in">
                            {(currentLesson?.material_url || course?.material_url) ? (
                                <div className="flex flex-col gap-3">
                                    <p className="text-gray-400 text-sm mb-2">Download disponível:</p>
                                    <a href={currentLesson?.material_url || course?.material_url} target="_blank" className="flex items-center gap-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#333] hover:border-[#C9A66B] hover:bg-[#222] transition-all group">
                                        <div className="w-10 h-10 bg-[#C9A66B]/10 rounded-full flex items-center justify-center text-[#C9A66B] group-hover:scale-110 transition-transform"><Download size={20} /></div>
                                        <div><h4 className="font-bold text-gray-200 text-sm">Baixar Arquivo</h4><p className="text-xs text-gray-500">Google Drive / PDF</p></div>
                                    </a>
                                </div>
                            ) : (<div className="text-center py-8 text-gray-500"><p>Sem material extra.</p></div>)}
                        </div>
                    )}
                    {activeTab === "duvidas" && (
                        <div className="animate-in fade-in relative">
                            <div className="flex gap-4 mb-8">
                                <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center shrink-0 border border-[#333]"><User size={20} className="text-gray-500" /></div>
                                <div className="flex-1 relative">
                                    <textarea value={newComment} onChange={handleCommentChange} placeholder="Use @ para marcar alguém..." className="w-full bg-[#111] border border-[#333] rounded-lg p-4 text-sm text-white focus:outline-none focus:border-[#C9A66B] min-h-[100px] resize-none" />
                                    {showMentions && (
                                        <div className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl w-64 max-h-48 overflow-y-auto z-50">
                                            {allUsers.length === 0 ? <div className="px-4 py-2 text-xs text-gray-500">Carregando lista...</div> : 
                                                allUsers.filter(u => u.full_name?.toLowerCase().includes(mentionQuery)).map(user => (
                                                    <button key={user.id} onClick={() => insertMention(user)} className="w-full text-left px-4 py-3 hover:bg-[#333] flex items-center gap-3 text-sm border-b border-[#222] last:border-0 transition-colors">
                                                        <div className="w-6 h-6 rounded-full bg-[#333] overflow-hidden flex items-center justify-center">{user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : <User size={12}/>}</div>
                                                        <span className="truncate font-medium text-gray-300">{user.full_name}</span>
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    )}
                                    <div className="absolute bottom-3 right-3"><button onClick={handleSendComment} disabled={sendingComment || !newComment.trim()} className="bg-[#C9A66B] p-2 rounded-full text-black hover:bg-[#b08d55] disabled:opacity-50 transition-colors">{sendingComment ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}</button></div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-4 group">
                                        <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center shrink-0 border border-[#333] overflow-hidden">{comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" /> : <User size={20} className="text-gray-500" />}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1"><span className="font-bold text-sm text-[#C9A66B]">{comment.profiles?.full_name || "Membro"}</span><span className="text-xs text-gray-600">{new Date(comment.created_at).toLocaleDateString('pt-BR')}</span></div>
                                            <div className="text-gray-300 text-sm bg-[#111] p-3 rounded-lg border border-[#222]">{comment.content.split(" ").map((word:string, i:number) => word.startsWith("@") ? <span key={i} className="text-blue-400 font-bold">{word} </span> : word + " ")}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              </div>
          </div>

          {/* DIREITA: Lista de Aulas */}
          <div className="w-full md:w-80 bg-[#0a0a0a] border-l border-[#222] overflow-y-auto shrink-0 md:h-full h-96">
              <div className="p-4 border-b border-[#222] bg-[#0a0a0a] sticky top-0 z-10"><h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2"><ListVideo size={14} /> Conteúdo</h3></div>
              <div className="flex flex-col pb-20">
                  {lessons.map((lesson, idx) => {
                      const isActive = currentLesson?.id === lesson.id;
                      const isCompleted = completedLessons.has(lesson.id);
                      const isUnlocked = idx === 0 || completedLessons.has(lessons[idx - 1].id);
                      return (
                          <button key={lesson.id} disabled={!isUnlocked} onClick={() => isUnlocked && setCurrentLesson(lesson)} className={`p-4 text-left border-b border-[#1a1a1a] transition-colors flex gap-3 group ${isActive ? 'bg-[#161616] border-l-4 border-l-[#C9A66B]' : 'border-l-4 border-l-transparent'} ${!isUnlocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-[#111] cursor-pointer'}`}>
                              <div className="mt-1">{!isUnlocked ? <Lock size={14} className="text-gray-600" /> : isCompleted ? <CheckCircle size={14} className="text-green-500" /> : isActive ? <Play size={14} className="text-[#C9A66B] fill-[#C9A66B]" /> : <span className="text-xs text-gray-600 font-mono">{String(idx + 1).padStart(2, '0')}</span>}</div>
                              <div><h4 className={`text-sm font-medium mb-1 ${isActive ? 'text-white' : 'text-gray-400'} ${isUnlocked && 'group-hover:text-gray-200'}`}>{lesson.title}</h4><span className="text-[10px] text-gray-600">{lesson.durations_minutos > 0 ? `${lesson.durations_minutos} min` : 'Vídeo'}</span></div>
                          </button>
                      )
                  })}
              </div>
          </div>
      </div>
    </div>
  );
}
