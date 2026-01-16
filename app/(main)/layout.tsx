"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  GraduationCap, 
  Users, 
  ShoppingBag, 
  Calendar, 
  User, 
  LogOut, 
  Menu, 
  X 
} from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  const navItems = [
    { href: "/home", label: "Visão Geral", icon: LayoutDashboard },
    { href: "/evolucao", label: "Evolução", icon: GraduationCap },
    { href: "/comunidade", label: "Comunidade", icon: Users },
    { href: "/produtos", label: "Loja PRO", icon: ShoppingBag },
    { href: "/eventos", label: "Eventos", icon: Calendar },
    { href: "/perfil", label: "Meu Perfil", icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans">
      {/* --- SIDEBAR DESKTOP --- */}
      <aside className="hidden md:flex w-72 flex-col border-r border-slate-800 bg-slate-950 p-6 fixed h-full z-10">
        {/* Logo */}
        <div className="mb-10 pl-2">
          <h1 className="text-2xl font-black italic tracking-tighter text-white">
            MASC<span className="text-blue-600">PRO</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mt-1">
            Professional Education
          </p>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon
                  size={20}
                  className={isActive ? "text-blue-400" : "text-slate-500 group-hover:text-white"}
                />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Botão Sair */}
        <div className="pt-6 border-t border-slate-800">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* --- MENU MOBILE (Topo) --- */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 flex justify-between items-center">
        <span className="font-black italic text-lg text-white">
            MASC<span className="text-blue-600">PRO</span>
        </span>
        <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white p-2"
        >
            {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* --- MENU MOBILE (Lista Aberta) --- */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-slate-950 p-6 space-y-4">
             {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-4 px-4 py-4 rounded-xl bg-slate-900 text-slate-200 border border-slate-800"
              >
                <item.icon size={24} />
                <span className="font-bold text-lg">{item.label}</span>
              </Link>
            ))}
             <button
                onClick={handleSignOut}
                className="flex items-center gap-4 px-4 py-4 w-full rounded-xl text-red-400 bg-red-950/20 mt-8"
              >
                <LogOut size={24} />
                <span className="font-bold text-lg">Sair</span>
              </button>
        </div>
      )}

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <main className="flex-1 md:ml-72 min-h-screen bg-black">
        <div className="p-6 pt-24 md:p-10 md:pt-10 max-w-7xl mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
}