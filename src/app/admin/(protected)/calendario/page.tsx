import { requireOperator } from '@/lib/auth/gate'
import { spToday } from '@/app/admin/_ui/format'
import { parseCalendarLocation, windowFor } from '@/app/admin/_ui/calendario'
import { Alert } from '@/components/ui'
import { CalendarioClient } from './CalendarioClient'
import { loadCalendarPage } from './data'
import './calendario.css'

/**
 * Calendário (Fase 4) — a agenda do estúdio e o CRM na mesma tela.
 *
 * O servidor resolve a janela da vista pedida e entrega o primeiro lote; daí em
 * diante a navegação é do client, que só volta ao servidor quando sai da janela
 * carregada. Filtro é SEMPRE client-side, num memo único (contrato §1.1).
 *
 * "Hoje" é resolvido aqui, no servidor, e desce por prop: se o client
 * calculasse por conta própria, o dia do usuário e o dia da URL poderiam
 * divergir na virada da meia-noite e o marcador do dia atual pularia de célula.
 */

export const dynamic = 'force-dynamic'

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireOperator()

  const sp = await searchParams
  const today = spToday()
  const location = parseCalendarLocation(sp, today)
  const { from, to } = windowFor(location)

  const result = await loadCalendarPage(from, to)

  if (result.status === 'error') {
    return (
      <div className="flex flex-col gap-fh-5">
        <h1>Calendário</h1>
        <Alert variant="warning" title="Não foi possível carregar a agenda">
          <p>
            Pode ser instabilidade momentânea do banco. Os eventos continuam na
            agenda do Google — nada foi perdido.
          </p>
          {/* <a> puro: o Link do Next reaproveitaria o cache do router e
              "tentar de novo" não tentaria nada. */}
          <a href="/admin/calendario" className="fh-cal-link">
            Tentar de novo
          </a>
        </Alert>
      </div>
    )
  }

  return (
    <CalendarioClient
      today={today}
      initialLocation={location}
      initialEvents={result.data.events}
      initialWindow={{ from, to }}
      lastSyncedAt={result.data.lastSyncedAt}
      sourceLabel={result.data.sourceLabel}
      tags={result.data.tags}
    />
  )
}
