"use client"; 

import Sidebar from "@/componentes/Sidebar"; 
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
// import { useRouter, usePathname } from "next/navigation"; <--- Removido

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A catraca foi removida. O acesso agora é livre.
  
  return (
    <div className="flex flex-row h-screen bg-black overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
        <div className="px-6 pt-24 pb-32 md:p-12 md:pb-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}