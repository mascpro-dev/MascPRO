// Importando com @/componentes (que é o jeito seguro)
import Sidebar from "@/componentes/Sidebar"; 
import MobileBottomNav from "@/componentes/MobileBottomNav"; 

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      
      {/* PC: Menu na Esquerda */}
      <Sidebar />

      {/* CONTEÚDO */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {/* Adicionei margem embaixo no celular (pb-24) pro menu não tampar o texto */}
        <div className="p-6 md:p-12 max-w-7xl mx-auto pb-24 md:pb-12">
          {children}
        </div>
      </main>

      {/* CELULAR: Menu Embaixo */}
      <MobileBottomNav />
      
    </div>
  );
}