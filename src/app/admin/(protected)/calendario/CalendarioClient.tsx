'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ChevronLeft, ChevronRight, Inbox, Lock, Plus, RefreshCw } from 'lucide-react'
import {
  loadCalendarEvents,
  loadUnlinkedEvents,
  rescheduleCalendarEvent,
  syncNow,
} from '@/app/actions/calendar'
import { addDayKey, formatDateTimeShortBR, spDayKey } from '@/app/admin/_ui/format'
import {
  ARTIST_BUCKETS,
  ARTIST_BUCKET_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  VIEWS,
  VIEW_LABELS,
  calendarHref,
  formatMonthLabel,
  groupByDay,
  hasActiveFilters,
  monthStart,
  weekStart,
  windowFor,
  type ArtistBucket,
  type CalendarCategory,
  type CalendarEventRow,
  type CalendarLocation,
} from '@/app/admin/_ui/calendario'
import { filterOptionLabel, type TagCatalogEntry } from '@/app/admin/_ui/tags'
import { Button } from '@/components/ui'
import { AgendaView, MonthView, WeekView, weekRangeLabel } from './CalendarViews'
import { EventDrawer } from './EventDrawer'
import { NewEventModal } from './NewEventModal'
import { BandejaPanel } from './BandejaPanel'
import { useStoredFilters } from './useStoredFilters'

/**
 * O cérebro da tela. Segura três coisas e mais nada:
 *
 * 1. **Onde o Julio está** (vista + data). Viaja na URL, porque é o que se
 *    manda por link. A sincronia é por `history.replaceState`, não pelo router
 *    do Next: `router.replace` re-renderizaria a page no servidor a cada seta,
 *    e a janela já carregada tornaria esse ida-e-volta puro desperdício.
 * 2. **O que ele está filtrando.** Fica em localStorage, porque é preferência
 *    pessoal e sujaria o link (divisão deliberada do item 19).
 * 3. **Os eventos da janela carregada.** Só volta ao servidor quando a
 *    navegação sai do intervalo que já veio.
 *
 * Todo filtro é client-side, num memo ÚNICO — categoria ∧ artista ∧ tag, AND
 * puro. Nenhuma vista filtra por conta própria.
 */

export type CalendarioClientProps = {
  today: string
  initialLocation: CalendarLocation
  initialEvents: CalendarEventRow[]
  initialWindow: { from: string; to: string }
  lastSyncedAt: string | null
  sourceLabel: string | null
  tags: TagCatalogEntry[]
}

