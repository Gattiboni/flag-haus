/**
 * Contrato da tela de Calendário (Fase 4) — fonte única de tipos e vocabulário.
 *
 * Espelha o retorno da RPC `calendar_events_between` (contrato §7) e as regras
 * de cor, categoria e artista do contrato §9-§10. Nada aqui cria SQL: se a RPC
 * divergir destes nomes, o certo é PARAR e reportar, não adaptar o front.
 *
 * Módulo plano (sem 'use server'/'use client') pela mesma razão de
 * `cadastros.ts`: uma Server Action só exporta funções async, então constante
 * compartilhada entre server e client precisa morar fora.
 */

import { TIMEZONE, addDayKey, spDayKey, spToInstant } from './format'

export const CALENDARIO_PATH = '/admin/calendario'

/* ------------------------------------------------------------------
   Rótulos de período
   ------------------------------------------------------------------ */

const MONTH_LABEL = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: TIMEZONE,
})

const DAY_LABEL = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  timeZone: TIMEZONE,
})

const DAY_SHORT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: TIMEZONE,
})

/**
 * Meio-dia de propósito ao rotular uma chave de dia: qualquer hora entre 01:00
 * e 23:00 daria o mesmo rótulo, e o meio-dia é o que sobrevive a qualquer
 * ajuste de offset sem virar de dia.
 */
function atNoon(dayKey: string): Date {
  return spToInstant(dayKey, '12:00')
}

/** "AGOSTO DE 2026" — o rótulo do período nas vistas de mês e agenda. */
export function formatMonthLabel(dayKey: string): string {
  return MONTH_LABEL.format(atNoon(dayKey)).toUpperCase()
}

/** "seg., 19/08" — cabeçalho de coluna da semana e de grupo da agenda. */
export function formatDayLabel(dayKey: string): string {
  return DAY_LABEL.format(atNoon(dayKey))
}

/** "19/08" — rótulo curto (intervalo da semana, linha da bandeja). */
export function formatDayShort(dayKey: string): string {
  return DAY_SHORT.format(atNoon(dayKey))
}

/* ------------------------------------------------------------------
   Categoria
   ------------------------------------------------------------------ */

/**
 * `sessao`/`outros` vêm da coluna do espelho; `aniversario` só existe no
 * retorno da RPC (contrato §13h) — nunca é linha de `calendar_events`.
 */
export const CATEGORIES = ['sessao', 'aniversario', 'outros'] as const
export type CalendarCategory = (typeof CATEGORIES)[number]

/** Categorias que uma linha do espelho pode ter (o CHECK do banco). */
export const EVENT_CATEGORIES = ['sessao', 'outros'] as const
export type EventCategory = (typeof EVENT_CATEGORIES)[number]

export function isEventCategory(v: unknown): v is EventCategory {
  return typeof v === 'string' && (EVENT_CATEGORIES as readonly string[]).includes(v)
}

export const CATEGORY_LABELS: Record<CalendarCategory, string> = {
  sessao: 'Sessões',
  aniversario: 'Aniversários',
  outros: 'Outros',
}

/**
 * A constante ÚNICA de cor por categoria (contrato §10). Chip, card e drawer
 * leem daqui — dois lugares com o mesmo hex é como um sistema visual começa a
 * divergir. Os hexes são fixados pelo contrato de dados; a regra "sem hex
 * hardcoded" do Design System vale pra estilo, e estes são vocabulário de dado.
 *
 * O CSS da tela expõe os mesmos valores em `--cal-*` (calendario.css) porque
 * pintar borda e fundo de célula por style inline seria pior; os dois lugares
 * citam o contrato §10 justamente pra mudarem juntos.
 */
export const CATEGORY_COLORS: Record<CalendarCategory, { ink: string; tint: string }> = {
  sessao: { ink: '#8B0000', tint: '#F6E9E9' },
  aniversario: { ink: '#8A6D00', tint: '#F5EFDA' },
  outros: { ink: '#5A5A5A', tint: '#EDECEA' },
}

/* ------------------------------------------------------------------
   Tipo de serviço
   ------------------------------------------------------------------ */

/**
 * Espelha o CHECK de `calendar_events.service_type` (migration de 19/08), que
 * por sua vez é o mesmo vocabulário de `jobs.service_type`. Nullable: evento
 * que não é sessão não tem tipo, e "outros" não vira tatuagem por omissão.
 */
export const SERVICE_TYPES = ['tattoo', 'piercing'] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]

export function isServiceType(v: unknown): v is ServiceType {
  return typeof v === 'string' && (SERVICE_TYPES as readonly string[]).includes(v)
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  tattoo: 'Tatuagem',
  piercing: 'Piercing',
}

