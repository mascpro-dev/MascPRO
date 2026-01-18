"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, Trophy, Share2, User } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    // Fundo preto total + Conteúdo centralizado
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-black border-t border-white/10 z-[50] pb-safe shadow-2xl">
      <div className="flex items-center justify-between px-6 h-20 max-w-[400px] mx-auto relative">
        
        <Link href="/" className="flex flex-col items-center justify-center w-12 gap-1 group">
          <LayoutDashboard size={20} className={pathname === "/" ? "text-[#C9A66B]" : "text-slate-500"} />
          <span className="text-[9px] font-bold">Início</span>
        </Link>

        <Link href="/evolucao" className="flex flex-col items-center justify-center w-12 gap-1 group">
          <GraduationCap size={22} className={pathname === "/evolucao" ? "text-[#C9A66B]" : "text-slate-500"} />
          <span className="text-[9px] font-bold">Aulas</span>
        </Link>

        <div className="relative -top-5">
          <Link href="/perfil" className="w-14 h-14 rounded-full bg-[#C9A66B] flex items-center justify-center border-[4px] border-black shadow-lg">
              <User size={24} className="text-black" />
          </Link>
        </div>

        <Link href="/comunidade" className="flex flex-col items-center justify-center w-12 gap-1 group">
          <Trophy size={20} className={pathname === "/comunidade" ? "text-[#C9A66B]" : "text-slate-500"} />
          <span className="text-[9px] font-bold">Rank</span>
        </Link>

        <Link href="/embaixador" className="flex flex-col items-center justify-center w-12 gap-1 group">
          <Share2 size={20} className={pathname === "/embaixador" ? "text-[#C9A66B]" : "text-slate-500"} />
          <span className="text-[9px] font-bold">Rede</span>
        </Link>

      </div>
    </div>
  );
}