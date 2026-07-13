import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Home do admin = a fila (chega na #4b). Por ora, placeholder honesto + uma
 * PROVA DE VIDA de dado: a contagem de jobs não deletados, lida via
 * service_role atrás do gate. Serve pra provar no β que o caminho
 * gate -> dado funciona de ponta a ponta.
 */
export default async function AdminHomePage() {
  await requireOperator()

  let jobCount: number | null = null
  try {
    const admin = createAdminClient()
    const { count, error } = await admin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
    if (!error) jobCount = count ?? 0
  } catch (e) {
    console.error(
      '[admin/home] job count failed:',
      e instanceof Error ? e.message : e
    )
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-fraunces)] text-2xl sm:text-3xl mb-3">
        Fila de trabalho
      </h1>
      <p className="text-[color:var(--granite)] mb-10">
        A fila chega na próxima etapa (#4b).
      </p>
      <p className="text-sm text-[color:var(--granite)] tracking-[0.02em]">
        {jobCount === null
          ? 'Não foi possível ler os jobs agora.'
          : `${jobCount} ${jobCount === 1 ? 'job' : 'jobs'} no sistema`}
      </p>
    </div>
  )
}
