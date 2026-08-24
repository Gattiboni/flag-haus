'use client'

import { Cake, ChevronLeft, ChevronRight, Circle, Lock, Syringe } from 'lucide-react'
import {
  addDayKey,
  spTime,
} from '@/app/admin/_ui/format'
import {
  formatDayLabel,
  formatDayShort,
  isLocked,
  monthGridStart,
  weekStart,
  type CalendarEventRow,
} from '@/app/admin/_ui/calendario'

/**
 * As três vistas do calendário e o cartão de evento que todas compartilham.
 *
 * Nenhuma delas filtra nada: recebem o mapa dia→eventos já cortado pelo memo
 * único do `CalendarioClient`. É o que garante que o "+N mais" do mês conte
 * exatamente o que a célula escondeu, com ou sem filtro ligado (item 10).
 */

/** Quantos cabem numa célula do mês antes do "+N mais". */
const MONTH_CELL_CAP = 3

/** 6 semanas × 7 dias: o grid do mês tem altura fixa, não pula de tamanho. */
const MONTH_CELLS = 42

const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'] as const

export type DayMap = Map<string, CalendarEventRow[]>

/** Identidade estável de um evento — aniversário não tem `event_id`. */
export function eventKey(e: CalendarEventRow): string {
  return e.event_id ?? `birthday:${e.person_id}:${e.starts_at}`
}

/* ------------------------------------------------------------------
   Cartão
   ------------------------------------------------------------------ */

function CategoryIcon({ category }: { category: CalendarEventRow['category'] }) {
  const props = { size: 13, strokeWidth: 1.7, 'aria-hidden': true as const }
  if (category === 'aniversario') return <Cake {...props} />
  if (category === 'sessao') return <Syringe {...props} />
  return <Circle {...props} />
}

export type EventCardProps = {
  event: CalendarEventRow
  onOpen: (event: CalendarEventRow) => void
  /** Presente só na vista de mês, que é a única com alvo de drop. */
  drag?: DragHandlers
}

export type DragHandlers = {
  onStart: (event: CalendarEventRow) => void
  onEnd: () => void
  /** Tentou arrastar um evento com cadeado — o feedback é obrigatório. */
  onBlocked: () => void
  onDropDay: (dayKey: string) => void
}

/**
 * [cadeado] [ícone da categoria] [hora] [título]. A cor vem da categoria, via
 * `data-cat` + a constante única do CSS — tag NUNCA pinta cartão (item 13).
 */
export function EventCard({ event, onOpen, drag }: EventCardProps) {
  const locked = isLocked(event)
  const title = event.title ?? '(sem título)'
  // Aniversário não é linha de tabela: não se arrasta nem se cadeia, ele
  // simplesmente não é um evento que exista pra ser movido.
  const draggable = Boolean(drag) && event.kind === 'event' && event.editable

  return (
    <button
      type="button"
      className="fh-cal-ev"
      data-cat={event.category}
      onClick={() => onOpen(event)}
      title={title}
      draggable={drag ? draggable : undefined}
      onDragStart={(ev) => {
        if (!drag) return
        if (!draggable) {
          // Cadeado bloqueia o arrasto, mas NUNCA em silêncio: sem o aviso, o
          // Julio conclui que a tela travou.
          ev.preventDefault()
          drag.onBlocked()
          return
        }
        ev.dataTransfer.effectAllowed = 'move'
        // O Firefox só inicia o arrasto se houver dado no transfer.
        ev.dataTransfer.setData('text/plain', event.event_id ?? '')
        drag.onStart(event)
      }}
      onDragEnd={() => drag?.onEnd()}
    >
      {locked && (
        <Lock
          size={11}
          strokeWidth={1.9}
          className="fh-cal-ev__lock"
          aria-label="Criado no Google"
        />
      )}
      <CategoryIcon category={event.category} />
      {!event.all_day && <span className="fh-cal-ev__h">{spTime(event.starts_at)}</span>}
      <span className="fh-cal-ev__t">{title}</span>
    </button>
  )
}

/* ------------------------------------------------------------------
   Mês
   ------------------------------------------------------------------ */

export type MonthViewProps = {
  anchor: string
  today: string
  byDay: DayMap
  expanded: Set<string>
  onExpand: (dayKey: string) => void
  onOpen: (event: CalendarEventRow) => void
  drag: DragHandlers
  /** Dia sob o cursor durante o arrasto — realce do alvo. */
  dragOver: string | null
  onDragOverDay: (dayKey: string | null) => void
}

