import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Verifica se o usuário está logado
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Se NÃO estiver logado e tentar entrar em área protegida (home, perfil, etc)
  // Manda de volta pro Login
  if (!session && req.nextUrl.pathname.startsWith('/home')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  
  if (!session && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Se JÁ estiver logado e tentar ir pro Login
  // Manda direto pra Home
  if (session && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  return res
}

export const config = {
  matcher: ['/', '/login', '/home/:path*', '/perfil/:path*'],
}