import Sidebar from "@/componentes/Sidebar"; 
import MobileMenu from "@/componentes/MobileMenu"; // Novo Import

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-black overflow-hidden">
      
      {/* 1. Menu Mobile (Só aparece no celular) */}
      <MobileMenu />

      {/* 2. Menu Desktop (Só aparece no PC) */}
      <Sidebar />

      {/* 3. Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="p-6 md:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}