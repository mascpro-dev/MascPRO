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

  // 1. CARREGAR CONTEÚDO
  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        const codeFromUrl = params?.code as string; // Pega da URL: /evolucao/[code]
        
        if (!codeFromUrl) {
           // Se for array (erro raro), pega o primeiro item
           throw new Error("Código do curso inválido.");
        }

        console.log("▶️ Buscando curso:", codeFromUrl);

        // A. Busca Curso
        const { data: courseData, error: courseError } = await supabase
            .from("courses")
            .select("*")
            .or(`code.eq.${codeFromUrl},slug.eq.${codeFromUrl}`)
            .single();

        if (courseError || !courseData) {
            console.error("❌ Erro curso:", courseError);
            throw new Error("Curso não encontrado no sistema.");
        }
        setCourse(courseData);

        // B. Busca Aulas (Usando course_code)
        // Atenção: Sua tabela usa 'course_code', então buscamos por ele.
        const { data: lessonsData, error: lessonsError } = await supabase
            .from("lessons")
            .select("*")
            .eq("course_code", courseData.code)
            .order("sequence_order", { ascending: true });

        if (lessonsError) {
             console.error("❌ Erro aulas:", lessonsError);
        }

        // C. Busca Progresso (Só se tiver usuário logado)
        const { data: { session } } = await supabase.auth.getSession();
        
        const completedSet = new Set<string>();
        if (session) {
            const { data: progressData } = await supabase
                .from("lesson_progress")
                .select("lesson_id")
                .eq("user_id", session.user.id); // Garante filtro por usuário

            progressData?.forEach((p: any) => completedSet.add(p.lesson_id));
        }
        setCompletedLessons(completedSet);

        // Define Aula Atual
        if (lessonsData && lessonsData.length > 0) {
            setLessons(lessonsData);
            // Tenta achar a primeira aula que NÃO está na lista de completas
            const firstUnwatched = lessonsData.find((l: any) => !completedSet.has(l.id));
            setCurrentLesson(firstUnwatched || lessonsData[0]);
        }

      } catch (err: any) {
        console.error("❌ Erro fatal:", err);
        setErrorMsg(err.message || "Erro desconhecido ao carregar.");
      } finally {
        setLoading(false);
      }
    }
    if (params?.code) loadContent();
  }, [params, supabase]);

  // 2. CARREGAR COMENTÁRIOS
  useEffect(() => {
    if (!currentLesson?.id) return;
    
    async function loadComments() {
        const { data, error } = await supabase
            .from("lesson_comments")
            .select(`
                *,
                profiles:user_id ( full_name, avatar_url )
            `) 
            .eq("lesson_id", currentLesson.id)
            .order("created_at", { ascending: false });
        
        if (error) {
            console.error("⚠️ Erro comentários (pode ignorar se tabela vazia):", error);
        }
        setComments(data || []);
    }
    loadComments();
  }, [currentLesson, supabase]);


  // AÇÕES
  const handleMarkAsCompleted = async () => {
    if (!currentLesson) return;
    
    // 1. Atualiza visualmente na hora (Feedback rápido)
    const newSet = new Set(completedLessons);
    newSet.add(currentLesson.id);
    setCompletedLessons(newSet);

    // 2. Salva no banco
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from("lesson_progress").upsert({
            user_id: user.id,
            lesson_id: currentLesson.id
        }, { onConflict: 'user_id, lesson_id' });
    }

    // 3. Avança para próxima aula
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
            // Recarrega comentários manualmente para aparecer na hora
            const { data } = await supabase
                .from("lesson_comments")
                .select("*, profiles:user_id(full_name, avatar_url)")
                .eq("lesson_id", currentLesson.id)
                .order("created_at", { ascending: false });
            setComments(data || []);
        } else {
            alert("Erro ao enviar. Verifique se você está logado.");
        }
    }
    setSendingComment(false);
  };

  // ----- RENDERIZAÇÃO -----

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando conteúdo...</div>;
  
  if (errorMsg) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-500 p-6 text-center">
        <AlertTriangle size={48} className="mb-4" />
        <h2 className="text-xl font-bold mb-2">Ops! Algo deu errado.</h2>
        <p className="text-gray-400 mb-6">{errorMsg}</p>
        <Link href="/evolucao" className="text-[#C9A66B] underline hover:text-white">Voltar para Evolução</Link>
    </div>
  );

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
          
          {/* ÁREA PRINCIPAL (Esquerda - Scrollável) */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black scrollbar-hide">
              <div className="max-w-4xl mx-auto pb-20">
                
                {/* 1. PLAYER DE VÍDEO (Iframe Seguro) */}
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-[#333] shadow-2xl mb-6 relative group">
                    {currentLesson?.video_id ? (
                        <iframe 
                            // Monta o link do YouTube limpando a interface
                            src={`https://www.youtube.com/embed/${currentLesson.video_id}?controls=1&modestbranding=1&rel=0&showinfo=0`} 
                            title={currentLesson.title}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]">
                            <Play size={48} className="text-gray-700 mb-2" />
                            <p className="text-gray-500 text-sm">Esta aula ainda não tem vídeo.</p>
                        </div>
                    )}
                </div>

                {/* 2. TÍTULO E BOTÕES DE AÇÃO */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-[#222] pb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">
                            {currentLesson?.title || "Aula sem título"}
                        </h1>
                        <p className="text-sm text-gray-500">Módulo: {course.title}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Botão MATERIAL (Aparece se tiver link na aula ou no curso) */}
                        {(currentLesson?.material_url || course?.material_url) && (
                            <a 
                                href={currentLesson?.material_url || course?.material_url} 
                                target="_blank" 
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] text-gray-300 hover:text-white transition-all text-sm font-medium"
                            >
                                <Download size={16} /> Material
                            </a>
                        )}

                        {/* Botão CONCLUIR */}
                        <button 
                            onClick={handleMarkAsCompleted}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all
                                ${completedLessons.has(currentLesson?.id) 
                                    ? 'bg-green-600/20 text-green-500 border border-green-600/50 cursor-default' 
                                    : 'bg-[#C9A66B] hover:bg-[#b08d55] text-black shadow-[0_0_15px_rgba(201,166,107,0.3)]'}
                            `}
                        >
                            {completedLessons.has(currentLesson?.id) ? (
                                <> <CheckCircle size={18} /> Concluída </>
                            ) : (
                                <> <CheckCircle size={18} /> Concluir Aula </>
                            )}
                        </button>
                    </div>
                </div>

                {/* 3. DESCRIÇÃO */}
                <div className="bg-[#111] p-6 rounded-xl border border-[#222] mb-10">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Sobre esta aula</h3>
                    <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">
                        {currentLesson?.description || "Sem descrição disponível."}
                    </p>
                </div>

                {/* 4. DÚVIDAS E COMENTÁRIOS */}
                <div className="mt-10">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <MessageSquare size={20} className="text-[#C9A66B]" /> Dúvidas e Comentários
                    </h3>

                    {/* Campo de Digitar */}
                    <div className="flex gap-4 mb-8">
                        <div className="flex-1 relative">
                            <textarea 
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Tem alguma dúvida? Escreva aqui..."
                                className="w-full bg-[#111] border border-[#333] rounded-lg p-4 text-sm text-white focus:outline-none focus:border-[#C9A66B] min-h-[100px] resize-none"
                            />
                            <div className="absolute bottom-3 right-3">
                                <button 
                                    onClick={handleSendComment}
                                    disabled={sendingComment || !newComment.trim()}
                                    className="bg-[#C9A66B] p-2 rounded-full text-black hover:bg-[#b08d55] disabled:opacity-50 transition-colors"
                                >
                                    {sendingComment ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Comentários */}
                    <div className="space-y-6">
                        {comments.length === 0 ? (
                            <p className="text-gray-600 text-sm text-center py-4">Nenhuma dúvida por enquanto.</p>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center shrink-0 border border-[#333] overflow-hidden">
                                        {comment.profiles?.avatar_url ? (
                                            <img src={comment.profiles.avatar_url} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={20} className="text-gray-500" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm text-gray-200">
                                                {comment.profiles?.full_name || "Aluno MascPRO"}
                                            </span>
                                            <span className="text-xs text-gray-600">
                                                {/* DATA FORMATADA SEM BIBLIOTECA EXTRA */}
                                                {new Date(comment.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-sm bg-[#111] p-3 rounded-lg border border-[#222]">
                                            {comment.content}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

              </div>
          </div>

          {/* BARRA LATERAL (Direita) - Lista de Aulas */}
          <div className="w-full md:w-80 bg-[#0a0a0a] border-l border-[#222] overflow-y-auto shrink-0 md:h-full h-96">
              <div className="p-4 border-b border-[#222] bg-[#0a0a0a] sticky top-0 z-10">
                  <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2">
                      <ListVideo size={14} /> Conteúdo
                  </h3>
              </div>
              <div className="flex flex-col pb-20">
                  {lessons.map((lesson, idx) => {
                      const isActive = currentLesson?.id === lesson.id;
                      const isCompleted = completedLessons.has(lesson.id);
                      
                      // Regra de Bloqueio: Libera a 1ª aula (index 0) OU se a anterior já foi completada.
                      const isUnlocked = idx === 0 || completedLessons.has(lessons[idx - 1].id);

                      return (
                          <button 
                            key={lesson.id}
                            disabled={!isUnlocked}
                            onClick={() => isUnlocked && setCurrentLesson(lesson)}
                            className={`p-4 text-left border-b border-[#1a1a1a] transition-colors flex gap-3 group
                                ${isActive ? 'bg-[#161616] border-l-4 border-l-[#C9A66B]' : 'border-l-4 border-l-transparent'}
                                ${!isUnlocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-[#111] cursor-pointer'}
                            `}
                          >
                              <div className="mt-1">
                                  {!isUnlocked ? <Lock size={14} className="text-gray-600" /> : 
                                   isCompleted ? <CheckCircle size={14} className="text-green-500" /> :
                                   isActive ? <Play size={14} className="text-[#C9A66B] fill-[#C9A66B]" /> :
                                   <span className="text-xs text-gray-600 font-mono">{String(idx + 1).padStart(2, '0')}</span>}
                              </div>
                              <div>
                                  <h4 className={`text-sm font-medium mb-1 ${isActive ? 'text-white' : 'text-gray-400'} ${isUnlocked && 'group-hover:text-gray-200'}`}>
                                    {lesson.title}
                                  </h4>
                                  <span className="text-[10px] text-gray-600">
                                    {lesson.durations_minutos > 0 ? `${lesson.durations_minutos} min` : 'Vídeo Aula'}
                                  </span>
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
