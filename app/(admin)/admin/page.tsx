"use client";

import AdminSidebar from "@/componentes/AdminSidebar";

export default function AdminPage() {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">
          Painel de <span className="text-[#C9A66B]">Controle Admin</span>
        </h1>
        <p className="text-zinc-500 mt-2">Bem-vindo ao centro de comando, Marcelo.</p>
        
        {/* Cards de resumo rápido podem vir aqui depois */}
      </main>
    </div>
  );
}
