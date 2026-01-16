"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, ShoppingBag, Menu, X } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  const navItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/loja", label: "Loja", icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar Desktop */}
      <aside className="w-64 p-6 border-r border-white/10 hidden md:block">
        <div className="mb-10">
           <h1 className="text-2xl font-black italic tracking-tighter text-white">
            MASC<span className="text-blue-500">PRO</span>
          </h1>
        </div>
        
        <nav className="space-y-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                pathname === item.href 
                ? "bg-blue-600 text-white shadow-lg" 
                : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}

          <button
            onClick={handleSignOut}
            className="text-red-400 hover:text-red-300 flex gap-3 px-4 py-3 w-full items-center mt-10 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} /> <span className="font-medium">Sair</span>
          </button>
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 bg-white md:rounded-l-[32px] overflow-hidden relative">
         {/* Botão Mobile */}
         <div className="md:hidden absolute top-4 right-4 z-50">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 bg-slate-900 text-white rounded-full shadow-lg"
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
         </div>

        <div className="h-full overflow-y-auto p-6 pt-16 md:pt-6">
            {children}
        </div>
      </main>
    </div>
  );
}