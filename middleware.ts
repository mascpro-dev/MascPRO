import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas públicas que nunca precisam de auth
const PUBLIC_ROUTES = ['/agendar', '/catalago', '/instalar-app', '/auth-choice', '/role-select']
const PUBLIC_PREFIXES = ['/agendar/', '/catalago/', '/api/mp-webhook', '/api/frete', '/api/config/loja', '/api/agendar/']

// Rotas que requerem APENAS login (qualquer usuário autenticado)
const AUTH_ONLY_PREFIXES = ['/home', '/agenda', '/perfil', '/comunidade', '/loja', '/evolucao', '/jornada', '/rede', '/eventos', '/aula', '/calculadora', '/embaixador', '/vendedor']

// Rotas admin com acesso para ADMIN e DISTRIBUIDOR
const ADMIN_DISTRIB_PREFIXES = ['/admin/crm', '/admin/returns']
const ADMIN_STRICT_PREFIXES = ['/admin']
const EMBAIXADORA_CRM_PREFIX = '/embaixador/crm'
const VENDEDOR_CRM_PREFIX = '/vendedor/crm'

async function resolveUserRole(
  supabase: ReturnType<typeof createMiddlewareClient>,
  userId: string,
  req: NextRequest,
  res: NextResponse
): Promise<string> {
  const roleCookie = req.cookies.get('user_role')?.value
  const uidCookie = req.cookies.get('user_role_uid')?.value

  if (roleCookie && uidCookie === userId) {
    return String(roleCookie).trim().toUpperCase()
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  const role = String(perfil?.role || '').trim().toUpperCase()

  res.cookies.set('user_role', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 30,
    path: '/',
  })
  res.cookies.set('user_role_uid', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 30,
    path: '/',
  })

  return role
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()

  // ── Sempre permitir rotas públicas ────────────────────────
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/api/') // APIs têm proteção própria via assertAdmin
  ) {
    return res
  }

  // ── Verifica sessão ───────────────────────────────────────
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // ── Sem sessão → login ────────────────────────────────────
  const needsAuth =
    pathname === '/' ||
    AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) ||
    ADMIN_STRICT_PREFIXES.some((p) => pathname.startsWith(p))

  if (!session && needsAuth) {
    const url = new URL('/login', req.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // ── Logado tentando acessar login → home ──────────────────
  if (session && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/home', req.url))
  }

  const precisaRole =
    session &&
    (ADMIN_STRICT_PREFIXES.some((p) => pathname.startsWith(p)) ||
      pathname.startsWith(EMBAIXADORA_CRM_PREFIX) ||
      pathname.startsWith(VENDEDOR_CRM_PREFIX))

  if (precisaRole && session) {
    const role = await resolveUserRole(supabase, session.user.id, req, res)

    const isAdmin = role === 'ADMIN'
    const isDistrib = role === 'DISTRIBUIDOR'
    const isEmbaixador = role === 'EMBAIXADOR'
    const isVendedor = role === 'VENDEDOR'

    if (pathname.startsWith(EMBAIXADORA_CRM_PREFIX) && !isEmbaixador) {
      return NextResponse.redirect(new URL('/home', req.url))
    }

    if (pathname.startsWith(VENDEDOR_CRM_PREFIX) && !isVendedor) {
      return NextResponse.redirect(new URL('/home', req.url))
    }

    if (ADMIN_STRICT_PREFIXES.some((p) => pathname.startsWith(p))) {
      if (ADMIN_DISTRIB_PREFIXES.some((p) => pathname.startsWith(p))) {
        if (!isAdmin && !isDistrib) {
          return NextResponse.redirect(new URL('/home', req.url))
        }
      } else if (!isAdmin) {
        return NextResponse.redirect(new URL('/home', req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    // Cobre todas as rotas exceto arquivos estáticos e _next
    '/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}
