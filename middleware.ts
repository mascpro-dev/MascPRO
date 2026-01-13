import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Verifica se existe uma sessão ativa
  const { data: { session } } = await supabase.auth.getSession()

  // Se o usuário NÃO estiver logado e tentar entrar no dashboard (página inicial, agenda, etc)
  // redireciona ele para a página de login
  if (!session && req.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Se o usuário JÁ estiver logado e tentar ir para o login, manda ele para a home
  if (session && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

// Configura quais páginas o middleware deve vigiar
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
