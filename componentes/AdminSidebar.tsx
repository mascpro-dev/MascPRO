"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  UserPlus, 
  GitMerge, 
  Zap, 
  Clock, 
  LayoutDashboard,
  ChevronRight,
  ShieldCheck,
  Search
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      title: "VISÃO GERAL",
      items: [
        { name: "Painel Admin", icon: LayoutDashboard, href: "/admin" },
      ]
    },
    {
      title: "RADAR DE MOVIMENTO",
      items: [
        { 
          name: "Quem Entrou", 
          description: "Novos cadastros", 
          icon: UserPlus, 
          href: "/admin/novos" 
        },
        { 
          name: "Quem Indicou", 
          description: "Mapeamento de rede", 
          icon: GitMerge, 
          href: "/admin/rede" 
        },
      ]
    },
    {
      title: "TERMÔMETRO DE PULSO",
      items: [
        { 
          name: "Quem está Ativo", 
          description: "Engajamento total", 
          icon: Zap, 
          href: "/admin/ativos",
          color: "text-yellow-500"
        },
        { 
          name: "Quem está Parado", 
          description: "Risco de abandono", 
          icon: Clock, 
          href: "/admin/inativos",
          color: "text-red-500"
        },
      ]
    }
  ];

  return (
    <aside className="w-64 min-h-screen bg-black border-r border-white/5 p-6 flex flex-col gap-8">
      {/* HEADER ADM */}
      <div className="flex items-center gap-3 px-2">
        <div className="bg-[#C9A66B] p-2 rounded-lg">
          <ShieldCheck className="text-black w-5 h-5" />
        </div>
        <div>
          <h2 className="text-white font-black text-sm tracking-tighter uppercase italic">MascPRO</h2>
          <p className="text-[#C9A66B] text-[10px] font-bold uppercase tracking-widest">Admin Radar</p>
        </div>
      </div>

      {/* SEARCH RÁPIDO NO RADAR */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-[#C9A66B] transition-colors" />
        <input 
          type="text" 
          placeholder="Rastrear barbeiro..."
          className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs text-white outline-none focus:border-[#C9A66B]/50 transition-all"
        />
      </div>

      {/* MENU ITEMS */}
      <nav className="flex flex-col gap-8">
        {menuItems.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-3">
            <h3 className="text-[10px] font-black text-zinc-700 tracking-[0.2em] px-2">
              {section.title}
            </h3>
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    className={`
                      group flex items-center justify-between p-3 rounded-xl transition-all
                      ${isActive ? 'bg-zinc-900 border border-white/10' : 'hover:bg-zinc-900/50 border border-transparent'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 ${(item as any).color || (isActive ? 'text-[#C9A66B]' : 'text-zinc-500')} group-hover:text-[#C9A66B] transition-colors`} />
                      <div>
                        <p className={`text-[11px] font-bold uppercase tracking-tight ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                          {item.name}
                        </p>
                        {(item as any).description && (
                          <p className="text-[9px] text-zinc-600 font-medium">
                            {(item as any).description}
                          </p>
                        )}
                      </div>
                    </div>
                    {isActive && <div className="w-1 h-1 rounded-full bg-[#C9A66B] shadow-[0_0_8px_#C9A66B]" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* FOOTER ADM */}
      <div className="mt-auto pt-6 border-t border-white/5 px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-black italic">
            MA
          </div>
          <div>
            <p className="text-[10px] font-black text-white uppercase italic">Marcelo Admin</p>
            <Link href="/" className="text-[9px] text-[#C9A66B] font-bold uppercase hover:underline">Sair do Radar</Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
