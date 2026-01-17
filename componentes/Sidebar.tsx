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
    // SÓ APARECE NO PC (hidden md:flex)
    <aside className="hidden md:flex w-64 bg-black border-r border-white/10 flex-col h-full shrink-0">
      
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
                  ? "bg-[#C9A66B] border-[#C9A66B] text-black font-bold shadow-[0_0_20px_rgba(201,166,107,0.3)]" // ATIVO: Cheio
                  : "bg-transparent border-transparent text-slate-400 hover:border-[#C9A66B] hover:text-[#C9A66B]" // MOUSE EM CIMA: Só Borda e Texto Dourado
              }`}
            >
              <item.icon
                size={20}
                className={`transition-colors ${
                  isActive ? "text-black" : "text-slate-500 group-hover:text-[#C9A66B]"
                }`}
              />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-4 w-full text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/30"
        >
          <LogOut size={20} />
          <span className="text-sm font-bold">Sair da Conta</span>
        </button>
      </div>

    </aside>
  );
}