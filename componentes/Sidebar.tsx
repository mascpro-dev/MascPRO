"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayCircle, LayoutGrid, User, Trophy, Share2, Map, LogOut } from "lucide-react";

// Usamos export default para bater com o import do Layout
export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: "Visão Geral", href: "/", icon: LayoutGrid },
    { name: "Evolução", href: "/evolucao", icon: PlayCircle }, // Seus vídeos originais
    { name: "Jornada", href: "/jornada", icon: Map }, // Nova aba solicitada
    { name: "Minha Rede", href: "/rede", icon: Share2 },
    { name: "Comunidade", href: "/comunidade", icon: Trophy },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-[#050505] border-r border-white/5 hidden md:flex flex-col z-50">
      <div className="p-8">
        <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Masc<span className="text-[#C9A66B]">Pro</span></h2>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                isActive ? "bg-[#C9A66B] text-black shadow-lg shadow-[#C9A66B]/20" : "text-slate-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button className="flex items-center gap-3 px-4 py-3 w-full text-slate-500 font-bold text-sm hover:text-red-500 transition-colors">
          <LogOut size={20} /> Sair
        </button>
      </div>
    </aside>
  );
}