import Sidebar from "@/componentes/Sidebar"; 
import MobileBottomNav from "@/componentes/MobileBottomNav"; 

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      
      {/* ESQUERDA: Sidebar (Só aparece no PC) */}
      <Sidebar />

      {/* CENTRO: Conteúdo */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
        {/* Padding responsivo: 
            md:p-12 (PC, muito espaço)
            p-6 pb-28 (Celular, espaço extra embaixo pro menu não cobrir nada) */}
        <div className="p-6 pb-28 md:p-12 md:pb-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* BAIXO: MobileNav (Só aparece no Celular) */}
      <MobileBottomNav />
      
    </div>
  );
}