"use client"

import Sidebar from "@/components/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* CHAMADA ÚNICA DA SIDEBAR: 
          Isso evita que o código fique duplicado e garante que as 04 abas 
          (incluindo "Meu Nível") apareçam no celular e PC.
      */}
      <Sidebar />

      {/* CONTEÚDO DA PÁGINA (Academy, Agenda, Loja, etc) */}
      <main className="flex-1 w-full relative overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}