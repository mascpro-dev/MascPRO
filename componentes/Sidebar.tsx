"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  LayoutGrid,     // Início
  PlayCircle,     // Aulas
  Share2,         // Rede
  User,           // Perfil (Botão Central)
  Trophy,         // Rank
  UserCircle,     // Perfil (Icone menu desktop)
  Menu, X,        // Controles Mobile
  ShoppingBag, Calendar, LogOut, TrendingUp, MessageCircle
} from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // --- DESKTOP (Completo) ---
  const desktopItems = [
    { name: "Visão Geral", href: "/", icon: LayoutGrid },
    { name: "Aulas", href: "/aulas", icon: PlayCircle }, // Vai para o catálogo
    { name: "Evolução", href: "/jornada", icon: TrendingUp }, // Vai para a hierarquia
    { name: "Minha Rede", href: "/rede", icon: Share2 },
    { name: "Ranking", href: "/comunidade", icon: Trophy }, // Comunidade = Ranking
    { name: "Loja PRO", href: "/loja", icon: ShoppingBag },
    { name: "Eventos", href: "/agenda", icon: Calendar },
    { name: "Meu Perfil", href: "/perfil", icon: UserCircle },
  ];

  // --- MOBILE (IGUAL FOTO WHATSAPP) ---
  const mobileItems = [
    { name: "Início", href: "/", icon: LayoutGrid },
    { name: "Aulas", href: "/aulas", icon: PlayCircle },
    { name: "Perfil", href: "/perfil", icon: User, isFloating: true }, // O Dourado no Meio
    { name: "Rank", href: "/comunidade", icon: Trophy }, // Rank leva para a Comunidade
    { name: "Rede", href: "/rede", icon: Share2 },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 h-screen bg-black border-r border-white/10 fixed left-0 top-0 z-50">
        <div className="p-8 pb-4">
          <h1 className="text-2xl font-black text-white italic tracking-tighter">
            MASC <span className="text-[#C9A66B]">PRO</span>
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          {desktopItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive ? "bg-[#1A1A1A] text-white border-l-2 border-[#C9A66B]" : "text-slate-500 hover:text-white hover:bg-white/5"}`}>
                <Icon size={20} className={isActive ? "text-[#C9A66B]" : "text-slate-500 group-hover:text-white"} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-6 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2 text-slate-600 hover:text-red-500 transition-colors">
            <LogOut size={18} /><span className="text-xs font-bold uppercase tracking-wider">Sair</span>
          </button>
        </div>
      </aside>

      {/* MOBILE TOP */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-6">
        <h1 className="text-lg font-black text-white italic tracking-tighter">MASC <span className="text-[#C9A66B]">PRO</span></h1>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-300 hover:text-white"><Menu size={24} /></button>
      </div>

      {/* MOBILE BOTTOM (Igual Foto) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[80px] bg-black border-t border-white/10 z-50 flex justify-between items-center px-6 pb-2">
        {mobileItems.map((item) => {
             const isActive = pathname === item.href;
             const Icon = item.icon;

             // BOTÃO CENTRAL FLUTUANTE (PERFIL)
             if (item.isFloating) {
               return (
                 <div key={item.name} className="relative -top-8">
                   <Link href={item.href} className="w-16 h-16 rounded-full flex items-center justify-center bg-[#C9A66B] border-[6px] border-black shadow-[0_0_20px_rgba(201,166,107,0.4)] transition-transform active:scale-95">
                     <Icon size={28} className="text-black" strokeWidth={2.5} />
                   </Link>
                 </div>
               );
             }
             
             // ÍCONES NORMAIS
             return (
                <Link key={item.name} href={item.href} className={`flex flex-col items-center gap-1 transition-colors ${isActive ? "text-[#C9A66B]" : "text-slate-500"}`}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-bold">{item.name}</span>
                </Link>
             );
        })}
      </div>

      {/* MOBILE GAVETA (Menu Extra) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl animate-in fade-in flex flex-col p-8">
           <div className="flex justify-end"><button onClick={() => setIsMobileMenuOpen(false)}><X size={32} className="text-white" /></button></div>
           <div className="flex flex-col gap-6 mt-10">
              <Link href="/jornada" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 text-xl font-bold text-white"><TrendingUp /> Evolução</Link>
              <Link href="/loja" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 text-xl font-bold text-white"><ShoppingBag /> Loja</Link>
              <hr className="border-white/10" />
              <button onClick={handleLogout} className="flex items-center gap-4 text-xl font-bold text-red-500"><LogOut /> Sair</button>
           </div>
        </div>
      )}
    </>
  );
}