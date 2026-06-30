import { createClient } from '@/lib/supabase/server'

export default async function HealthPage() {
  const supabase = await createClient()

  let status = 'pendente'
  let peopleCount: number | null = null
  let errorMessage: string | null = null

  try {
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
      <div className="space-y-2">
        <div>Status: <strong>{status}</strong></div>
        <div>People count: <strong>{peopleCount ?? 'n/a'}</strong></div>
        {errorMessage && (
          <div className="text-[color:var(--oxblood)]">Erro: {errorMessage}</div>
        )}
        <div className="text-[color:var(--granite)] mt-6 text-xs">
          Rota técnica. Será removida antes do lançamento público.
        </div>
      </div>
    </main>
  )
}
