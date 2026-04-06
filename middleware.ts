import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Agendamento público: cliente não deve passar por login/cadastro PRO
  if (pathname === '/agendar' || pathname.startsWith('/agendar/')) {
    return NextResponse.next()
  }

  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 1. Se NÃO estiver logado e tentar acessar área interna -> Manda para Login
  if (!session && pathname.startsWith('/home')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  
  // 2. Se NÃO estiver logado e tentar acessar a raiz -> Manda para Login
  if (!session && pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 3. Se JÁ estiver logado e tentar acessar Login ou Raiz -> Manda para Home
  if (session && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  return res
}

export const config = {
  matcher: ['/', '/login', '/home/:path*', '/agendar', '/agendar/:path*'],
}