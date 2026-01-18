"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, GraduationCap, Trophy, Share2, LogOut, User } from "lucide-react";
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

  const menuItems = [
    { label: "Visão Geral", href: "/", icon: LayoutDashboard },
    { label: "Aulas", href: "/evolucao", icon: GraduationCap },
    { label: "Comunidade", href: "/comunidade", icon: Trophy },
    { label: "Área Embaixador", href: "/embaixador", icon: Share2 },
    { label: "Meu Perfil", href: "/perfil", icon: User },
  ];

  return (
    <>
      {/* --- 1. VERSÃO PC (LADO ESQUERDO) --- */}
      <aside className="hidden md:flex w-64 bg-black border-r border-white/10 flex-col h-full shrink-0 relative z-40">
        <div className="p-8">
          <h1 className="text-2xl font-black text-white italic tracking-tighter">
            MASC <span className="text-[#C9A66B]">PRO</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">
            Hub Educacional
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all border ${
                  isActive
                    ? "bg-[#C9A66B] border-[#C9A66B] text-black font-bold shadow-[0_0_15px_rgba(201,166,107,0.3)]"
                    : "bg-transparent border-transparent text-slate-400 hover:border-[#C9A66B] hover:text-[#C9A66B]"
                }`}
              >
                <item.icon size={20} className={isActive ? "text-black" : "text-slate-500 group-hover:text-[#C9A66B]"} />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 mt-auto">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-4 w-full text-slate-500 hover:text-red-400 font-bold hover:bg-white/5 rounded-xl transition-all">
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* --- 2. VERSÃO CELULAR (RODAPÉ ESTILO APP) --- */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-black border-t border-white/10 z-[50] pb-safe shadow-2xl">
        <div className="flex items-center justify-between px-6 h-20 max-w-[400px] mx-auto relative">
          
          <Link href="/" className="flex flex-col items-center justify-center w-12 gap-1 group">
            <LayoutDashboard size={20} className={pathname === "/" ? "text-[#C9A66B]" : "text-slate-500"} />
            <span className={`text-[9px] font-bold mt-1 ${pathname === "/" ? "text-[#C9A66B]" : "text-slate-500"}`}>Início</span>
          </Link>

          <Link href="/evolucao" className="flex flex-col items-center justify-center w-12 gap-1 group">
            <GraduationCap size={22} className={pathname === "/evolucao" ? "text-[#C9A66B]" : "text-slate-500"} />
            <span className={`text-[9px] font-bold mt-1 ${pathname === "/evolucao" ? "text-[#C9A66B]" : "text-slate-500"}`}>Aulas</span>
          </Link>

          <div className="relative -top-5">
            <Link href="/perfil" className="w-14 h-14 rounded-full bg-[#C9A66B] flex items-center justify-center border-[4px] border-black shadow-[0_4px_15px_rgba(201,166,107,0.4)] active:scale-95 transition-transform">
                <User size={24} className="text-black" />
            </Link>
          </div>

          <Link href="/comunidade" className="flex flex-col items-center justify-center w-12 gap-1 group">
            <Trophy size={20} className={pathname === "/comunidade" ? "text-[#C9A66B]" : "text-slate-500"} />
            <span className={`text-[9px] font-bold mt-1 ${pathname === "/comunidade" ? "text-[#C9A66B]" : "text-slate-500"}`}>Rank</span>
          </Link>

          <Link href="/embaixador" className="flex flex-col items-center justify-center w-12 gap-1 group">
            <Share2 size={20} className={pathname === "/embaixador" ? "text-[#C9A66B]" : "text-slate-500"} />
            <span className={`text-[9px] font-bold mt-1 ${pathname === "/embaixador" ? "text-[#C9A66B]" : "text-slate-500"}`}>Rede</span>
          </Link>

        </div>
      </div>
    </>
  );
}