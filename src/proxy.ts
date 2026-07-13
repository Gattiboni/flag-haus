import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy do admin — camada de UX (defesa em profundidade, camada 1).
 * (Antes chamado "middleware"; renomeado para a convenção `proxy` do Next 16.)
 *
 * Escopo FECHADO em /admin/*: os formulários públicos (/cadastro e
 * /antes-da-sessao) nunca passam por aqui, nem por acidente.
 *
 * - refresca o cookie de sessão (padrão updateSession do @supabase/ssr)
 * - sem sessão e rota != /admin/login  -> /admin/login
 * - com sessão e rota == /admin/login  -> /admin
 *
 * A segurança real é o requireOperator() (camada 2) + RLS deny-all (camada 3).
 * Este proxy só melhora a experiência; não é onde a porta tranca.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isLogin = pathname === '/admin/login'

  if (!user && !isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
