import type { ReactNode } from 'react'
import Link from 'next/link'
import { requireOperator } from '@/lib/auth/gate'
import { signOutAdmin } from '@/app/actions/auth-admin'

/**
 * Shell do admin (área protegida). Vive num route group (protected) para que
 * /admin/login NÃO herde este gate — senão o login exigiria estar logado
 * (loop de redirect). URLs não mudam: (protected)/page.tsx = /admin.
 *
 * Todas as páginas de #4b–#4d entram neste grupo e herdam o gate + o header.
 */
export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  const { email } = await requireOperator()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex flex-wrap justify-between items-center gap-x-6 gap-y-3 px-6 sm:px-8 py-5 border-b border-[color:var(--line)]">
        <Link
          href="/admin"
          className="font-[family-name:var(--font-fraunces)] text-lg tracking-[0.02em] hover:text-[color:var(--oxblood)] transition-colors"
        >
          Flag Haus{' '}
          <span className="text-[color:var(--granite)]">— Admin</span>
        </Link>

        {/* Busca: form GET nativo, sem JS. O Julio digita e aperta Enter. */}
        <form
          action="/admin/buscar"
          method="GET"
          role="search"
          className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-xs"
        >
          <input
            type="search"
            name="q"
            placeholder="Buscar por nome ou telefone…"
            aria-label="Buscar pessoa"
            className="w-full border-b border-[color:var(--line)] bg-transparent py-1.5 text-sm focus:outline-none focus:border-[color:var(--onyx)] transition-colors placeholder:text-[color:var(--granite)]"
          />
        </form>

        <div className="flex items-center gap-5 text-sm">
          <span className="text-[color:var(--granite)] hidden sm:inline tracking-[0.02em]">
            {email}
          </span>
          <form action={signOutAdmin}>
            <button
              type="submit"
              className="text-[color:var(--granite)] hover:text-[color:var(--oxblood)] transition-colors cursor-pointer tracking-[0.04em]"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[900px] mx-auto px-6 sm:px-8 py-12 sm:py-16">
        {children}
      </main>
    </div>
  )
}
