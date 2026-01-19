"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayCircle, LayoutGrid, User, Trophy, Share2, Map, ChevronDown, Menu, X } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Itens fixos da Barra Inferior (Mobile)
  const mainItems = [
    { name: "Início", href: "/", icon: LayoutGrid },
    { name: "Aulas", href: "/evolucao", icon: PlayCircle }, // Restaurado como Evolução
    { name: "Rank", href: "/comunidade", icon: Trophy },
    { name: "Rede", href: "/rede", icon: Share2 },
  ];

  // Itens extras para o Menu Suspenso Superior (Mobile)
  const extraItems = [
    { name: "Jornada do Embaixador", href: "/jornada", icon: Map },
    // Adicione futuras abas aqui para o menu suspenso
  ];

  return (
    <>
      {/* --- HEADER SUPERIOR MOBILE COM MENU SUSPENSO --- */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-black/95 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 md:hidden z-[60]">
        <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Masc<span className="text-[#C9A66B]">Pro</span></h2>
        
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-[#C9A66B]"
          >
            MAIS <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200">
              <div className="p-2 space-y-1">
                {extraItems.map((item) => (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- SIDEBAR DESKTOP (PC) --- */}
      <aside className="fixed left-0 top-0 h-full w-[260px] bg-[#050505] border-r border-white/5 hidden md:flex flex-col z-50">
        <div className="p-8">
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Masc<span className="text-[#C9A66B]">Pro</span></h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {[...mainItems, ...extraItems].map((item) => (
            <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${pathname === item.href ? "bg-[#C9A66B] text-black shadow-lg" : "text-slate-500 hover:text-white"}`}>
              <item.icon size={20} />
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* --- BARRA INFERIOR MOBILE (2 DE CADA LADO + PERFIL CENTRAL) --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 px-4 py-4 flex justify-around items-center md:hidden z-50 h-20">
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

        {/* Perfil Centralizado e Elevado */}
        <Link href="/perfil" className="w-14 h-14 bg-[#C9A66B] rounded-full border-4 border-black flex items-center justify-center text-black shadow-xl -mt-10">
          <User size={26} />
        </Link>

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