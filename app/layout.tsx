import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
// Importação da ferramenta de análise (O erro visual acontece aqui, mas vai funcionar)
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MASC PRO',
  description: 'Plataforma de Ensino Profissional',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        {/* O componente deve ficar aqui, dentro do body */}
        <Analytics />
      </body>
    </html>
  )
}