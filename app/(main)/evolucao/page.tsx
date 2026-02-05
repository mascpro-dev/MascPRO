"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Play, Lock, Trophy, Loader2, BookOpen } from "lucide-react";
import Link from "next/link";

export default function EvolucaoPage() {
  const supabase = createClientComponentClient();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
      setLoading(true);
      const { data } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: true }); // Assume ordem de criação como ordem dos módulos
      setCourses(data || []);
      setLoading(false);
    }
    loadCourses();
  }, []);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter flex items-center gap-4">
          <Play className="text-[#C9A66B] fill-[#C9A66B]" size={32} /> Minha Evolução
        </h1>
        <p className="text-gray-500 mt-2 font-medium">Domine as técnicas e acumule pontos PRO para subir no ranking.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course, index) => {
          // TRAVA: Módulo 1 e 2 (index 0 e 1) abertos, o resto travado
          const isLocked = index > 1;

          return (
            <div key={course.id} className="relative group">
              <Link 
                href={isLocked ? "#" : `/evolucao/${course.code}`}
                className={`block bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl overflow-hidden transition-all 
                  ${isLocked ? 'cursor-not-allowed' : 'hover:border-[#C9A66B]/50 hover:scale-[1.02]'}
                `}
              >
                {/* Imagem do Módulo */}
                <div className="aspect-video w-full relative">
                  <img 
                    src={course.image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop"} 
                    className={`w-full h-full object-cover transition-all duration-500 ${isLocked ? 'grayscale opacity-30' : 'group-hover:scale-110'}`}
                  />
                  
                  {/* Overlay de Cadeado se estiver travado */}
                  {isLocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                      <div className="bg-black/80 p-4 rounded-full border border-white/10 shadow-2xl">
                        <Lock className="text-[#C9A66B]" size={32} />
                      </div>
                      <span className="text-white font-black text-xs uppercase mt-4 tracking-[0.2em]">Módulo Bloqueado</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                </div>

                {/* Info do Módulo */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-[#C9A66B] text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">
                      Módulo {index + 1}
                    </span>
                    {!isLocked && (
                      <span className="text-[#C9A66B] text-[10px] font-bold uppercase flex items-center gap-1">
                        <BookOpen size={10} /> Disponível
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{course.title}</h3>
                  <p className="text-gray-500 text-xs line-clamp-2">{course.description}</p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