/** Rótulo de exibição. `null` quando não há tipo — o chamador decide o que fazer. */
export function serviceTypeLabel(value: string | null | undefined): string | null {
  return isServiceType(value) ? SERVICE_TYPE_LABELS[value] : null
}

/* ------------------------------------------------------------------
   Artista
   ------------------------------------------------------------------ */

/** Vocabulário canônico, lowercase, o mesmo de `jobs.artist`. */
export const KNOWN_ARTISTS = ['julio', 'lethicia'] as const
export type KnownArtist = (typeof KNOWN_ARTISTS)[number]

/** Os baldes do filtro: os dois artistas da casa + "qualquer outro". */
export const ARTIST_BUCKETS = ['julio', 'lethicia', 'outros'] as const
export type ArtistBucket = (typeof ARTIST_BUCKETS)[number]

export const ARTIST_BUCKET_LABELS: Record<ArtistBucket, string> = {
  julio: 'Julio',
  lethicia: 'Lethicia',
  outros: 'Outros',
}

/**
 * Artista gravado → balde do filtro. Guest entra por texto livre no form
 * ("nicole"), e o contrato §13c proíbe adivinhar guest por título: qualquer
 * artista que não seja Julio nem Lethicia cai em "Outros". `null` (evento sem
 * artista identificado) não é balde nenhum — é o caso da regra de preservação.
 */
export function artistBucket(artist: string | null | undefined): ArtistBucket | null {
  if (!artist) return null
  const a = artist.trim().toLowerCase()
  if (!a) return null
  return (KNOWN_ARTISTS as readonly string[]).includes(a) ? (a as KnownArtist) : 'outros'
}

/** Rótulo de exibição de um artista gravado. `null` quando não há artista. */
export function artistLabel(artist: string | null | undefined): string | null {
  const bucket = artistBucket(artist)
  if (!bucket) return null
  if (bucket === 'outros') {
    // Guest tem nome próprio: mostra o que foi digitado, com inicial maiúscula.
    const a = (artist as string).trim()
    return a.charAt(0).toUpperCase() + a.slice(1)
  }
  return ARTIST_BUCKET_LABELS[bucket]
}

/**
 * Keywords de sessão no título (contrato §9.2). Constante ÚNICA: o parser do
 * sync é o único consumidor hoje, mas duplicar esta lista é exatamente como o
 * parser e a UI começam a discordar sobre o que é uma sessão.
 *
 * A comparação roda sobre o título normalizado (minúsculo, sem acento), então
 * as entradas aqui são escritas sem acento de propósito.
 */
export const SESSION_KEYWORDS = [
  'tattoo',
  'tatuagem',
  'tatu',
  'sessao',
  'perfuracao',
  'piercing',
  'retoque',
] as const

/** Fragmento de e-mail de criador que identifica a Lethicia (contrato §9.2). */
export const LETHICIA_EMAIL_FRAGMENT = 'le.bodypiercer'

/**
 * A convenção da casa, montada num lugar só: nota + telefone do cliente, uma
 * por linha. É ela que o matcher do sync lê na rodada seguinte — o Julio usa o
 * padrão sem precisar saber que existe um padrão.
 *
 * Mora neste módulo plano, e não na Server Action, porque o preview do modal
 * ("como vai ficar no Google") tem que mostrar EXATAMENTE a string que o
 * servidor vai gravar. Duas implementações parecidas é como o preview começa a
 * mentir — e um preview que mente é pior que nenhum.
 */
export function buildEventDescription(note: string, phone: string | null): string {
  return [note.trim(), phone].filter(Boolean).join('\n')
}

