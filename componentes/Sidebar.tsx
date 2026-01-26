"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  GraduationCap, 
  Users, 
  ShoppingBag, 
  MessageSquare,
  Calendar,
  User,
  LogOut,
  TrendingUp,
  Share2,
  MoreVertical,
  type LucideIcon
} from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Tipos para os itens de navegação
type NavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

// Itens da barra inferior (5 itens: 2 normais + 1 central destacado + 2 normais)
const BOTTOM_NAV_LEFT: NavItem[] = [
  { icon: LayoutDashboard, label: "Inicio", href: "/" },
  { icon: TrendingUp, label: "Evolução", href: "/evolucao" },
];

const BOTTOM_NAV_RIGHT: NavItem[] = [
  { icon: MessageSquare, label: "Comunidade", href: "/comunidade" },
  { icon: Share2, label: "Rede", href: "/rede" },
];

// Itens do dropdown (apenas os que não estão na barra inferior)
const DROPDOWN_ITEMS: NavItem[] = [
  { icon: ShoppingBag, label: "Loja PRO", href: "/loja" },
  { icon: Calendar, label: "Eventos", href: "/eventos" },
];

// Todos os itens para desktop
const MENU_ITEMS = [
  { icon: LayoutDashboard, label: "Visão Geral", href: "/" },
  { icon: GraduationCap, label: "Evolução", href: "/evolucao" },
  { icon: Users, label: "Minha Rede", href: "/rede" },
  { icon: MessageSquare, label: "Comunidade", href: "/comunidade" },
  { icon: ShoppingBag, label: "Loja PRO", href: "/loja" },
  { icon: Calendar, label: "Eventos", href: "/eventos" },
  { icon: User, label: "Meu Perfil", href: "/perfil" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Erro ao sair", error);
      setLoggingOut(false);
    }
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <>
      {/* MENU SUPERIOR MOBILE */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#C9A66B] rounded-lg flex items-center justify-center font-black text-black italic">M</div>
          <span className="text-white font-black italic uppercase tracking-tighter">Masc <span className="text-[#C9A66B]">Pro</span></span>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)} 
            className="text-[#C9A66B] p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <MoreVertical size={24} />
          </button>
          
          {/* DROPDOWN MENU */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="py-2">
                {DROPDOWN_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDropdownOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      pathname === item.href
                        ? "bg-white/5 text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <item.icon size={18} className={pathname === item.href ? "text-[#C9A66B]" : "text-slate-500"} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
                <div className="border-t border-white/5 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full transition-colors"
                  >
                    <LogOut size={18} className="text-red-400" />
                    <span className="font-medium">Sair do App</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BARRA DE NAVEGAÇÃO INFERIOR MOBILE */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-white/5 px-2 py-2">
        <div className="flex justify-around items-end max-w-md mx-auto relative">
          {/* Itens da esquerda (Início e Evolução) */}
          {BOTTOM_NAV_LEFT.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all flex-1 ${
                  isActive ? "text-[#C9A66B]" : "text-slate-500"
                }`}
              >
                <div className={`p-2 rounded-full ${isActive ? "bg-[#C9A66B]/20" : ""}`}>
                  <item.icon size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}

          {/* Botão Perfil Central (Destaque) */}
          <Link
            href="/perfil"
            className="relative -top-6 flex items-center justify-center"
          >
            <div className={`w-16 h-16 rounded-full bg-[#C9A66B] flex items-center justify-center shadow-lg shadow-[#C9A66B]/30 transition-transform hover:scale-110 ${
              pathname === "/perfil" ? "ring-2 ring-[#C9A66B] ring-offset-2 ring-offset-[#0A0A0A]" : ""
            }`}>
              <User size={28} className="text-black" />
            </div>
          </Link>

          {/* Itens da direita (Comunidade e Rede) */}
          {BOTTOM_NAV_RIGHT.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-all flex-1 ${
                  isActive ? "text-[#C9A66B]" : "text-slate-500"
                }`}
              >
                <div className={`p-2 rounded-full ${isActive ? "bg-[#C9A66B]/20" : ""}`}>
                  <item.icon size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* SIDEBAR DESKTOP */}
      <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-[#0A0A0A] border-r border-white/5 hidden lg:flex flex-col z-40">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-[#C9A66B] rounded-xl flex items-center justify-center font-black text-black italic text-xl shadow-[0_0_20px_rgba(201,166,107,0.3)]">M</div>
            <div>
              <p className="text-white font-black italic uppercase tracking-tighter leading-none text-lg">Masc <span className="text-[#C9A66B]">Pro</span></p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">HUB EDUCACIONAL</p>
            </div>
          </div>

          <nav className="space-y-2">
            {MENU_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${
                    isActive 
                    ? "bg-white/5 text-white font-black" 
                    : "text-slate-500 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon size={20} className={isActive ? "text-[#C9A66B]" : "text-slate-500 group-hover:text-[#C9A66B]"} />
                  <span className="text-xs uppercase tracking-widest font-bold">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* BOTÃO SAIR NO RODAPÉ DA SIDEBAR */}
        <div className="mt-auto p-6 border-t border-white/5">
          <button 
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full group"
          >
            <LogOut size={20} className="text-red-400 group-hover:text-red-300" />
            <span className="text-xs uppercase tracking-widest font-bold">SAIR</span>
          </button>
        </div>
      </aside>

    </>
  );
}