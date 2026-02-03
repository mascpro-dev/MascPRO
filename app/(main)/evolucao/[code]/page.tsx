"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, Play, ListVideo, Clock } from "lucide-react";
import Link from "next/link";

export default function PlayerPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);

  useEffect(() => {
    async function loadContent() {
      // O parametro da URL é o código (ex: MOD_VENDAS ou mod_welcome)
      const codeFromUrl = params?.code as string; 
      
      // 1. Busca dados do CURSO (Capa, Titulo)
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .or(`code.eq.${codeFromUrl},slug.eq.${codeFromUrl}`) // Tenta achar pelo código ou slug
        .single();

      if (courseError || !courseData) {
        setLoading(false);
        return;
      }

      setCourse(courseData);

      // 2. Busca as AULAS usando o course_code (NOVO PADRÃO)
      // O 'code' do curso precisa bater com o 'course_code' da lesson
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_code", courseData.code) // <--- BUSCA PELO CÓDIGO AGORA
        .order("sequence_order", { ascending: true });

      if (lessonsData && lessonsData.length > 0) {
        setLessons(lessonsData);
        setCurrentLesson(lessonsData[0]);
      }

      setLoading(false);
    }

    if (params?.code) loadContent();
  }, [params, supabase]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando conteúdo...</div>;

  if (!course) return <div className="min-h-screen bg-black text-white p-10">Curso não encontrado. <Link href="/evolucao" className="underline">Voltar</Link></div>;

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
          
          {/* ÁREA DO VÍDEO */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-black">
              <div className="max-w-5xl mx-auto">
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-[#333] shadow-2xl mb-6 relative group">
                    {currentLesson?.video_id ? (
                        // NOVO: Constrói o link usando o ID
                        <iframe 
                            src={`https://www.youtube.com/embed/${currentLesson.video_id}`} 
                            title={currentLesson.title}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111]">
                            <Play size={48} className="text-gray-700 mb-2" />
                            <p className="text-gray-500 text-sm">Selecione uma aula ao lado.</p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <h1 className="text-2xl font-bold text-white">
                            {currentLesson?.title || course.title}
                        </h1>
                        {currentLesson?.durations_minutos > 0 && (
                             <span className="flex items-center gap-1 text-xs text-gray-500 bg-[#111] px-2 py-1 rounded border border-[#222]">
                                <Clock size={12} /> {currentLesson.durations_minutos} min
                             </span>
                        )}
                    </div>
                    
                    <p className="text-gray-400 leading-relaxed text-sm">
                        {currentLesson?.description || course.description}
                    </p>
                    
                    {/* Botão de Material da AULA (Google Drive) */}
                    {currentLesson?.material_url && (
                        <a href={currentLesson.material_url} target="_blank" className="inline-flex items-center gap-2 text-[#C9A66B] hover:text-white text-sm font-bold border border-[#C9A66B]/30 px-4 py-2 rounded-lg hover:bg-[#C9A66B]/10 transition-colors">
                            <Download size={16} /> Baixar Material da Aula
                        </a>
                    )}
                </div>
              </div>
          </div>

          {/* LISTA DE AULAS */}
          <div className="w-full md:w-80 bg-[#0a0a0a] border-l border-[#222] overflow-y-auto shrink-0">
              <div className="p-4 border-b border-[#222]">
                  <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center gap-2">
                      <ListVideo size={14} /> Conteúdo do Módulo
                  </h3>
              </div>
              
              <div className="flex flex-col">
                  {lessons.length === 0 ? (
                      <div className="p-6 text-center text-gray-600 text-sm">Nenhuma aula encontrada.</div>
                  ) : (
                      lessons.map((lesson, idx) => {
                          const isActive = currentLesson?.id === lesson.id;
                          return (
                              <button 
                                key={lesson.id}
                                onClick={() => setCurrentLesson(lesson)}
                                className={`p-4 text-left border-b border-[#1a1a1a] transition-colors hover:bg-[#111] flex gap-3 group
                                    ${isActive ? 'bg-[#161616] border-l-4 border-l-[#C9A66B]' : 'border-l-4 border-l-transparent'}
                                `}
                              >
                                  <div className="mt-1">
                                      {isActive ? <Play size={14} className="text-[#C9A66B] fill-[#C9A66B]" /> : <span className="text-xs text-gray-600 font-mono">{String(idx + 1).padStart(2, '0')}</span>}
                                  </div>
                                  <div>
                                      <h4 className={`text-sm font-medium leading-tight mb-1 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                          {lesson.title}
                                      </h4>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-600">Aula {lesson.sequence_order}</span>
                                        {lesson.durations_minutos > 0 && <span className="text-[10px] text-gray-700">• {lesson.durations_minutos}m</span>}
                                      </div>
                                  </div>
                              </button>
                          )
                      })
                  )}
              </div>
          </div>

      </div>
    </div>
  );
}