/** minúsculo, sem acento — a forma em que keyword e título se comparam. */
export function normalizeText(input: string | null | undefined): string {
  return (input ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/* ------------------------------------------------------------------
   Linha da RPC
   ------------------------------------------------------------------ */

/** Uma linha de `calendar_events_between` — contrato §7. */
export type CalendarEventRow = {
  event_id: string | null
  kind: 'event' | 'birthday'
  title: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
  category: CalendarCategory
  origin: 'google' | 'crm' | 'birthday'
  /** O front OBEDECE, não deduz (contrato §7). */
  editable: boolean
  artist: string | null
  /** `tattoo` | `piercing` | null. NULL em aniversário e em "outros". */
  service_type: string | null
  person_id: string | null
  person_name: string | null
  person_phone: string | null
  person_tags: string[] | null
  meta: {
    description?: string | null
    creator_email?: string | null
    match_source?: 'phone' | 'manual' | null
    flags?: { artist_manual?: boolean; category_manual?: boolean }
  } | null
}

/** Cadeado: evento do Google, que só se edita por lá. */
export function isLocked(e: CalendarEventRow): boolean {
  return e.kind === 'event' && !e.editable
}

/** O dia do grid a que o evento pertence, em São Paulo. */
export function eventDayKey(e: CalendarEventRow): string {
  return spDayKey(e.starts_at)
}

/* ------------------------------------------------------------------
   Estado da vista (URL: `?v=` e `?d=`)
   ------------------------------------------------------------------ */

export const VIEWS = ['month', 'week', 'agenda'] as const
export type CalendarView = (typeof VIEWS)[number]

export const DEFAULT_VIEW: CalendarView = 'month'

export const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Mês',
  week: 'Semana',
  agenda: 'Agenda',
}

export type CalendarLocation = { view: CalendarView; anchor: string }

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

type RawSearchParams = Record<string, string | string[] | undefined>

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

/**
 * URL → vista+data. Tolerante como o parser dos cadastros: valor desconhecido
 * cai no default, nunca derruba a página. `today` entra por parâmetro pra a
 * função continuar pura — server e client resolvem "hoje" no mesmo lugar.
 */
export function parseCalendarLocation(
  sp: RawSearchParams,
  today: string
): CalendarLocation {
  const rawView = first(sp.v)
  const view: CalendarView = (VIEWS as readonly string[]).includes(rawView)
    ? (rawView as CalendarView)
    : DEFAULT_VIEW

  const rawAnchor = first(sp.d)
  const anchor = DAY_KEY_RE.test(rawAnchor) ? rawAnchor : today

  return { view, anchor }
}

/** Estado → URL. Só escreve o que difere do default (link curto e legível). */
export function calendarHref(loc: CalendarLocation, today: string): string {
  const sp = new URLSearchParams()
  if (loc.view !== DEFAULT_VIEW) sp.set('v', loc.view)
  if (loc.anchor !== today) sp.set('d', loc.anchor)
  const qs = sp.toString()
  return qs ? `${CALENDARIO_PATH}?${qs}` : CALENDARIO_PATH
}

/* ------------------------------------------------------------------
   Janela de leitura
   ------------------------------------------------------------------ */

/** Segunda-feira da semana do dia (o grid começa na segunda). */
export function weekStart(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const dow = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
  return addDayKey(dayKey, -dow)
}

/** Primeiro dia do mês do âncora. */
export function monthStart(dayKey: string): string {
  return `${dayKey.slice(0, 8)}01`
}

/**
 * Começo do grid do mês: a segunda-feira que abre a primeira linha. A vista de
 * mês mostra dias do mês anterior e do seguinte nas bordas, e eles precisam de
 * evento — daí a janela buscada ser a do GRID, não a do mês.
 */
export function monthGridStart(dayKey: string): string {
  return weekStart(monthStart(dayKey))
}

/**
 * Janela [from, to) que a vista corrente precisa, em chaves de dia de SP.
 * Sempre com folga de uma semana pra cada lado: a RPC é barata e refetch em
 * borda é o que faz calendário piscar.
 *
 * Agenda usa a mesma janela do mês — é a lista do mês corrente.
 */
export function windowFor(loc: CalendarLocation): { from: string; to: string } {
  if (loc.view === 'week') {
    const start = weekStart(loc.anchor)
    return { from: addDayKey(start, -7), to: addDayKey(start, 14) }
  }
  const start = monthGridStart(loc.anchor)
  return { from: addDayKey(start, -7), to: addDayKey(start, 49) }
}

/* ------------------------------------------------------------------
   Filtros (localStorage) e o predicado único
   ------------------------------------------------------------------ */

export const FILTERS_STORAGE_KEY = 'fh_cal_filters'

export type CalendarFilters = {
  /** Categorias ligadas. Vazio = todas (o chip "Todos" aceso). */
  cats: CalendarCategory[]
  /** Balde de artista; '' = todos. */
  artist: ArtistBucket | ''
  /** UM slug de tag; '' = todas. */
  tag: string
}

export const DEFAULT_FILTERS: CalendarFilters = { cats: [], artist: '', tag: '' }

export function hasActiveFilters(f: CalendarFilters): boolean {
  return f.cats.length > 0 || f.artist !== '' || f.tag !== ''
}

/**
 * localStorage → filtros, tolerante a chave nova e a lixo (item 19 pede
 * "decodificação tolerante"): campo desconhecido é ignorado, campo ausente cai
 * no default. Preferência salva por uma versão anterior da tela nunca pode
 * impedir a tela de abrir.
 */
export function decodeFilters(raw: string | null): CalendarFilters {
  if (!raw) return DEFAULT_FILTERS
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_FILTERS
    const o = parsed as Record<string, unknown>

    const cats = Array.isArray(o.cats)
      ? o.cats.filter((c): c is CalendarCategory =>
          (CATEGORIES as readonly string[]).includes(c as string)
        )
      : []

    const rawArtist = typeof o.artist === 'string' ? o.artist : ''
    const artist = (ARTIST_BUCKETS as readonly string[]).includes(rawArtist)
      ? (rawArtist as ArtistBucket)
      : ''

    // O slug NÃO é validado contra o catálogo aqui: a tag pode ter sido
    // excluída desde o último uso, e quem trata órfã é o render (badge cinza),
    // não o decoder. Aqui só a forma importa.
    const tag = typeof o.tag === 'string' ? o.tag.slice(0, 80) : ''

    return { cats: [...new Set(cats)], artist, tag }
  } catch {
    return DEFAULT_FILTERS
  }
}

