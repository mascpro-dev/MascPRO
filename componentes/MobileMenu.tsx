"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LayoutDashboard, GraduationCap, Users, LogOut, Medal, User } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
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
    { label: "Evolução", href: "/evolucao", icon: GraduationCap },
    { label: "Comunidade", href: "/comunidade", icon: Users },
    { label: "Área Embaixador", href: "/embaixador", icon: Medal },
    { label: "Meu Perfil", href: "/perfil", icon: User },
  ];

  return (
    // SÓ APARECE NO MOBILE (md:hidden)
    <div className="md:hidden">
      
      {/* HEADER FIXO TOPO */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-6">
          <div className="text-xl font-black text-white italic tracking-tighter">
            MASC <span className="text-[#C9A66B]">PRO</span>
          </div>
          
          <button 
            onClick={() => setIsOpen(true)}
            className="text-white hover:text-[#C9A66B] transition-colors"
          >
            <Menu size={28} />
          </button>
      </div>

      {/* ESPAÇADOR (Para o conteúdo não ficar embaixo do header) */}
      <div className="h-16" />

      {/* MENU FULL SCREEN (OVERLAY) */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-in fade-in slide-in-from-right duration-300">
            
            {/* Header do Menu */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Menu</span>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Links */}
            <nav className="flex-1 p-6 space-y-4 overflow-y-auto">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)} // Fecha ao clicar
                      className={`flex items-center gap-4 px-6 py-5 rounded-2xl transition-all border ${
                        isActive
                          ? "bg-[#C9A66B] text-black border-[#C9A66B] font-bold shadow-lg"
                          : "bg-slate-900 border-white/5 text-slate-300"
                      }`}
                    >
                      <item.icon size={24} />
                      <span className="text-lg">{item.label}</span>
                    </Link>
                  );
                })}
            </nav>

            {/* Footer Logout */}
            <div className="p-6 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-3 px-6 py-5 w-full text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl font-bold"
                >
                  <LogOut size={24} />
                  Sair
                </button>
            </div>
        </div>
      )}
    </div>
  );
}