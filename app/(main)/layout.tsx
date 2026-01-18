import Sidebar from "@/componentes/Sidebar"; 
// Não precisa mais importar MobileBottomNav aqui!

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      
      {/* O Sidebar agora cuida do PC (lado) e do Celular (baixo) sozinho */}
      <Sidebar />

      <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
        {/* Espaço extra embaixo no mobile (pb-28) para o menu não tapar nada */}
        <div className="p-6 pb-28 md:p-12 md:pb-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      
    </div>
  );
}