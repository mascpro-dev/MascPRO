"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Zap, Trophy, ImageIcon } from "lucide-react";

export default function EvolucaoPage() {
  const supabase = createClientComponentClient();
  const [course, setCourse] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        console.log("Iniciando carregamento...");

        // 1. Busca Saldo
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profile) {
            setTotalBalance((profile.coins || 0) + (profile.personal_coins || 0));
          }
        }

        // 2. Busca Cursos (CORRIGIDO PARA SINGULAR: 'course')
        // O erro dizia que a tabela certa é 'course'
        const { data: coursesData, error } = await supabase
          .from("course") 
          .select("*")
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Erro Supabase:", error);
          // Tentativa de emergência: se falhar, tenta sem ordenar
          const { data: retry } = await supabase.from("course").select("*");
          if (retry) setCourses(retry);
        } else {
          setCourses(courseData || []);
        }

      } catch (e) {
        console.error("Erro fatal:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  return (
    <div className="p-6 md:p-10 min-h-screen bg-[#000000] text-white font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-extrabold italic tracking-wide">
            EVOLUÇÃO <span className="text-[#C9A66B]">PRO</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Invista seus PROs para desbloquear conhecimento.
          </p>
        </div>

        {/* Card Saldo */}
        <div className="border border-[#C9A66B]/30 bg-black rounded-xl px-6 py-3 flex items-center gap-4 min-w-[280px]">
           <div className="flex flex-col">
              <span className="text-[10px] text-[#C9A66B] font-bold tracking-widest uppercase mb-1">Seu Saldo</span>
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-white" />
                <span className="text-2xl font-bold text-white">
                  {loading ? "..." : `${totalBalance} PRO`}
                </span>
              </div>
           </div>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {!loading && courses.length === 0 && (
            <div className="col-span-3 text-center py-10 text-gray-500 border border-gray-800 rounded-lg">
                Nenhum curso encontrado na tabela 'course'.
            </div>
        )}

        {courses.map((c) => (
          // Usa c.code se existir, senão usa c.id para o link não quebrar
          <Link href={`/evolucao/${c.code || c.id}`} key={c.id} className="block group">
            <div className="relative h-[320px] rounded-2xl overflow-hidden border border-[#1F2937] transition-all duration-300 hover:border-[#C9A66B]/50 hover:shadow-lg hover:shadow-[#C9A66B]/10">
              
              <div className="absolute inset-0 bg-gradient-to-b from-[#111827] to-[#050505] z-0" />

              <div className="absolute top-6 left-6 z-10">
                <span className="bg-[#D1C4A9] text-black text-[10px] font-bold px-3 py-1.5 rounded-md uppercase tracking-wide">
                  {c.code ? `MÓDULO ${c.code.replace('MOD_', '')}` : 'MÓDULO'}
                </span>
              </div>

              <div className="absolute inset-0 flex items-center justify-center z-10 opacity-10 group-hover:opacity-20 transition-opacity">
                <ImageIcon className="w-24 h-24 text-white" />
              </div>

              <div className="absolute bottom-0 inset-x-0 p-6 z-10">
                <h3 className="text-xl font-bold text-white mb-3 leading-tight">
                  {c.title}
                </h3>
                <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                  <Zap className="w-4 h-4 text-[#C9A66B] fill-[#C9A66B]" />
                  <span>Ganhe {c.reward_amount || 50} PRO</span>
                </div>
              </div>

            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
