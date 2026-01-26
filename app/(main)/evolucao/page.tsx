"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Zap, Trophy, PlayCircle } from "lucide-react";

export default function EvolucaoPage() {
  const supabase = createClientComponentClient();
  const [courses, setCourses] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // 1. Busca Saldo Total (Rede + Pessoal)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("coins, personal_coins")
          .eq("id", user.id)
          .single();

        if (profile) {
          const total = (profile.coins || 0) + (profile.personal_coins || 0);
          setTotalBalance(total);
        }
      }

      // 2. Busca Cursos
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: true });

      if (coursesData) {
        setCourses(coursesData);
      }

      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  return (
    <div className="p-6 md:p-10 space-y-8 min-h-screen bg-[#0A0A0A] text-white">
      {/* Header e Saldo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            EVOLUÇÃO <span className="text-[#C9A66B]">PRO</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Invista seus PROs para desbloquear conhecimento.
          </p>
        </div>

        {/* Card de Saldo */}
        <div className="bg-[#111] border border-[#333] px-8 py-4 rounded-xl flex items-center gap-4 shadow-lg shadow-black/50">
          <div className="p-3 bg-[#C9A66B]/10 rounded-full">
            <Trophy className="w-8 h-8 text-[#C9A66B]" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Seu Saldo</p>
            <div className="text-2xl font-bold text-white">
              {loading ? (
                <span className="animate-pulse">...</span>
              ) : (
                `${totalBalance} PRO`
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Cursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Link href={`/evolucao/${course.code}`} key={course.id} className="group">
            <div className="relative h-64 bg-gradient-to-b from-[#161616] to-black border border-[#222] rounded-2xl overflow-hidden hover:border-[#C9A66B]/50 transition-all duration-300 shadow-lg group-hover:shadow-[#C9A66B]/10">
              
              {/* Badge Código */}
              <div className="absolute top-4 left-4 bg-[#C9A66B] text-black text-[10px] font-bold px-2 py-1 rounded shadow-md z-10">
                MÓDULO {course.code.replace('MOD_', '')}
              </div>

              {/* Placeholder ou Imagem */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity">
                {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                    <PlayCircle className="w-20 h-20 text-gray-600" />
                )}
              </div>

              {/* Conteúdo Rodapé */}
              <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                <h3 className="text-lg font-bold text-white mb-2 leading-tight">
                  {course.title}
                </h3>
                <div className="flex items-center gap-2 text-[#C9A66B] font-medium text-sm">
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Ganhe {course.reward_amount} PRO</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
