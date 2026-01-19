"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayCircle, LayoutGrid, User, Trophy, Share2, Map, ChevronDown, LogOut } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <>
      {/* --- MENU SUPERIOR MOBILE (MENU SUSPENSO) --- */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-black/95 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 md:hidden z-[60]">
        <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Masc<span className="text-[#C9A66B]">Pro</span></h2>
        
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 bg-[#C9A66B]/10 px-3 py-1.5 rounded-lg border border-[#C9A66B]/20 text-[10px] font-black text-[#C9A66B] uppercase"
          >
            Explorar <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              <Link href="/jornada" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-3 px-4 py-4 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 border-b border-white/5">
                <Map size={18} /> JORNADA DO EMBAIXADOR
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* --- SIDEBAR DESKTOP (PC) - IDÊNTICA AO PRINT --- */}
      <aside className="fixed left-0 top-0 h-full w-[260px] bg-[#050505] border-r border-white/5 hidden md:flex flex-col z-50">
        <div className="p-8">
          <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Masc<span className="text-[#C9A66B]">Pro</span></h2>
          <p className="text-[10px] text-slate-600 font-bold tracking-[0.2em] mt-1">HUB EDUCACIONAL</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { name: "Visão Geral", href: "/", icon: LayoutGrid },
            { name: "Evolução (Aulas)", href: "/evolucao", icon: PlayCircle },
            { name: "Minha Rede", href: "/rede", icon: Share2 },
            { name: "Comunidade", href: "/comunidade", icon: Trophy },
          ].map((item) => (
            <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${pathname === item.href ? "bg-white/10 text-white border border-white/10" : "text-slate-500 hover:text-white"}`}>
              <item.icon size={20} className={pathname === item.href ? "text-[#C9A66B]" : ""} />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-500 font-bold text-xs hover:text-white transition-colors uppercase tracking-widest">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* --- BARRA INFERIOR MOBILE - IGUAL AO WHATSAPP IMAGE --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 px-2 py-3 flex justify-around items-end md:hidden z-50 h-20">
        <Link href="/" className={`flex flex-col items-center gap-1 w-16 ${pathname === "/" ? "text-white" : "text-slate-600"}`}>
          <LayoutGrid size={20} />
          <span className="text-[9px] font-bold uppercase">Início</span>
        </Link>
        <Link href="/evolucao" className={`flex flex-col items-center gap-1 w-16 ${pathname === "/evolucao" ? "text-white" : "text-slate-600"}`}>
          <PlayCircle size={20} />
          <span className="text-[9px] font-bold uppercase">Aulas</span>
        </Link>

        {/* BOTAO PERFIL CENTRALIZADO */}
        <div className="relative -top-6">
          <Link href="/perfil" className="w-14 h-14 bg-[#C9A66B] rounded-full border-[5px] border-black flex items-center justify-center text-black shadow-[0_0_20px_rgba(201,166,107,0.3)]">
            <User size={24} fill="currentColor" />
          </Link>
        </div>

        <Link href="/comunidade" className={`flex flex-col items-center gap-1 w-16 ${pathname === "/comunidade" ? "text-white" : "text-slate-600"}`}>
          <Trophy size={20} />
          <span className="text-[9px] font-bold uppercase">Rank</span>
        </Link>
        <Link href="/rede" className={`flex flex-col items-center gap-1 w-16 ${pathname === "/rede" ? "text-white" : "text-slate-600"}`}>
          <Share2 size={20} />
          <span className="text-[9px] font-bold uppercase">Rede</span>
        </Link>
      </div>
    </>
  );
}