export function CalendarioClient({
  today,
  initialLocation,
  initialEvents,
  initialWindow,
  lastSyncedAt,
  sourceLabel,
  tags,
}: CalendarioClientProps) {
  const [location, setLocation] = useState<CalendarLocation>(initialLocation)
  const [events, setEvents] = useState<CalendarEventRow[]>(initialEvents)
  const [loaded, setLoaded] = useState(initialWindow)
  const [filters, setFilters] = useStoredFilters()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<CalendarEventRow | null>(null)
  const [mobileDay, setMobileDay] = useState(initialLocation.anchor)
  const [stamp, setStamp] = useState(lastSyncedAt)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [syncing, setSyncing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const dragging = useRef<CalendarEventRow | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  /* --- Vista + data na URL, sem refetch do servidor. --- */
  useEffect(() => {
    window.history.replaceState(null, '', calendarHref(location, today))
  }, [location, today])

  /* --- Janela: recarrega só quando a navegação sai do que já veio. --- */
  useEffect(() => {
    const { from, to } = windowFor(location)
    if (from >= loaded.from && to <= loaded.to) return

    startTransition(async () => {
      const result = await loadCalendarEvents(from, to)
      if (result.status === 'error') {
        setLoadError(result.message)
        return
      }
      setLoadError(null)
      setEvents(result.events)
      setLoaded({ from, to })
    })
  }, [location, loaded])

  /* --- O memo único. Toda vista e o "+N mais" leem daqui. --- */
  const byDay = useMemo(() => groupByDay(events, filters), [events, filters])

  const visibleCount = useMemo(() => {
    const seen = new Set<CalendarEventRow>()
    for (const list of byDay.values()) for (const e of list) seen.add(e)
    return seen.size
  }, [byDay])

  /* --- Navegação --- */
  const go = useCallback(
    (next: Partial<CalendarLocation>) => {
      setExpanded(new Set())
      setLocation((prev) => ({ ...prev, ...next }))
    },
    []
  )

  function step(direction: 1 | -1) {
    if (location.view === 'week') {
      const anchor = addDayKey(location.anchor, 7 * direction)
      setMobileDay(addDayKey(mobileDay, 7 * direction))
      go({ anchor })
      return
    }
    // Mês e agenda andam de mês em mês, sempre a partir do dia 1: somar 30 dias
    // faria "próximo mês" pular fevereiro de vez em quando.
    const [y, m] = monthStart(location.anchor).split('-').map(Number)
    const d = new Date(Date.UTC(y, m - 1 + direction, 1))
    go({ anchor: d.toISOString().slice(0, 10) })
  }

  function goToday() {
    setMobileDay(today)
    go({ anchor: today })
  }

  function onMobileDay(day: string) {
    setMobileDay(day)
    // Andar o dia no celular pode atravessar a semana: o âncora acompanha, ou o
    // grid mostraria uma semana e o cabeçalho outra.
    if (weekStart(day) !== weekStart(location.anchor)) go({ anchor: day })
  }

  /* --- Filtros --- */
  function toggleCategory(cat: CalendarCategory | 'all') {
    setExpanded(new Set())
    setFilters((prev) => {
      if (cat === 'all') return { ...prev, cats: [] }
      const on = prev.cats.includes(cat)
      const cats = on ? prev.cats.filter((c) => c !== cat) : [...prev.cats, cat]
      return { ...prev, cats }
    })
  }

  /* --- Bandeja: o backlog inteiro, não só o mês aberto. ---

     Carrega no mount, e não só ao abrir o painel, porque o contador no botão é
     metade do valor da bandeja: ele é o que diz ao Julio que existe trabalho
     acumulado ali. Um contador que só aparece depois de clicar não avisa nada. */
  const [bandejaOpen, setBandejaOpen] = useState(false)
  const [bandeja, setBandeja] = useState<CalendarEventRow[]>([])
  const [bandejaLoading, setBandejaLoading] = useState(true)

  const refreshBandeja = useCallback(async () => {
    const result = await loadUnlinkedEvents()
    setBandejaLoading(false)
    if (result.status === 'ok') setBandeja(result.events)
  }, [])

  useEffect(() => {
    // A escrita de estado acontece só quando a promessa resolve; `alive` evita
    // atualizar um componente que já saiu da tela.
    let alive = true
    loadUnlinkedEvents().then((result) => {
      if (!alive) return
      setBandejaLoading(false)
      if (result.status === 'ok') setBandeja(result.events)
    })
    return () => {
      alive = false
    }
  }, [])

  /* --- Recarga da janela corrente (pós-escrita) --- */
  const reload = useCallback(async () => {
    const { from, to } = windowFor(location)
    const result = await loadCalendarEvents(from, to)
    if (result.status === 'ok') {
      setEvents(result.events)
      setLoaded({ from, to })
    }
  }, [location])

  /**
   * O funil de TODA escrita. Grade e bandeja são duas leituras de janelas
   * diferentes (a vista corrente × o backlog inteiro), então elas só continuam
   * concordando se forem sempre refeitas juntas.
   *
   * Existe como função única porque a alternativa — cada handler lembrar de
   * chamar as duas — já falhou uma vez: o "Sincronizar agora" só refazia a
   * grade, e o contador da bandeja ficava preso no número do mount até um
   * reload manual. Handler novo que esqueça daqui é o mesmo bug de volta.
   */
  const afterWrite = useCallback(async () => {
    await Promise.all([reload(), refreshBandeja()])
  }, [reload, refreshBandeja])

  /* --- Toast: some sozinho, mas nunca sem ter aparecido. --- */
  const say = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), 4000)
  }, [])

  /* --- Arrastar pra reagendar (só evento do CRM) --- */
  const drag = useMemo(
    () => ({
      onStart: (event: CalendarEventRow) => {
        dragging.current = event
      },
      onEnd: () => {
        dragging.current = null
        setDragOver(null)
      },
      onBlocked: () => {
        say('Esse evento foi criado no Google — o reagendamento acontece por lá.')
      },
      onDropDay: async (day: string) => {
        const event = dragging.current
        dragging.current = null
        if (!event?.event_id) return
        if (spDayKey(event.starts_at) === day) return

        const result = await rescheduleCalendarEvent({ eventId: event.event_id, day })
        if (result.status === 'ok') {
          say('Reagendado — mudou aqui e na agenda do Google.')
          await afterWrite()
          return
        }
        say(result.status === 'invalid' ? result.reason : result.message)
      },
    }),
    [afterWrite, say]
  )

  /* --- Sync --- */
  async function onSync() {
    setSyncing(true)
    setSyncMsg(null)
    const result = await syncNow()
    setSyncing(false)

    if (result.status === 'error') {
      setSyncMsg(`Não deu pra sincronizar: ${result.message}`)
      return
    }

    const { criados, atualizados, cancelados } = result.counts
    setStamp(result.syncedAt)
    setSyncMsg(
      `${criados} novos · ${atualizados} atualizados · ${cancelados} cancelados.`
    )

    // Uma rodada mexe no espelho inteiro: grade E bandeja precisam ser refeitas.
    await afterWrite()
  }

  // Rótulo da faixa de aviso. Órfã cai no próprio slug: a faixa precisa dizer
  // ALGUMA coisa, e o slug é o que o Julio reconhece.
  const activeTagLabel =
    tags.find((t) => t.slug === filters.tag)?.name ?? filters.tag

  const periodLabel =
    location.view === 'week' ? weekRangeLabel(location.anchor) : formatMonthLabel(location.anchor)

  const filtering = hasActiveFilters(filters)

  return (
    <div className="flex flex-col gap-fh-4">
      {/* ---------- Cabeçalho ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-fh-3">
        <div>
          <h1>Calendário</h1>
          <p className="fh-micro mt-fh-1 fh-cal-legend">
            Agenda do estúdio + CRM na mesma tela ·{' '}
            <Lock size={12} strokeWidth={1.8} aria-hidden="true" /> = criado no
            Google, edição por lá
          </p>
        </div>

        <div className="flex flex-col items-end gap-fh-1">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={16} strokeWidth={1.5} />}
            onClick={onSync}
            loading={syncing}
          >
            Sincronizar agora
          </Button>
          <span className="fh-micro">
            {stamp
              ? `Última sincronização: ${formatDateTimeShortBR(stamp)}`
              : `${sourceLabel ?? 'Agenda'} ainda não sincronizada`}
          </span>
        </div>
      </div>

      {syncMsg && <p className="fh-cal-syncmsg">{syncMsg}</p>}
      {loadError && (
        <p className="fh-cal-syncmsg" role="alert">
          Não deu pra carregar este período: {loadError}
        </p>
      )}

      {/* ---------- Barra de navegação ---------- */}
      <div className="fh-cal-toolbar">
        <Button variant="secondary" size="sm" onClick={goToday}>
          Hoje
        </Button>
        <button
          type="button"
          className="fh-cal-iconbtn"
          onClick={() => step(-1)}
          aria-label="Período anterior"
        >
          <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="fh-cal-iconbtn"
          onClick={() => step(1)}
          aria-label="Próximo período"
        >
          <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>

        <strong className="fh-cal-period" aria-live="polite">
          {periodLabel}
        </strong>

        <div className="fh-cal-views" role="group" aria-label="Vista do calendário">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => go({ view: v })}
              data-active={location.view === v || undefined}
              aria-pressed={location.view === v}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          icon={<Plus size={16} strokeWidth={1.6} />}
          onClick={() => setCreating(true)}
        >
          Novo evento
        </Button>
      </div>

      {/* ---------- Filtros ---------- */}
      <div className="fh-cal-filters">
        <button
          type="button"
          className="fh-cal-chip"
          data-on={filters.cats.length === 0 || undefined}
          onClick={() => toggleCategory('all')}
        >
          Todos
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className="fh-cal-chip"
            data-cat={cat}
            data-on={filters.cats.includes(cat) || undefined}
            onClick={() => toggleCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}

        <label className="fh-cal-flabel" htmlFor="fh-cal-artist">
          Artista
        </label>
        <select
          id="fh-cal-artist"
          className="fh-cal-select"
          value={filters.artist}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              artist: e.target.value as ArtistBucket | '',
            }))
          }
        >
          <option value="">Todos</option>
          {ARTIST_BUCKETS.map((a) => (
            <option key={a} value={a}>
              {ARTIST_BUCKET_LABELS[a]}
            </option>
          ))}
        </select>

        <label className="fh-cal-flabel" htmlFor="fh-cal-tag">
          Tag do cliente
        </label>
        <select
          id="fh-cal-tag"
          className="fh-cal-select"
          value={filters.tag}
          onChange={(e) => {
            setExpanded(new Set())
            setFilters((prev) => ({ ...prev, tag: e.target.value }))
          }}
        >
          <option value="">Todas</option>
          {tags.map((t) => (
            <option key={t.slug} value={t.slug}>
              {filterOptionLabel(t)}
            </option>
          ))}
          {/* Tag salva no localStorage que sumiu do catálogo desde então: fica
              selecionável pra que o filtro aceso tenha um rótulo, em vez de o
              select mostrar "Todas" enquanto a lista continua recortada. */}
          {filters.tag && !tags.some((t) => t.slug === filters.tag) && (
            <option value={filters.tag}>{filters.tag} (excluída)</option>
          )}
        </select>

        <button
          type="button"
          className="fh-cal-bandeja-btn"
          onClick={() => setBandejaOpen((v) => !v)}
          aria-expanded={bandejaOpen}
        >
          <Inbox size={15} strokeWidth={1.7} aria-hidden="true" />
          Bandeja
          <span className="fh-cal-count">{bandejaLoading ? '…' : bandeja.length}</span>
        </button>
      </div>

      {/* Faixa OBRIGATÓRIA enquanto o filtro de tag está ligado (item 23).
          A semântica é estrita: evento sem cliente vinculado SOME, e um
          calendário que esconde eventos sem dizer por quê é a forma mais rápida
          de o Julio deixar de confiar na tela. */}
      {filters.tag && (
        <p className="fh-cal-tagwarn" role="status">
          <span>
            Mostrando só clientes com a tag <strong>{activeTagLabel}</strong> —
            eventos sem cliente vinculado estão escondidos.
          </span>
          <button
            type="button"
            className="fh-cal-textbtn"
            onClick={() => setFilters((prev) => ({ ...prev, tag: '' }))}
          >
            Limpar filtro
          </button>
        </p>
      )}

      {bandejaOpen && (
        <BandejaPanel
          events={bandeja}
          loading={bandejaLoading}
          onLinked={async (message) => {
            say(message)
            await afterWrite()
          }}
        />
      )}

      {/* ---------- Calendário ---------- */}
      <div className="fh-cal-wrap" data-pending={pending || undefined}>
        {location.view === 'month' && (
          <MonthView
            anchor={location.anchor}
            today={today}
            byDay={byDay}
            expanded={expanded}
            onExpand={(day) => setExpanded((prev) => new Set(prev).add(day))}
            onOpen={setSelected}
            drag={drag}
            dragOver={dragOver}
            onDragOverDay={setDragOver}
          />
        )}

        {location.view === 'week' && (
          <WeekView
            anchor={location.anchor}
            today={today}
            byDay={byDay}
            mobileDay={mobileDay}
            onMobileDay={onMobileDay}
            onOpen={setSelected}
          />
        )}

        {location.view === 'agenda' &&
          (visibleCount === 0 ? (
            <EmptyState filtering={filtering} />
          ) : (
            <AgendaView
              anchor={location.anchor}
              today={today}
              byDay={byDay}
              onOpen={setSelected}
            />
          ))}
      </div>

      {/* `key` por evento: o drawer remonta ao trocar de cartão, e é isso que
          zera o formulário de edição sem um efeito de reset. */}
      <EventDrawer
        key={selected?.event_id ?? 'nenhum'}
        event={selected}
        tags={tags}
        onClose={() => setSelected(null)}
        onChanged={async (message) => {
          say(message)
          setSelected(null)
          await afterWrite()
        }}
      />

      <NewEventModal
        open={creating}
        onClose={() => setCreating(false)}
        defaultDay={location.anchor}
        onCreated={async (message) => {
          say(message)
          // Evento criado sem cliente entra na bandeja na hora — o contador
          // tem que subir junto.
          await afterWrite()
        }}
      />

      {/* Toast: `aria-live` porque metade das mensagens daqui é a explicação de
          algo que NÃO aconteceu (o drag bloqueado pelo cadeado). */}
      {toast && (
        <p className="fh-cal-toast" role="status" aria-live="polite">
          {toast}
        </p>
      )}
    </div>
  )
}

/**
 * Vazio com direção, não com humor: diz o que fazer. Só a agenda tem estado
 * vazio próprio — mês e semana já mostram o grid, que por si só comunica
 * "nada marcado" sem precisar de texto.
 */
function EmptyState({ filtering }: { filtering: boolean }) {
  return (
    <p className="fh-cal-empty">
      {filtering
        ? 'Nada por aqui com esses filtros. Limpa um filtro ou navega o período.'
        : 'Nenhum evento neste período. Navega o mês ou sincroniza com o Google.'}
    </p>
  )
}
