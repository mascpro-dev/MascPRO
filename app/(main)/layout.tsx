// CORREÇÃO: Agora apontando para "components" (em inglês)
import Sidebar from "@/components/Sidebar"; 

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Menu Lateral */}
      <Sidebar />

      {/* Conteúdo da Página */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 md:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}