import type { ReactNode } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { requireOperator } from '@/lib/auth/gate'
import { signOutAdmin } from '@/app/actions/auth-admin'
import { Button, Input } from '@/components/ui'

/**
 * Shell do admin (área protegida). Vive num route group (protected) para que
 * /admin/login NÃO herde este gate — senão o login exigiria estar logado
 * (loop de redirect). URLs não mudam: (protected)/page.tsx = /admin.
 *
 * Todas as páginas de #4b–#4d entram neste grupo e herdam o gate + o header.
 *
 * `data-density="compact"` mora aqui: é a raiz de tudo que o Julio usa DURANTE
 * a sessão, com o cliente esperando. O formulário público fica na densidade
 * comfortable — mesmo componente, ar diferente.
 */
export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode
}) {
  const { email } = await requireOperator()

  return (
    <div data-density="compact" className="min-h-screen flex flex-col">
      <header className="flex flex-wrap justify-between items-center gap-x-fh-5 gap-y-fh-3 px-fh-5 sm:px-fh-6 py-fh-4 border-b border-fh-subtle bg-fh-surface">
        <Link href="/admin" className="fh-wordmark no-underline">
          Flag Haus <span className="text-fh-secondary">— Admin</span>
        </Link>

        {/* Busca: form GET nativo, sem JS. O Julio digita e aperta Enter. */}
        <form
          action="/admin/buscar"
          method="GET"
          role="search"
          className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-xs"
        >
          <Input
            type="search"
            name="q"
            placeholder="Buscar por nome ou telefone…"
            aria-label="Buscar pessoa"
            suffix={<Search size={18} strokeWidth={1.5} />}
          />
        </form>

        <div className="flex items-center gap-fh-3">
          <span className="fh-micro hidden sm:inline">{email}</span>
          <form action={signOutAdmin}>
            <Button type="submit" variant="tertiary" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1100px] mx-auto px-fh-5 sm:px-fh-6 py-fh-6">
        {children}
      </main>
    </div>
  )
}
