"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, Trophy, Share2, User } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    // 1. BARRA PRETA DE PONTA A PONTA (fixed bottom-0 w-full)
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-black border-t border-white/10 z-[9999] shadow-2xl pb-2">
      
      {/* 2. CONTEÚDO AGRUPADO NO MEIO (max-w-md mx-auto) 
         Isso impede que os ícones fiquem longe demais um do outro */}
      <div className="flex items-center justify-between px-8 h-16 max-w-sm mx-auto relative">
        
        {/* INÍCIO */}
        <Link href="/" className="flex flex-col items-center gap-1 group w-10">
          <LayoutDashboard size={20} className={pathname === "/" ? "text-[#C9A66B]" : "text-slate-500"} />
          <span className={`text-[9px] font-bold ${pathname === "/" ? "text-[#C9A66B]" : "text-slate-500"}`}>Início</span>
        </Link>

        {/* AULAS */}
        <Link href="/evolucao" className="flex flex-col items-center gap-1 group w-10">
          <GraduationCap size={20} className={pathname === "/evolucao" ? "text-[#C9A66B]" : "text-slate-500"} />
          <span className={`text-[9px] font-bold ${pathname === "/evolucao" ? "text-[#C9A66B]" : "text-slate-500"}`}>Aulas</span>
        </Link>

        {/* BOTÃO FLUTUANTE CENTRAL (PERFIL) */}
        <div className="relative -top-5">
          <Link 
              href="/perfil" 
              className="w-14 h-14 rounded-full bg-[#C9A66B] flex items-center justify-center border-[5px] border-black shadow-[0_0_15px_rgba(201,166,107,0.5)] active:scale-95 transition-transform"
          >
              <User size={26} className="text-black" />
          </Link>
        </div>

        {/* RANK */}
        <Link href="/comunidade" className="flex flex-col items-center gap-1 group w-10">
          <Trophy size={20} className={pathname === "/comunidade" ? "text-[#C9A66B]" : "text-slate-500"} />
          <span className={`text-[9px] font-bold ${pathname === "/comunidade" ? "text-[#C9A66B]" : "text-slate-500"}`}>Rank</span>
        </Link>

        {/* REDE */}
        <Link href="/embaixador" className="flex flex-col items-center gap-1 group w-10">
          <Share2 size={20} className={pathname === "/embaixador" ? "text-[#C9A66B]" : "text-slate-500"} />
          <span className={`text-[9px] font-bold ${pathname === "/embaixador" ? "text-[#C9A66B]" : "text-slate-500"}`}>Rede</span>
        </Link>

      </div>
    </div>
  );
}