"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutGrid, 
  TrendingUp, // Evolução
  Users,      // Rede
  MessageCircle, // Comunidade
  ShoppingBag, // Loja
  Calendar,    // Agenda
  UserCircle,  // Perfil
  LogOut 
} from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // LISTA COMPLETA DE LINKS (Igual ao seu print de Desktop)
  const menuItems = [
    { name: "Visão Geral", href: "/", icon: LayoutGrid },
    { name: "Evolução", href: "/jornada", icon: TrendingUp },
    { name: "Minha Rede", href: "/rede", icon: Users },
    { name: "Comunidade", href: "/comunidade", icon: MessageCircle },
    { name: "Loja PRO", href: "/loja", icon: ShoppingBag },
    { name: "Eventos", href: "/agenda", icon: Calendar },
    { name: "Meu Perfil", href: "/perfil", icon: UserCircle },
  ];

  return (
    <>
      {/* ==============================================================
          🖥️ DESKTOP SIDEBAR (Fixo na esquerda, Fundo Preto)
      ============================================================== */}
      <aside className="hidden md:flex flex-col w-64 h-screen bg-black border-r border-white/10 fixed left-0 top-0 z-50">
        
        {/* LOGO + SUBTITULO */}
        <div className="p-8 pb-4">
          <h1 className="text-2xl font-black text-white italic tracking-tighter">
            MASC <span className="text-[#C9A66B]">PRO</span>
          </h1>
          <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-1">Hub Educacional</p>
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                  ${isActive 
                    ? "bg-[#1A1A1A] text-white border-l-2 border-[#C9A66B]" 
                    : "text-slate-500 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <Icon size={20} className={isActive ? "text-[#C9A66B]" : "text-slate-500 group-hover:text-white"} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* BOTÃO SAIR */}
        <div className="p-6 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-slate-600 hover:text-red-500 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Sair</span>
          </button>
        </div>
      </aside>

      {/* ==============================================================
          📱 MOBILE TOP BAR (Logo no topo)
      ============================================================== */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-black z-50 flex items-center justify-center border-b border-white/10">
        <h1 className="text-lg font-black text-white italic tracking-tighter">
            MASC <span className="text-[#C9A66B]">PRO</span>
        </h1>
      </div>

      {/* ==============================================================
          📱 MOBILE BOTTOM BAR (Navegação embaixo)
          Focamos nos 5 principais ícones para caber na tela
      ============================================================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-black border-t border-white/10 z-50 flex justify-around items-center px-2 pb-2">
        
        {/* Usamos apenas os 5 itens principais para o mobile não quebrar */}
        {[menuItems[0], menuItems[1], menuItems[6], menuItems[2], menuItems[4]].map((item, index) => {
             const isActive = pathname === item.href;
             const Icon = item.icon;
             const isProfile = item.name === "Meu Perfil";

             return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all
                    ${isProfile && isActive ? "bg-[#C9A66B] text-black -mt-6 border-4 border-black shadow-lg shadow-[#C9A66B]/20" : ""}
                    ${!isProfile && isActive ? "text-[#C9A66B]" : "text-slate-600"}
                  `}
                >
                  <Icon size={isProfile ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
                  {!isProfile && <span className="text-[9px] mt-1 font-medium">{item.name.split(" ")[0]}</span>}
                </Link>
             );
        })}
      </div>
    </>
  );
}