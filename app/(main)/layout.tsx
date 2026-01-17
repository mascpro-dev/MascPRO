// USANDO O ATALHO ABSOLUTO (Blindado contra erros de pasta)
import Sidebar from "@/componentes/Sidebar"; 

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* 1. O Menu Lateral Fixo */}
      <Sidebar />

      {/* 2. O Conteúdo (Visão Geral) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 md:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}