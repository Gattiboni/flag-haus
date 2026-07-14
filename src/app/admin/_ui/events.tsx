import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatRelativeTime } from '@/lib/format'

/**
 * Lista de eventos compartilhada pelo detalhe do job e da pessoa (#4c §3 e §5).
 * O `actor_id` (auth.users.id) é resolvido pro e-mail via a Admin Auth API — a
 * tabela auth não é exposta pelo PostgREST, então não dá pra fazer join na query.
 */

type AdminClient = ReturnType<typeof createAdminClient>

export type AdminEvent = {
  id: string
  event_type: string
  actor_id: string | null
  occurred_at: string
}

// Rótulos legíveis pros event_types que aparecem nestas telas. Desconhecido cai
// no próprio event_type cru (namespace.action é auto-explicativo o bastante).
const EVENT_LABELS: Record<string, string> = {
  'admin.job_updated': 'Job atualizado',
  'admin.person_updated': 'Pessoa atualizada',
  'admin.person_field_unlocked': 'Campo destravado',
  'form.anamnese_submitted': 'Anamnese enviada',
  'form.cadastro_submitted': 'Cadastro enviado',
}

/**
 * Resolve o e-mail de cada user_id distinto (auth.users). São poucos (a allowlist
 * do admin), então uma chamada por id, deduplicada, é barato o suficiente. Serve
 * tanto pro actor dos eventos quanto pro dono das travas de `admin_locks`.
 */
export async function resolveUserEmails(
  admin: AdminClient,
  ids: Array<string | null | undefined>
): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter((v): v is string => !!v))]
  const entries = await Promise.all(
    unique.map(async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id)
      if (error) {
        console.error('[resolveUserEmails] getUserById failed:', error.message)
        return [id, ''] as const
      }
      return [id, data?.user?.email ?? ''] as const
    })
  )
  return Object.fromEntries(entries.filter(([, email]) => email))
}

/** Conveniência: resolve os actors de uma lista de eventos. */
export function resolveActorEmails(
  admin: AdminClient,
  events: AdminEvent[]
): Promise<Record<string, string>> {
  return resolveUserEmails(
    admin,
    events.map((e) => e.actor_id)
  )
}

export function EventList({
  events,
  actorEmails,
}: {
  events: AdminEvent[]
  actorEmails: Record<string, string>
}) {
  if (events.length === 0) {
    return <p className="text-sm text-[color:var(--granite)]">Sem eventos.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {events.map((e) => {
        const who = e.actor_id ? actorEmails[e.actor_id] : ''
        return (
          <li key={e.id} className="text-sm border-b border-[color:var(--line)] pb-2">
            <span>{EVENT_LABELS[e.event_type] ?? e.event_type}</span>
            <span className="block text-xs text-[color:var(--granite)]">
              {who ? `${who} · ` : ''}
              {formatRelativeTime(e.occurred_at)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
