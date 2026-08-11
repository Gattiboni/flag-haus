'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ListChecks, Users } from 'lucide-react'
import { CADASTROS_PATH } from './cadastros'
import './admin-nav.css'

/**
 * Navegação do admin (Bloco 4 §3A). Dois destinos reais e mais nada — sem
 * "Painel", sem placeholder, sem item desabilitado: um item que não leva a
 * lugar nenhum ensina o Julio a desconfiar do menu.
 *
 * Client Component só por causa do `usePathname` (marcar o item ativo). O gate
 * continua onde sempre esteve: no layout server, via `requireOperator`.
 */

type NavItem = {
  href: string
  label: string
  icon: typeof ListChecks
  /** Rotas que também acendem este item (detalhes que saem dele). */
  match: (pathname: string) => boolean
}

const ITEMS: readonly NavItem[] = [
  {
    href: '/admin',
    label: 'Funil',
    icon: ListChecks,
    // O detalhe do job é filho da fila; /admin/people não é de ninguém (chega
    // pela busca global, pelo funil e pelos cadastros).
    match: (p) => p === '/admin' || p.startsWith('/admin/jobs'),
  },
  {
    href: CADASTROS_PATH,
    label: 'Cadastros',
    icon: Users,
    match: (p) => p.startsWith(CADASTROS_PATH),
  },
]

/** Sidebar do desktop. Escondida no celular pela barra inferior. */
export function AdminSidebar() {
  const pathname = usePathname() ?? ''

  return (
    <aside className="fh-admin-sidebar hidden md:block">
      <nav aria-label="Seções do admin" className="flex flex-col gap-fh-1">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="fh-admin-nav__item"
            aria-current={item.match(pathname) ? 'page' : undefined}
          >
            <span className="fh-admin-nav__icon">
              <item.icon size={18} strokeWidth={1.5} aria-hidden="true" />
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

/**
 * Barra inferior do celular. O admin é usado em iPhone com o cliente na
 * cadeira: o alvo fica no alcance do polegar, não no topo da tela.
 */
export function AdminBottomNav() {
  const pathname = usePathname() ?? ''

  return (
    <nav aria-label="Seções do admin" className="fh-admin-bottomnav md:hidden">
      <div className="fh-admin-bottomnav__list">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="fh-admin-bottomnav__item"
            aria-current={item.match(pathname) ? 'page' : undefined}
          >
            <item.icon size={20} strokeWidth={1.5} aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
