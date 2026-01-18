"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, Trophy, Share2, User } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    // CAMADA 1: O FUNDO PRETO (Ocupa 100% da largura, cola no chão)
    // "md:hidden" garante que SUMA no PC.
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-black border-t border-white/10 z-[50] pb-safe">
      
      {/* CAMADA 2: OS ÍCONES (Centralizados e agrupados para não ficarem longe) */}
      <div className="flex items-center justify-between px-6 h-20 max-w-[400px] mx-auto relative">
        
        {/* Início */}
        <Link href="/" className="flex flex-col items-center justify-center w-12 gap-1 group">
          <LayoutDashboard size={20} strokeWidth={2} className={pathname === "/" ? "text-[#C9A66B]" : "text-slate-500"} />
          <span className={`text-[9px] font-bold tracking-wide ${pathname === "/" ? "text-[#C9A66B]" : "text-slate-500"}`}>Início</span>
        </Link>

        {/* Aulas */}
        <Link href="/evolucao" className="flex flex-col items-center justify-center w-12 gap-1 group">
          <GraduationCap size={22} strokeWidth={2} className={pathname === "/evolucao" ? "text-[#C9A66B]" : "text-slate-500"} />
          <span className={`text-[9px] font-bold tracking-wide ${pathname === "/evolucao" ? "text-[#C9A66B]" : "text-slate-500"}`}>Aulas</span>
        </Link>

        {/* BOTÃO CENTRAL (PERFIL) - FLUTUANTE */}
        <div className="relative -top-5">
          <Link 
              href="/perfil" 
              className="w-14 h-14 rounded-full bg-[#C9A66B] flex items-center justify-center border-[4px] border-black shadow-[0_4px_15px_rgba(201,166,107,0.4)] active:scale-95 transition-transform"
          >
              <User size={24} className="text-black fill-black" />
          </Link>
        </div>

        {/* Rank */}
        <Link href="/comunidade" className="flex flex-col items-center justify-center w-12 gap-1 group">
          <Trophy size={20} strokeWidth={2} className={pathname === "/comunidade" ? "text-[#C9A66B]" : "text-slate-500"} />
          <span className={`text-[9px] font-bold tracking-wide ${pathname === "/comunidade" ? "text-[#C9A66B]" : "text-slate-500"}`}>Rank</span>
        </Link>

        {/* Rede */}
        <Link href="/embaixador" className="flex flex-col items-center justify-center w-12 gap-1 group">
          <Share2 size={20} strokeWidth={2} className={pathname === "/embaixador" ? "text-[#C9A66B]" : "text-slate-500"} />
          <span className={`text-[9px] font-bold tracking-wide ${pathname === "/embaixador" ? "text-[#C9A66B]" : "text-slate-500"}`}>Rede</span>
        </Link>

      </div>
    </div>
  );
}