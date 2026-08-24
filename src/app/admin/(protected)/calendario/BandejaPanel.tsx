'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { linkEventPerson, type PersonOption } from '@/app/actions/calendar'
import { formatDayShort, isLocked, type CalendarEventRow } from '@/app/admin/_ui/calendario'
import { spDayKey } from '@/app/admin/_ui/format'
import { Button } from '@/components/ui'
import { PersonPicker } from './PersonPicker'

/**
 * Bandeja de vínculo — o backlog de eventos do Google que ainda não têm dono.
 *
 * O contexto que ela resolve: hoje NENHUM evento da agenda tem telefone na
 * descrição, então o backlog inteiro nasce aqui. Da convenção em diante o
 * matcher esvazia a bandeja sozinho, e ela vira a exceção que era pra ser.
 *
 * Vincular NÃO reescreve nada no Google (contrato §13a): o vínculo é do CRM, e
 * CRM tocando evento nativo fura o cadeado que a tela inteira promete.
 */

export type BandejaPanelProps = {
  events: CalendarEventRow[]
  loading: boolean
  onLinked: (message: string) => void
}

export function BandejaPanel({ events, loading, onLinked }: BandejaPanelProps) {
  return (
    <section className="fh-cal-bandeja">
      <header>
        <strong>Bandeja de vínculo</strong>
        <span className="fh-micro">eventos do Google ainda sem cliente vinculado</span>
      </header>

      {loading ? (
        <p className="fh-cal-bandeja__msg">Carregando o backlog…</p>
      ) : events.length === 0 ? (
        <p className="fh-cal-bandeja__msg">
          ✓ Bandeja vazia — todo evento do Google tem dono.
        </p>
      ) : (
        <ul>
          {events.map((event) => (
            <BandejaRow key={event.event_id} event={event} onLinked={onLinked} />
          ))}
        </ul>
      )}
    </section>
  )
}

function BandejaRow({
  event,
  onLinked,
}: {
  event: CalendarEventRow
  onLinked: (message: string) => void
}) {
  const [person, setPerson] = useState<PersonOption | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function link() {
    if (!person || !event.event_id) return
    setError(null)
    setSaving(true)
    const result = await linkEventPerson({ eventId: event.event_id, personId: person.id })
    setSaving(false)

    if (result.status === 'ok') {
      onLinked(
        `Vinculado a ${person.name ?? 'contato'}. O vínculo fica no CRM; o evento no Google não muda.`
      )
      return
    }
    setError(result.status === 'invalid' ? result.reason : result.message)
  }

  return (
    <li className="fh-cal-bandeja__row">
      <div className="fh-cal-bandeja__what">
        <span className="fh-cal-bandeja__date">{formatDayShort(spDayKey(event.starts_at))}</span>
        <span className="fh-cal-bandeja__title">
          {isLocked(event) && (
            <Lock size={11} strokeWidth={1.9} aria-label="Criado no Google" />
          )}
          {event.title ?? '(sem título)'}
        </span>
      </div>

      <div className="fh-cal-bandeja__pick">
        <PersonPicker
          selected={person}
          onSelect={setPerson}
          label=""
          disabled={saving}
        />
        <Button size="sm" onClick={link} loading={saving} disabled={!person}>
          Vincular
        </Button>
      </div>

      {error && (
        <p className="fh-error" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}