export function encodeFilters(f: CalendarFilters): string {
  return JSON.stringify({ cats: f.cats, artist: f.artist, tag: f.tag })
}

/**
 * O predicado ÚNICO de visibilidade — AND puro entre categoria, artista e tag.
 * Toda vista e o corte de "+N mais" passam por aqui; é o que garante que o
 * contador do overflow nunca minta (item 10).
 */
export function matchesFilters(e: CalendarEventRow, f: CalendarFilters): boolean {
  if (f.cats.length > 0 && !f.cats.includes(e.category)) return false

  if (f.artist) {
    const bucket = artistBucket(e.artist)
    // Regra de preservação (item 16): evento SEM artista identificado não some
    // — aniversário e "outros" passam por qualquer filtro de artista. A exceção
    // é a sessão sem artista: ela é do escopo do filtro e some, como no mock.
    if (bucket && bucket !== f.artist) return false
    if (!bucket && e.category === 'sessao') return false
  }

  if (f.tag) {
    // ESTRITO (contrato §13 / item 23): sem contato vinculado, some. É por isso
    // que a faixa de aviso é obrigatória enquanto este filtro está ligado.
    if (!e.person_id) return false
    if (!e.person_tags?.includes(f.tag)) return false
  }

  return true
}

/** Ordem dentro do dia: dia inteiro primeiro, depois por horário. */
export function compareInDay(a: CalendarEventRow, b: CalendarEventRow): number {
  if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
  return a.starts_at < b.starts_at ? -1 : a.starts_at > b.starts_at ? 1 : 0
}

/* ------------------------------------------------------------------
   Multi-dia: uma ocorrência por dia (contrato §13f)
   ------------------------------------------------------------------ */

/**
 * Teto de dias que um evento ocupa no grid. "Férias" tem 6 dias; um evento de
 * 400 dias por engano no Google não pode virar 400 cartões em memória.
 */
const MAX_SPAN_DAYS = 60

/**
 * Os dias de São Paulo que o evento ocupa. Multi-dia rende uma ocorrência por
 * dia em vez de uma barra contínua (contrato §13f): barra atravessando semanas
 * é cara de acertar e não muda nada na operação do estúdio.
 *
 * O último dia sai de `ends_at - 1ms`, e essa subtração resolve os dois casos
 * de borda de uma vez: o dia inteiro do Google tem fim EXCLUSIVO (07→08 é só o
 * dia 7), e o evento com hora que termina exatamente à meia-noite pertence ao
 * dia que acabou, não ao que começou.
 */
export function eventDayKeys(e: CalendarEventRow): string[] {
  const start = spDayKey(e.starts_at)
  if (!start) return []
  if (!e.ends_at) return [start]

  const endMs = new Date(e.ends_at).getTime()
  if (Number.isNaN(endMs)) return [start]

  const end = spDayKey(new Date(endMs - 1))
  if (!end || end <= start) return [start]

  const days: string[] = []
  let cursor = start
  while (cursor <= end && days.length < MAX_SPAN_DAYS) {
    days.push(cursor)
    cursor = addDayKey(cursor, 1)
  }
  return days
}

/**
 * Eventos visíveis → mapa dia → eventos, já ordenado. Todas as vistas e o corte
 * de "+N mais" leem daqui, então o contador do overflow conta exatamente o que
 * a célula esconde.
 */
export function groupByDay(
  events: CalendarEventRow[],
  filters: CalendarFilters
): Map<string, CalendarEventRow[]> {
  const byDay = new Map<string, CalendarEventRow[]>()

  for (const e of events) {
    if (!matchesFilters(e, filters)) continue
    for (const day of eventDayKeys(e)) {
      const list = byDay.get(day)
      if (list) list.push(e)
      else byDay.set(day, [e])
    }
  }

  for (const list of byDay.values()) list.sort(compareInDay)
  return byDay
}
