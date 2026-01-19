"use client";

import Sidebar from "@/componentes/Sidebar";
import { useEffect, useState } from "react";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />
      <main className="transition-all duration-300 w-full min-h-screen">
        {/* pt-24 (96px) para o respiro superior no celular */}
        <div className="pt-24 pb-32 px-6 md:pt-12 md:pb-12 md:pl-[280px] max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}