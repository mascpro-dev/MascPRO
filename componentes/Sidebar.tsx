"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayCircle, LayoutGrid, User, Trophy, Share2, Map, Bell } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  // Itens da Barra Inferior (Mobile) - 2 de cada lado + Perfil no meio
  const bottomMenuItems = [
    { name: "Início", href: "/", icon: LayoutGrid },
    { name: "Evolução", href: "/evolucao", icon: PlayCircle },
    { name: "Rank", href: "/comunidade", icon: Trophy },
    { name: "Rede", href: "/rede", icon: Share2 },
  ];

  // Itens da Barra Superior / Jornada
  const topMenuItems = [
    { name: "Jornada", href: "/jornada", icon: Map },
  ];

  return (
    <>
      {/* --- HEADER SUPERIOR (MOBILE) --- */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 md:hidden z-50">
        <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Masc<span className="text-[#C9A66B]">Pro</span></h2>
        <div className="flex items-center gap-4">
          {topMenuItems.map((item) => (
            <Link key={item.name} href={item.href} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${pathname === item.href ? "bg-[#C9A66B] text-black" : "text-slate-400 border border-white/10"}`}>
              <item.icon size={14} />
              {item.name}
            </Link>
          ))}
          <Bell size={20} className="text-slate-500" />
        </div>
      </div>

      {/* --- MENU DESKTOP (PC) --- */}
      <aside className="fixed left-0 top-0 h-full w-[260px] bg-[#050505] border-r border-white/5 hidden md:flex flex-col z-50">
        <div className="p-8">
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Masc<span className="text-[#C9A66B]">Pro</span></h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {[...bottomMenuItems, ...topMenuItems].map((item) => (
            <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${pathname === item.href ? "bg-[#C9A66B] text-black shadow-lg" : "text-slate-500 hover:text-white"}`}>
              <item.icon size={20} />
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* --- MENU MOBILE INFERIOR (2 DE CADA LADO + PERFIL) --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 px-4 py-4 flex justify-around items-center md:hidden z-50 h-20">
        {/* Lado Esquerdo */}
        <div className="flex gap-8">
          <Link href="/" className={`flex flex-col items-center gap-1 ${pathname === "/" ? "text-[#C9A66B]" : "text-slate-500"}`}>
            <LayoutGrid size={22} />
            <span className="text-[9px] font-bold uppercase">Início</span>
          </Link>
          <Link href="/evolucao" className={`flex flex-col items-center gap-1 ${pathname === "/evolucao" ? "text-[#C9A66B]" : "text-slate-500"}`}>
            <PlayCircle size={22} />
            <span className="text-[9px] font-bold uppercase">Aulas</span>
          </Link>
        </div>

        {/* Centro - Perfil */}
        <Link href="/perfil" className="w-14 h-14 bg-[#C9A66B] rounded-full border-4 border-black flex items-center justify-center text-black shadow-xl -mt-10">
          <User size={26} />
        </Link>

        {/* Lado Direito */}
        <div className="flex gap-8">
          <Link href="/comunidade" className={`flex flex-col items-center gap-1 ${pathname === "/comunidade" ? "text-[#C9A66B]" : "text-slate-500"}`}>
            <Trophy size={22} />
            <span className="text-[9px] font-bold uppercase">Rank</span>
          </Link>
          <Link href="/rede" className={`flex flex-col items-center gap-1 ${pathname === "/rede" ? "text-[#C9A66B]" : "text-slate-500"}`}>
            <Share2 size={22} />
            <span className="text-[9px] font-bold uppercase">Rede</span>
          </Link>
        </div>
      </div>
    </>
  );
}