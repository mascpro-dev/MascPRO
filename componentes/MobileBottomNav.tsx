"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, Trophy, Share2, User } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    // SÓ APARECE NO CELULAR (md:hidden)
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-black border-t border-white/10 z-50 px-6 flex items-center justify-between pb-2">
      
      {/* 1. INÍCIO */}
      <Link href="/" className="flex flex-col items-center gap-1 group">
        <LayoutDashboard size={24} className={pathname === "/" ? "text-[#C9A66B]" : "text-slate-500 group-hover:text-white"} />
        <span className={`text-[10px] font-bold ${pathname === "/" ? "text-[#C9A66B]" : "text-slate-500 group-hover:text-white"}`}>Início</span>
      </Link>

      {/* 2. AULAS */}
      <Link href="/evolucao" className="flex flex-col items-center gap-1 group">
        <GraduationCap size={24} className={pathname === "/evolucao" ? "text-[#C9A66B]" : "text-slate-500 group-hover:text-white"} />
        <span className={`text-[10px] font-bold ${pathname === "/evolucao" ? "text-[#C9A66B]" : "text-slate-500 group-hover:text-white"}`}>Aulas</span>
      </Link>

      {/* 3. BOTÃO CENTRAL (PERFIL) - FLUTUANDO IGUAL AO PRINT */}
      <div className="relative -top-5">
        <Link 
            href="/perfil" 
            className="w-14 h-14 rounded-full bg-[#C9A66B] flex items-center justify-center border-4 border-black shadow-[0_0_20px_rgba(201,166,107,0.4)] transition-transform active:scale-95"
        >
            <User size={28} className="text-black" />
        </Link>
      </div>

      {/* 4. RANK */}
      <Link href="/comunidade" className="flex flex-col items-center gap-1 group">
        <Trophy size={24} className={pathname === "/comunidade" ? "text-[#C9A66B]" : "text-slate-500 group-hover:text-white"} />
        <span className={`text-[10px] font-bold ${pathname === "/comunidade" ? "text-[#C9A66B]" : "text-slate-500 group-hover:text-white"}`}>Rank</span>
      </Link>

      {/* 5. REDE */}
      <Link href="/embaixador" className="flex flex-col items-center gap-1 group">
        <Share2 size={24} className={pathname === "/embaixador" ? "text-[#C9A66B]" : "text-slate-500 group-hover:text-white"} />
        <span className={`text-[10px] font-bold ${pathname === "/embaixador" ? "text-[#C9A66B]" : "text-slate-500 group-hover:text-white"}`}>Rede</span>
      </Link>

    </div>
  );
}