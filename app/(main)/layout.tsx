import Sidebar from "@/componentes/Sidebar"; 

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-row h-screen bg-black overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
        
        {/* AGORA: pt-24 (Fica mais justo, logo abaixo do header) */}
        <div className="px-6 pt-24 pb-32 md:p-12 md:pb-12 max-w-7xl mx-auto">
          {children}
        </div>
        
      </main>
    </div>
  );
}