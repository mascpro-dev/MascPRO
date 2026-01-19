"use client";

import Sidebar from "@/componentes/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />
      <main className="w-full min-h-screen">
        {/* pt-24 (96px) para o texto de boas-vindas aparecer abaixo da barra */}
        <div className="pt-24 pb-32 px-6 md:pt-12 md:pb-12 md:pl-[280px] max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}