export function MonthView({
  anchor,
  today,
  byDay,
  expanded,
  onExpand,
  onOpen,
  drag,
  dragOver,
  onDragOverDay,
}: MonthViewProps) {
  const gridStart = monthGridStart(anchor)
  const month = anchor.slice(5, 7)

  return (
    <div className="fh-cal-month">
      {WEEKDAYS.map((d) => (
        <div key={d} className="fh-cal-dow">
          {d}
        </div>
      ))}

      {Array.from({ length: MONTH_CELLS }, (_, i) => {
        const day = addDayKey(gridStart, i)
        const dayEvents = byDay.get(day) ?? []
        const isOpen = expanded.has(day)
        const shown = isOpen ? dayEvents : dayEvents.slice(0, MONTH_CELL_CAP)
        const hidden = dayEvents.length - shown.length

        return (
          <div
            key={day}
            className="fh-cal-day"
            data-outside={day.slice(5, 7) !== month || undefined}
            data-today={day === today || undefined}
            data-dragover={dragOver === day || undefined}
            onDragOver={(ev) => {
              // Sem o preventDefault o navegador recusa o drop, e o cartão
              // "volta" pro lugar sem nenhuma explicação.
              ev.preventDefault()
              ev.dataTransfer.dropEffect = 'move'
              if (dragOver !== day) onDragOverDay(day)
            }}
            onDragLeave={() => {
              if (dragOver === day) onDragOverDay(null)
            }}
            onDrop={(ev) => {
              ev.preventDefault()
              onDragOverDay(null)
              drag.onDropDay(day)
            }}
          >
            <div className="fh-cal-day__num">{Number(day.slice(8, 10))}</div>
            <div className="fh-cal-day__evs">
              {shown.map((e) => (
                <EventCard key={eventKey(e)} event={e} onOpen={onOpen} drag={drag} />
              ))}
              {hidden > 0 && (
                <button
                  type="button"
                  className="fh-cal-more"
                  onClick={() => onExpand(day)}
                >
                  +{hidden} mais
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------
   Semana
   ------------------------------------------------------------------ */

export type WeekViewProps = {
  anchor: string
  today: string
  byDay: DayMap
  /** Dia visível no celular — a semana colapsa pra um dia por vez. */
  mobileDay: string
  onMobileDay: (dayKey: string) => void
  onOpen: (event: CalendarEventRow) => void
}

export function WeekView({
  anchor,
  today,
  byDay,
  mobileDay,
  onMobileDay,
  onOpen,
}: WeekViewProps) {
  const start = weekStart(anchor)
  const days = Array.from({ length: 7 }, (_, i) => addDayKey(start, i))

  return (
    <>
      {/* Navegação do celular: sete colunas em 390px viram sete tiras ilegíveis,
          então a semana vira um dia por vez com passo próprio (item 11). */}
      <div className="fh-cal-weeknav">
        <button
          type="button"
          className="fh-cal-iconbtn"
          onClick={() => onMobileDay(addDayKey(mobileDay, -1))}
          aria-label="Dia anterior"
        >
          <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <strong>{formatDayLabel(mobileDay)}</strong>
        <button
          type="button"
          className="fh-cal-iconbtn"
          onClick={() => onMobileDay(addDayKey(mobileDay, 1))}
          aria-label="Próximo dia"
        >
          <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      <div className="fh-cal-week">
        {days.map((day) => {
          const dayEvents = byDay.get(day) ?? []
          return (
            <div
              key={day}
              className="fh-cal-wday"
              data-today={day === today || undefined}
              data-mobile-active={day === mobileDay || undefined}
            >
              <div className="fh-cal-wday__head">{formatDayLabel(day)}</div>
              {dayEvents.length === 0 ? (
                <p className="fh-cal-free">livre</p>
              ) : (
                dayEvents.map((e) => (
                  <EventCard key={eventKey(e)} event={e} onOpen={onOpen} />
                ))
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------
   Agenda
   ------------------------------------------------------------------ */

export type AgendaViewProps = {
  anchor: string
  today: string
  byDay: DayMap
  onOpen: (event: CalendarEventRow) => void
}

/** A vista de celular por excelência: "o que vem aí", em lista corrida. */
export function AgendaView({ anchor, today, byDay, onOpen }: AgendaViewProps) {
  const month = anchor.slice(0, 7)
  const days = [...byDay.keys()].filter((d) => d.startsWith(month)).sort()

  if (days.length === 0) return null

  return (
    <div className="fh-cal-agenda">
      {days.map((day) => (
        <section key={day} className="fh-cal-agroup">
          <h4 data-today={day === today || undefined}>
            {formatDayLabel(day)}
            {day === today && ' · hoje'}
          </h4>
          {(byDay.get(day) ?? []).map((e) => (
            <EventCard key={eventKey(e)} event={e} onOpen={onOpen} />
          ))}
        </section>
      ))}
    </div>
  )
}

/** Rótulo do intervalo da semana: "17/08 – 23/08". */
export function weekRangeLabel(anchor: string): string {
  const start = weekStart(anchor)
  return `${formatDayShort(start)} – ${formatDayShort(addDayKey(start, 6))}`
}
