"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Zap, PlayCircle, Image } from "lucide-react";

// Componente de Card de Curso
function CourseCard({ course }: { course: any }) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={`/evolucao/${course.code || course.id}`}
      className="group bg-gradient-to-b from-[#111827] to-black border border-gray-800 rounded-xl overflow-hidden hover:border-[#C9A66B]/30 transition-all duration-300"
    >
      {/* Badge Superior */}
      {course.code && (
        <div className="px-4 pt-4">
          <div className="inline-block bg-[#C9A66B]/20 border border-[#C9A66B]/40 rounded px-2 py-1">
            <p className="text-[#C9A66B] text-[10px] font-bold uppercase tracking-wider">
              MÓDULO {course.code}
            </p>
          </div>
        </div>
      )}

      {/* Centro: Imagem ou Placeholder */}
      <div className="aspect-video bg-black/40 flex items-center justify-center relative overflow-hidden">
        {course.thumbnail_url && !imageError ? (
          <img
            src={course.thumbnail_url}
            alt={course.title || "Thumbnail do curso"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[#111827] via-[#1a1a2e] to-black" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Image 
                className="w-16 h-16 text-white/10 group-hover:text-white/20 transition-colors" 
                size={64}
              />
            </div>
          </>
        )}
      </div>

      {/* Rodapé do Card */}
      <div className="p-6 space-y-3">
        {/* Título */}
        <h3 className="font-bold text-white text-base leading-tight">
          {course.title || "Módulo de Conteúdo"}
        </h3>

        {/* Recompensa */}
        <div className="flex items-center gap-2 text-[#C9A66B]">
          <Zap size={14} className="flex-shrink-0" />
          <span className="text-sm font-semibold">
            Ganhe {course.reward_amount || 50} PRO
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function EvolucaoPage() {
  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  
  const supabase = createClientComponentClient();

  // Buscar profile do usuário
  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          
          setProfile(data);
        }
      } catch (error) {
        console.error("Erro ao buscar profile:", error);
      } finally {
        setLoading(false);
      }
    }
    getProfile();
  }, [supabase]);

  // Buscar courses da tabela courses
  useEffect(() => {
    async function getCourses() {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .order("created_at", { ascending: true });
        
        if (error) {
          console.error("Erro ao buscar courses:", error);
        } else {
          setCourses(data || []);
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setCoursesLoading(false);
      }
    }
    getCourses();
  }, [supabase]);

  // Calcular saldo real: coins + personal_coins
  const balance = loading ? null : ((profile?.coins || 0) + (profile?.personal_coins || 0));

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header & Saldo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Título e Subtítulo - Esquerda */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase">
            EVOLUÇÃO <span className="text-[#C9A66B]">PRO</span>
          </h1>
          <p className="text-white/80 text-sm md:text-base">
            Invista seus PROs para desbloquear conhecimento.
          </p>
        </div>

        {/* Card de Saldo - Direita */}
        <div className="bg-gradient-to-br from-[#111827] to-black border border-gray-800 rounded-2xl px-6 py-4 md:px-8 md:py-6 w-full md:w-auto min-w-[280px]">
          <div className="flex items-center gap-4">
            <Trophy className="text-[#C9A66B] w-8 h-8 md:w-10 md:h-10 flex-shrink-0" />
            <div className="flex-1">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                  <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
                </div>
              ) : (
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-1">SEU SALDO</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter">
                      {balance !== null ? formatNumber(balance) : "0"}
                    </p>
                    <span className="text-lg md:text-xl font-bold text-[#C9A66B] ml-1">PRO</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Módulos (Cards) */}
      {coursesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gradient-to-b from-[#111827] to-black border border-gray-800 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-video bg-white/5" />
              <div className="p-6 space-y-4">
                <div className="h-4 w-32 bg-white/10 rounded" />
                <div className="h-3 w-24 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/60">Nenhum curso disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
