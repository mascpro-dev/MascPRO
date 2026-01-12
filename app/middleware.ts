import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Verifica se existe uma sessão ativa
  const { data: { session } } = await supabase.auth.getSession()

  const isDashboardPage = req.nextUrl.pathname.startsWith('/(dashboard)') || 
                          req.nextUrl.pathname === '/' ||
                          req.nextUrl.pathname.startsWith('/academy') ||
                          req.nextUrl.pathname.startsWith('/agenda') ||
                          req.nextUrl.pathname.startsWith('/loja')

  // Redirecionamento 01: Se não estiver logado e tentar acessar o App -> Login
  if (!session && isDashboardPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirecionamento 02: Se já estiver logado e tentar ir para o Login -> Dashboard
  if (session && req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}