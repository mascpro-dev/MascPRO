"use client";

import { Shield, Star, Award, GraduationCap, Lock, CheckCircle } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function JornadaPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isEmbaixador, setIsEmbaixador] = useState(false);

  useEffect(() => {
    async function checkEmbaixador() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, work_type")
          .eq("id", session.user.id)
          .single();
        
        // Verifica se é embaixador
        const embaixador = profile?.role === "embaixador" || profile?.work_type === "embaixador" || 
                          profile?.role === "EMBAIXADOR" || profile?.work_type === "EMBAIXADOR";
        
        setIsEmbaixador(embaixador || false);
        
        // Se não for embaixador, redireciona
        if (!embaixador) {
          router.push("/");
        }
      } else {
        router.push("/login");
      }
      setLoading(false);
    }
    checkEmbaixador();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white/60">Carregando...</div>
      </div>
    );
  }

  if (!isEmbaixador) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] space-y-12 animate-in fade-in duration-700 pb-24">
      
      {/* CABEÇALHO */}
      <div className="space-y-3">
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight leading-tight">
          MINHA JORNADA
        </h1>
        <p className="text-white/70 text-sm md:text-base font-medium">
          Progressão formal e autoridade real no ecossistema MASC PRO.
        </p>
      </div>

      {/* SEÇÃO 1: LISTA DE PROGRESSO (VERTICAL) */}
      <div className="space-y-4">
        {/* CERTIFIED - Ativo/Dourado */}
        <div className="bg-[#111] border border-white/10 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#C9A66B] text-black flex items-center justify-center">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="font-black text-white text-lg uppercase tracking-tight">CERTIFIED</h3>
              <p className="text-xs text-white/60 mt-1">Fundação técnica e cultural.</p>
            </div>
          </div>
        </div>

        {/* EXPERT - Ativo/Branco */}
        <div className="bg-[#111] border border-white/10 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-white text-black flex items-center justify-center">
              <Star size={24} />
            </div>
            <div>
              <h3 className="font-black text-white text-lg uppercase tracking-tight">EXPERT</h3>
              <p className="text-xs text-white/60 mt-1">Domínio avançado.</p>
            </div>
          </div>
        </div>

        {/* MASTER TÉCNICO - Bloqueado */}
        <div className="bg-[#111] border border-white/5 rounded-xl p-5 flex items-center justify-between opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-zinc-900 text-zinc-600 flex items-center justify-center">
              <Award size={24} />
            </div>
            <div>
              <h3 className="font-black text-zinc-600 text-lg uppercase tracking-tight">MASTER TÉCNICO</h3>
              <p className="text-xs text-zinc-700 mt-1">Autoridade técnica.</p>
            </div>
          </div>
          <Lock size={20} className="text-zinc-700" />
        </div>

        {/* EDUCADOR MASC PRO - Bloqueado */}
        <div className="bg-[#111] border border-white/5 rounded-xl p-5 flex items-center justify-between opacity-60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-zinc-900 text-zinc-600 flex items-center justify-center">
              <GraduationCap size={24} />
            </div>
            <div>
              <h3 className="font-black text-zinc-600 text-lg uppercase tracking-tight">EDUCADOR MASC PRO</h3>
              <p className="text-xs text-zinc-700 mt-1">Formador de novos líderes.</p>
            </div>
          </div>
          <Lock size={20} className="text-zinc-700" />
        </div>
      </div>

      {/* SEÇÃO 2: INTELIGÊNCIA PRO */}
      <div className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-black text-[#C9A66B] uppercase tracking-tight">
          INTELIGÊNCIA PRO
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: CABELEIREIRO */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-5">
            <span className="inline-block bg-[#8B6F47] text-white text-xs font-black uppercase px-4 py-2 rounded-full">
              CABELEIREIRO
            </span>
            <ul className="space-y-3">
              <li className="flex gap-3 items-start text-sm text-white/80">
                <CheckCircle size={18} className="text-[#C9A66B] shrink-0 mt-0.5" />
                <span>Constância e aplicação técnica</span>
              </li>
              <li className="flex gap-3 items-start text-sm text-white/80">
                <CheckCircle size={18} className="text-[#C9A66B] shrink-0 mt-0.5" />
                <span>Indicação e Evolução individual</span>
              </li>
              <li className="flex gap-3 items-start text-sm text-white/80">
                <CheckCircle size={18} className="text-[#C9A66B] shrink-0 mt-0.5" />
                <span>Compra de produtos oficiais</span>
              </li>
            </ul>
          </div>

          {/* Card 2: EMBAIXADOR */}
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-5">
            <span className="inline-block bg-[#D4AF37] text-black text-xs font-black uppercase px-4 py-2 rounded-full">
              EMBAIXADOR
            </span>
            <ul className="space-y-3">
              <li className="flex gap-3 items-start text-sm text-white/80">
                <Star size={18} className="text-[#C9A66B] shrink-0 mt-0.5 fill-[#C9A66B]" />
                <span>Responsabilidade e formação de outros</span>
              </li>
              <li className="flex gap-3 items-start text-sm text-white/80">
                <Star size={18} className="text-[#C9A66B] shrink-0 mt-0.5 fill-[#C9A66B]" />
                <span>Entrega educacional e representação</span>
              </li>
              <li className="flex gap-3 items-start text-sm text-white/80">
                <Star size={18} className="text-[#C9A66B] shrink-0 mt-0.5 fill-[#C9A66B]" />
                <span>Compra de produtos oficiais</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}