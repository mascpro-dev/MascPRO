"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, Play, CheckCircle, Lock, ListVideo, Send, MessageSquare, User, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function PlayerPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  
  // Estados de Dados
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  
  // Estados de Comentários
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Estado para controlar o Player Premium (Lite Embed)
  const [isPlaying, setIsPlaying] = useState(false);

  // 1. CARREGAR CONTEÚDO
  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        const codeFromUrl = params?.code as string;
        
        if (!codeFromUrl) throw new Error("Código do curso inválido.");

        // A. Busca Curso
        const { data: courseData, error: courseError } = await supabase
            .from("courses")
            .select("*")
            .or(`code.eq.${codeFromUrl},slug.eq.${codeFromUrl}`)
            .single();

        if (courseError || !courseData) throw new Error("Curso não encontrado.");
        setCourse(courseData);

        // B. Busca Aulas
        const { data: lessonsData, error: lessonsError } = await supabase
            .from("lessons")
            .select("*")
            .eq("course_code", courseData.code)
            .order("sequence_order", { ascending: true });

        // C. Busca Progresso
        const { data: { session } } = await supabase.auth.getSession();
        const completedSet = new Set<string>();
        if (session) {
            const { data: progressData } = await supabase
                .from("lesson_progress")
                .select("lesson_id")
                .eq("user_id", session.user.id);
            progressData?.forEach((p: any) => completedSet.add(p.lesson_id));
        }
        setCompletedLessons(completedSet);

        // Define Aula Atual
        if (lessonsData && lessonsData.length > 0) {
            setLessons(lessonsData);
            const firstUnwatched = lessonsData.find((l: any) => !completedSet.has(l.id));
            setCurrentLesson(firstUnwatched || lessonsData[0]);
        }

      } catch (err: any) {
        console.error("Erro fatal:", err);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (params?.code) loadContent();
  }, [params, supabase]);

  // 2. CARREGAR COMENTÁRIOS
  useEffect(() => {
    if (!currentLesson?.id) return;
    // Reseta o player ao trocar de aula
    setIsPlaying(false);
    
    async function loadComments() {
        const { data } = await supabase
            .from("lesson_comments")
            .select(`*, profiles:user_id ( full_name, avatar_url )`) 
            .eq("lesson_id", currentLesson.id)
            .order("created_at", { ascending: false });
        setComments(data || []);
    }
    loadComments();
  }, [currentLesson, supabase]);


  // AÇÕES
  const handleMarkAsCompleted = async () => {
    if (!currentLesson) return;
    const newSet = new Set(completedLessons);
    newSet.add(currentLesson.id);
    setCompletedLessons(newSet);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from("lesson_progress").upsert({
            user_id: user.id,
            lesson_id: currentLesson.id
        }, { onConflict: 'user_id, lesson_id' });
    }

    const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
    if (currentIndex < lessons.length - 1) {
        setCurrentLesson(lessons[currentIndex + 1]);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !currentLesson) return;
    setSendingComment(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { error } = await supabase.from("lesson_comments").insert({
            lesson_id: currentLesson.id,
            user_id: user.id,
            content: newComment
        });
        if (!error) {
            setNewComment("");
            const { data } = await supabase
                .from("lesson_comments")
                .select("*, profiles:user_id(full_name, avatar_url)")
                .eq("lesson_id", currentLesson.id)
                .order("created_at", { ascending: false });
            setComments(data || []);
        }
    }
    setSendingComment(false);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;
  if (errorMsg) return <div className="min-h-screen bg-black flex items-center justify-center text-red-500">{errorMsg}</div>;
  if (!course) return <div className="min-h-screen bg-black text-white p-10">Curso não encontrado.</div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden">
      
      {/* HEADER */}
      <div className="h-16 border-b border-[#222] flex items-center px-6 justify-between bg-[#111] shrink-0">
          <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={20} /> <span className="text-sm font-bold uppercase hidden md:inline">Voltar</span>
          </Link>
          <div className="text-sm font-bold text-[#C9A66B] uppercase tracking-wider truncate mx-4">
              {course.title}
          </div>
          <div className="w-10"></div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          
          {/* ÁREA PRINCIPAL */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black scrollbar-hide">
              <div className="max-w-4xl mx-auto pb-20">
                
                {/* --- PLAYER PREMIUM (LITE) --- */}
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-[#333] shadow-2xl mb-6 relative group">
                    {currentLesson?.video_id ? (
                        isPlaying ? (
                            <iframe 
                                src={`https://www.youtube.com/embed/${currentLesson.video_id}?autoplay=1&controls=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`} 
                                title={currentLesson.title}
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                        ) : (
                            // MÁSCARA / CAPA (Carrega super rápido)
                            <div 
                                className="absolute inset-0 cursor-pointer group"
                                onClick={() => setIsPlaying(true)}
                            >
                                {/* Thumbnail do YouTube em Alta Resolução */}
                                <img 
                                    src={`https://img.youtube.com/vi/${currentLesson.video_id}/maxresdefault.jpg`} 
                                    alt="Capa da Aula"
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                                {/* Botão de Play Dourado Centralizado */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-20 h-20 bg-[#C9A66B]/90 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(201,166,107,0.4)] group-hover:scale-110 transition-transform">
                                        <Play size={32} className="text-black ml-1 fill-black" />
                                    </div>
                                </div>
                                {/* Gradiente inferior para dar acabamento */}
                                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent"></div>
                            </div>
                        )
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]">
                            <Play size={48} className="text-gray-700 mb-2" />
                            <p className="text-gray-500 text-sm">Aula sem vídeo.</p>
                        </div>
                    )}
                </div>

                {/* INFO E AÇÕES */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#222] pb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">{currentLesson?.title}</h1>
                        <p className="text-sm text-gray-500">Módulo: {course.title}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {(currentLesson?.material_url || course?.material_url) && (
                            <a href={currentLesson?.material_url || course?.material_url} target="_blank" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] text-gray-300 hover:text-white transition-all text-sm font-medium">
                                <Download size={16} /> Material
                            </a>
                        )}

                        <button 
                            onClick={handleMarkAsCompleted}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all
                                ${completedLessons.has(currentLesson?.id) 
                                    ? 'bg-green-600/20 text-green-500 border border-green-600/50 cursor-default' 
                                    : 'bg-[#C9A66B] hover:bg-[#b08d55] text-black shadow-[0_0_15px_rgba(201,166,107,0.3)]'}
                            `}
                        >
                            {completedLessons.has(currentLesson?.id) ? <> <CheckCircle size={18} /> Concluída </> : <> <CheckCircle size={18} /> Concluir Aula </>}
                        </button>
                    </div>
                </div>

                <div className="bg-[#111] p-6 rounded-xl border border-[#222] mb-10">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Sobre esta aula</h3>
                    <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">{currentLesson?.description || "Sem descrição."}</p>
                </div>

                {/* COMENTÁRIOS */}
                <div className="mt-10">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <MessageSquare size={20} className="text-[#C9A66B]" /> Dúvidas e Comentários
                    </h3>
                    <div className="flex gap-4 mb-8">
                        <div className="flex-1 relative">
                            <textarea 
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Dúvidas? Escreva aqui..."
                                className="w-full bg-[#111] border border-[#333] rounded-lg p-4 text-sm text-white focus:outline-none focus:border-[#C9A66B] min-h-[100px] resize-none"
                            />
                            <div className="absolute bottom-3 right-3">
                                <button onClick={handleSendComment} disabled={sendingComment || !newComment.trim()} className="bg-[#C9A66B] p-2 rounded-full text-black hover:bg-[#b08d55] disabled:opacity-50">
                                    {sendingComment ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        {comments.length === 0 ? <p className="text-gray-600 text-sm text-center py-4">Nenhuma dúvida por enquanto.</p> : comments.map((comment) => (
                            <div key={comment.id} className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center shrink-0 border border-[#333] overflow-hidden">
                                    {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} alt="User" className="w-full h-full object-cover" /> : <User size={20} className="text-gray-500" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-sm text-gray-200">{comment.profiles?.full_name || "Aluno MascPRO"}</span>
                                        <span className="text-xs text-gray-600">{new Date(comment.created_at).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm bg-[#111] p-3 rounded-lg border border-[#222]">{comment.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

              </div>
          </div>

          {/* LISTA LATERAL */}
          <div className="w-full md:w-80 bg-[#0a0a0a] border-l border-[#222] overflow-y-auto shrink-0 md:h-full h-96">
              <div className="p-4 border-b border-[#222] bg-[#0a0a0a] sticky top-0 z-10">
                  <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2"><ListVideo size={14} /> Conteúdo</h3>
              </div>
              <div className="flex flex-col pb-20">
                  {lessons.map((lesson, idx) => {
                      const isActive = currentLesson?.id === lesson.id;
                      const isCompleted = completedLessons.has(lesson.id);
                      const isUnlocked = idx === 0 || completedLessons.has(lessons[idx - 1].id);
                      return (
                          <button key={lesson.id} disabled={!isUnlocked} onClick={() => isUnlocked && setCurrentLesson(lesson)} className={`p-4 text-left border-b border-[#1a1a1a] transition-colors flex gap-3 group ${isActive ? 'bg-[#161616] border-l-4 border-l-[#C9A66B]' : 'border-l-4 border-l-transparent'} ${!isUnlocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-[#111] cursor-pointer'}`}>
                              <div className="mt-1">
                                  {!isUnlocked ? <Lock size={14} className="text-gray-600" /> : isCompleted ? <CheckCircle size={14} className="text-green-500" /> : isActive ? <Play size={14} className="text-[#C9A66B] fill-[#C9A66B]" /> : <span className="text-xs text-gray-600 font-mono">{String(idx + 1).padStart(2, '0')}</span>}
                              </div>
                              <div>
                                  <h4 className={`text-sm font-medium mb-1 ${isActive ? 'text-white' : 'text-gray-400'} ${isUnlocked && 'group-hover:text-gray-200'}`}>{lesson.title}</h4>
                                  <span className="text-[10px] text-gray-600">{lesson.durations_minutos > 0 ? `${lesson.durations_minutos} min` : 'Vídeo'}</span>
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
