// Importando da pasta componentes (em português) que está na raiz
import Sidebar from "../../../componentes/Sidebar"; 

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar na esquerda */}
      <Sidebar />

      {/* Conteúdo na direita */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 md:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}