import Sidebar from "../../../componentes/Sidebar"; // Verifique se o caminho do seu Sidebar está correto aqui

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* 1. O MENU LATERAL FIXO */}
      <Sidebar />

      {/* 2. O CONTEÚDO (Visão Geral, Aulas, etc) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 md:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}