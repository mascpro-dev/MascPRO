import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MASC PRO | Login',
  description: 'Acesso à área de membros',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black text-white">
       {/* Layout simples para telas de Login/Cadastro */}
       {children}
    </div>
  )
}