import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
})

export const metadata: Metadata = {
  title: 'MASC PRO',
  description: 'Plataforma de Ensino Profissional',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-512x512.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
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
        <SpeedInsights />
      </body>
    </html>
  )
}