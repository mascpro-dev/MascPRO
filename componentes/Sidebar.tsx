"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, PlayCircle, Trophy, Share2, LogOut, User, ShoppingBag, Calendar } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  // Ícones e Links baseados na sua imagem de referência
  const menuItems = [
    { label: "Visão Geral", href: "/", icon: LayoutDashboard },
    { label: "Evolução", href: "/evolucao", icon: PlayCircle }, // Ícone ajustado para parecer "Aulas"
    { label: "Comunidade", href: "/comunidade", icon: Trophy }, // Ícone ajustado
    { label: "Rede", href: "/embaixador", icon: Share2 },
    { label: "Meu Perfil", href: "/perfil", icon: User },
  ];

  return (
    <>
      {/* ==============================================================
          1. VERSÃO PC (DESKTOP) - IDÊNTICO AO PRINT "Capturartela visaão.JPG"
          Regra: hidden md:flex (Só aparece em telas médias/grandes)
      =============================================================== */}
      <aside className="hidden md:flex w-64 bg-black border-r border-white/10 flex-col h-full shrink-0 relative z-40">
        
        {/* LOGO MASC PRO */}
        <div className="p-8">
          <h1 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-1">
            MASC <span className="text-[#C9A66B]">PRO</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">
            Hub Educacional
          </p>
        </div>

        {/* MENU LATERAL VERTICAL */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all border ${
                  isActive
                    ? "bg-[#1a1a1a] border-white/10 text-white font-bold" // Estilo do print (fundo escuro sutil)
                    : "bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon 
                  size={20} 
                  className={isActive ? "text-white" : "text-slate-500"} 
                />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* BOTÃO SAIR (Rodapé do Menu) */}
        <div className="p-4 mt-auto">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-4 py-4 w-full text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* ==============================================================
          2. VERSÃO CELULAR (MOBILE)
          Regra: md:hidden (Desaparece no PC) | fixed bottom-0 (Fica no chão)
      =============================================================== */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-black border-t border-white/10 z-[9999] pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between px-6 h-20 max-w-[400px] mx-auto relative">
          
          {/* Início */}
          <Link href="/" className="flex flex-col items-center justify-center w-12 gap-1 group">
            <LayoutDashboard size={20} className={pathname === "/" ? "text-[#C9A66B]" : "text-slate-500"} />
            <span className={`text-[9px] font-bold ${pathname === "/" ? "text-[#C9A66B]" : "text-slate-500"}`}>Início</span>
          </Link>

          {/* Aulas */}
          <Link href="/evolucao" className="flex flex-col items-center justify-center w-12 gap-1 group">
            <PlayCircle size={22} className={pathname === "/evolucao" ? "text-[#C9A66B]" : "text-slate-500"} />
            <span className={`text-[9px] font-bold ${pathname === "/evolucao" ? "text-[#C9A66B]" : "text-slate-500"}`}>Aulas</span>
          </Link>

          {/* PERFIL (Central) */}
          <div className="relative -top-6">
            <Link href="/perfil" className="w-14 h-14 rounded-full bg-[#C9A66B] flex items-center justify-center border-[4px] border-black shadow-[0_0_15px_rgba(201,166,107,0.4)]">
                <User size={24} className="text-black" />
            </Link>
          </div>

          {/* Rank */}
          <Link href="/comunidade" className="flex flex-col items-center justify-center w-12 gap-1 group">
            <Trophy size={20} className={pathname === "/comunidade" ? "text-[#C9A66B]" : "text-slate-500"} />
            <span className={`text-[9px] font-bold ${pathname === "/comunidade" ? "text-[#C9A66B]" : "text-slate-500"}`}>Rank</span>
          </Link>

          {/* Rede */}
          <Link href="/embaixador" className="flex flex-col items-center justify-center w-12 gap-1 group">
            <Share2 size={20} className={pathname === "/embaixador" ? "text-[#C9A66B]" : "text-slate-500"} />
            <span className={`text-[9px] font-bold ${pathname === "/embaixador" ? "text-[#C9A66B]" : "text-slate-500"}`}>Rede</span>
          </Link>

        </div>
      </div>
    </>
  );
}