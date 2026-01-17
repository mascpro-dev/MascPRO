import Sidebar from "@/componentes/Sidebar"; 
import MobileBottomNav from "@/componentes/MobileBottomNav"; 

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      
      {/* PC: Menu Esquerdo */}
      <Sidebar />

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {/* pb-24 garante espaço pro menu do celular não tapar nada */}
        <div className="p-6 md:p-12 max-w-7xl mx-auto pb-24 md:pb-12">
          {children}
        </div>
      </main>

      {/* Celular: Menu Rodapé */}
      <MobileBottomNav />
      
    </div>
  );
}