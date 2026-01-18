import Sidebar from "@/componentes/Sidebar"; 
import MobileBottomNav from "@/componentes/MobileBottomNav"; 

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      
      {/* 1. Menu PC (Esquerda) */}
      <Sidebar />

      {/* 2. Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
        <div className="p-6 pb-28 md:p-12 md:pb-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* 3. Menu Celular (Rodapé) */}
      <MobileBottomNav />
      
    </div>
  );
}