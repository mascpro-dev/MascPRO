"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Play, Loader2, BookOpen, Lock } from "lucide-react";
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
        .order("created_at", { ascending: true });
      setCourses(data || []);
      setLoading(false);
    }
    loadCourses();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
    </div>
  );

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter flex items-center gap-4">
          <Play className="text-[#C9A66B] fill-[#C9A66B]" size={32} /> Minha Evolução
        </h1>
        <p className="text-gray-500 mt-2 font-medium">Sua jornada para se tornar um profissional de elite começa aqui.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course, index) => {
          // TRAVA: Módulo 1 e 2 abertos, o resto bloqueado no clique
          const isLocked = index > 1;

          return (
            <div key={course.id} className="group">
              <Link 
                href={isLocked ? "#" : `/evolucao/${course.code}`}
                onClick={(e) => isLocked && e.preventDefault()}
                className={`block bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl overflow-hidden transition-all duration-300
                  ${isLocked ? 'opacity-80 cursor-not-allowed' : 'hover:border-[#C9A66B]/50 hover:shadow-[0_0_30px_rgba(201,166,107,0.1)]'}
                `}
              >
                {/* Imagem do Módulo (Visual Original Limpo) */}
                <div className="aspect-video w-full relative overflow-hidden">
                  <img 
                    src={course.image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop"} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={course.title}
                  />
                  
                  {/* Badge de Status */}
                  <div className="absolute top-4 right-4">
                    {isLocked ? (
                      <div className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/10">
                        <Lock size={16} className="text-[#C9A66B]" />
                      </div>
                    ) : (
                      <div className="bg-[#C9A66B] text-black text-[10px] font-black px-3 py-1 rounded-full uppercase">
                        Liberado
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                </div>

                {/* Info do Módulo */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[#C9A66B] text-[10px] font-black uppercase tracking-widest">
                      Módulo {index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#C9A66B] transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
