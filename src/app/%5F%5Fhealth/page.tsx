import { createAdminClient } from '@/lib/supabase/admin'
import { findPersonByPhone } from '@/app/actions/people'
import { HealthClient } from './HealthClient'

export default async function HealthPage() {
  let status = 'pendente'
  let peopleCount: number | null = null
  let errorMessage: string | null = null

  try {
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })

    if (error) {
      status = 'erro'
      errorMessage = error.message
      console.error('[__health] supabase error:', error.message)
    } else {
      status = 'ok'
      peopleCount = count
      console.log('[__health] supabase ok, people count:', count)
    }
  } catch (e) {
    status = 'erro'
    errorMessage = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[__health] throw:', errorMessage)
  }

  return (
    <main className="max-w-[560px] mx-auto px-8 py-20 min-h-screen font-mono text-sm">
      <h1 className="text-xl mb-6">Health check</h1>

      <section className="space-y-2 mb-12">
        <div>Status: <strong>{status}</strong></div>
        <div>People count: <strong>{peopleCount ?? 'n/a'}</strong></div>
        {errorMessage && (
          <div className="text-[color:var(--oxblood)]">Erro: {errorMessage}</div>
        )}
        <div className="text-[color:var(--granite)] text-xs">
          Conexão via service_role (bypass RLS).
        </div>
      </section>

      <section className="border-t border-[color:var(--line)] pt-8">
        <h2 className="text-lg mb-4">Buscar pessoa por telefone</h2>
        <HealthClient findPersonAction={findPersonByPhone} />
      </section>

      <div className="text-[color:var(--granite)] text-xs mt-12">
        Rota técnica. Será removida antes do lançamento público.
      </div>
    </main>
  )
}
