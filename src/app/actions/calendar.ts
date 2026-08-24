'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncCalendar } from '@/lib/google/sync'
import type { SyncCounts } from '@/lib/google/sync'
import { calendarId, createEvent, patchEvent } from '@/lib/google/calendar'
import { loadCalendarWindow } from '@/app/admin/(protected)/calendario/data'
import {
  CALENDARIO_PATH,
  EVENT_CATEGORIES,
  SERVICE_TYPES,
  buildEventDescription,
  type CalendarEventRow,
} from '@/app/admin/_ui/calendario'
import { TIMEZONE, addDayKey, spDayKey, spToInstant, spToday } from '@/app/admin/_ui/format'
import { CADASTROS_VIEW, normalizeSearch } from '@/app/admin/_ui/cadastros'

/** Chave de dia de São Paulo — o formato em que a janela viaja. */
const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida.' })

const windowSchema = z.object({ from: dayKey, to: dayKey })

/**
 * Server Actions do calendário. Leitura da agenda, sync manual e write-through
 * moram aqui; tudo passa pelo `requireOperator` e pelo client de service_role,
 * como toda ação do admin.
 */

export type SyncNowResult =
  | { status: 'ok'; counts: SyncCounts; syncedAt: string }
  | { status: 'error'; message: string }

/**
 * Botão "Sincronizar agora". Chama o núcleo direto — sem HTTP pra si mesmo,
 * sem passar pela rota do cron (que existe pro Vercel, não pra UI).
 */
export async function syncNow(): Promise<SyncNowResult> {
  await requireOperator()

  const result = await syncCalendar()
  if (result.status === 'error') return result

  // Uma rodada de sync mexe no espelho inteiro — eventos novos, cancelados e
  // vínculos resolvidos pelo matcher. Sem isto, a página segue servindo o
  // payload de antes da rodada: era por aqui que o contador da bandeja ficava
  // preso no número do mount até um reload manual.
  revalidatePath(CALENDARIO_PATH)

  return { status: 'ok', counts: result.counts, syncedAt: result.syncedAt }
}

/* ------------------------------------------------------------------
   Leitura da janela (navegação client-side)
   ------------------------------------------------------------------ */

export type LoadWindowResult =
  | { status: 'ok'; events: CalendarEventRow[] }
  | { status: 'error'; message: string }

/**
 * Recarrega a janela quando a navegação sai do intervalo já carregado. Navegar
 * DENTRO do que já veio (trocar de vista, andar uma semana no mesmo mês) não
 * chama nada — é o "sem refetch desnecessário" do item 9.
 */
export async function loadCalendarEvents(
  from: string,
  to: string
): Promise<LoadWindowResult> {
  await requireOperator()

  const parsed = windowSchema.safeParse({ from, to })
  if (!parsed.success) {
    return { status: 'error', message: 'Janela inválida.' }
  }

  return loadCalendarWindow(parsed.data.from, parsed.data.to)
}

/* ------------------------------------------------------------------
   Write-through: o Google primeiro, o espelho depois
   ------------------------------------------------------------------

   A regra que os três handlers abaixo compartilham: escreve NO GOOGLE, e só
   com sucesso de lá o espelho é tocado. Falhou no Google, nada persiste local
   — zero evento fantasma (contrato §1.3). É por isso que nenhum deles começa
   pelo `update` do banco, por mais tentador que seja pela ordem de leitura.
*/

/** Duração default de um evento criado pelo admin. */
const DEFAULT_DURATION_MIN = 60

/** Relógio de parede de São Paulo, como sai do `datetime-local`. */
const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, { message: 'Data e hora inválidas.' })

const createEventSchema = z.object({
  title: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length >= 1, { message: 'Dá um título pro evento.' })
    .refine((s) => s.length <= 300, { message: 'Título muito longo.' }),
  when: localDateTime,
  personId: z.string().uuid().nullable().optional(),
  /**
   * Tatuagem ou piercing. Os dois resolvem `category='sessao'` (o CHECK da
   * categoria só conhece `sessao`/`outros`), mas desde a migration de 19/08 o
   * tipo tem coluna própria — `calendar_events.service_type` — e é gravado
   * como escolha manual: veio de formulário, o parser não recomputa.
   */
  serviceType: z.enum(SERVICE_TYPES),
  artist: z
    .string()
    .transform((a) => a.trim().toLowerCase())
    .refine((a) => a.length > 0, { message: 'Informe quem vai executar.' })
    .refine((a) => a.length <= 60, { message: 'Nome do artista muito longo.' }),
  note: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length <= 2000, { message: 'Nota muito longa.' }),
})

export type CreateEventInput = z.input<typeof createEventSchema>

export type CalendarWriteResult =
  | { status: 'ok' }
  | { status: 'invalid'; reason: string }
  | { status: 'error'; message: string }

export async function createCalendarEvent(
  raw: CreateEventInput
): Promise<CalendarWriteResult> {
  await requireOperator()

  const parsed = createEventSchema.safeParse(raw)
  if (!parsed.success) {
    console.warn('[createCalendarEvent] payload inválido:', parsed.error.message)
    return {
      status: 'invalid',
      reason: parsed.error.issues[0]?.message ?? 'Dados inválidos.',
    }
  }
  const { title, when, personId, serviceType, artist, note } = parsed.data

  const start = spToInstant(when.slice(0, 10), when.slice(11, 16))
  if (Number.isNaN(start.getTime())) {
    return { status: 'invalid', reason: 'Data e hora inválidas.' }
  }
  const end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60_000)

  try {
    const admin = createAdminClient()

    /* A fonte precisa existir ANTES de escrever no Google: criar lá e
       descobrir aqui que não há onde espelhar deixaria um evento órfão. */
    const source = await activeSource(admin)
    if (source.status === 'error') return source

    let phone: string | null = null
    if (personId) {
      const { data: person, error } = await admin
        .from('people')
        .select('phone, deleted_at')
        .eq('id', personId)
        .maybeSingle()

      if (error) {
        console.error('[createCalendarEvent] leitura da pessoa:', error.message)
        return { status: 'error', message: error.message }
      }
      if (!person || person.deleted_at) {
        return { status: 'invalid', reason: 'Pessoa não encontrada.' }
      }
      phone = person.phone
    }

    const description = buildEventDescription(note, phone)

    /* 1. Google. */
    const created = await createEvent({
      summary: title,
      description: description || undefined,
      start: { dateTime: start.toISOString(), timeZone: TIMEZONE },
      end: { dateTime: end.toISOString(), timeZone: TIMEZONE },
    })

    /* 2. Espelho. */
    const { error: mirrorErr } = await admin.from('calendar_events').upsert(
      {
        source_id: source.id,
        external_id: created.id,
        title,
        description: description || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        all_day: false,
        status: 'confirmed',
        origin: 'crm',
        creator_email: created.creator?.email ?? null,
        category: 'sessao',
        artist,
        service_type: serviceType,
        // Veio de formulário: o Julio ESCOLHEU artista, categoria e tipo, então
        // o parser do sync não pode recomputá-los na próxima rodada.
        meta_source: {
          artist_manual: true,
          category_manual: true,
          service_type_manual: true,
        },
        person_id: personId ?? null,
        match_source: personId ? 'manual' : null,
      },
      { onConflict: 'source_id,external_id' }
    )

    if (mirrorErr) {
      // O evento JÁ está na agenda do Google — este erro não o desfaz. Dizer
      // isso é melhor que um "não deu" que mandaria o Julio criar de novo e
      // duplicar na agenda. A próxima rodada de sync espelha o evento sozinha.
      console.error('[createCalendarEvent] espelho falhou:', mirrorErr.message)
      return {
        status: 'error',
        message:
          'O evento entrou na agenda do Google, mas não apareceu aqui. Roda "Sincronizar agora".',
      }
    }

    revalidatePath(CALENDARIO_PATH)
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[createCalendarEvent] throw:', msg)
    return { status: 'error', message: 'Não deu pra criar na agenda do Google.' }
  }
}

/* ------------------------------------------------------------------
   Reagendar (drag no grid) e editar (drawer)
   ------------------------------------------------------------------ */

const rescheduleSchema = z.object({
  eventId: z.string().uuid(),
  /** Dia de destino, em chave de São Paulo. */
  day: dayKey,
})

export type RescheduleInput = z.infer<typeof rescheduleSchema>

/**
 * Arrastar o evento pra outro dia. Preserva o horário e a duração: o Julio
 * mudou o DIA, não a hora — recalcular o horário no drop seria decidir por ele.
 */
export async function rescheduleCalendarEvent(
  raw: RescheduleInput
): Promise<CalendarWriteResult> {
  await requireOperator()

  const parsed = rescheduleSchema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'invalid', reason: 'Reagendamento inválido.' }
  }
  const { eventId, day } = parsed.data

  try {
    const admin = createAdminClient()

    const { data: event, error } = await admin
      .from('calendar_events')
      .select('id, external_id, origin, starts_at, ends_at, all_day, status')
      .eq('id', eventId)
      .maybeSingle()

    if (error) {
      console.error('[rescheduleCalendarEvent] leitura:', error.message)
      return { status: 'error', message: error.message }
    }
    if (!event) return { status: 'error', message: 'Evento não encontrado.' }

    // O cadeado é do servidor também: o client bloqueia o drag por ergonomia,
    // mas a Server Action é um endpoint como qualquer outro.
    if (event.origin !== 'crm') {
      return {
        status: 'invalid',
        reason: 'Esse evento foi criado no Google — o reagendamento acontece por lá.',
      }
    }
    if (event.status !== 'confirmed') {
      return { status: 'invalid', reason: 'Evento cancelado não se reagenda.' }
    }

    const oldStart = new Date(event.starts_at)
    const oldDay = spDayKey(oldStart)
    if (oldDay === day) return { status: 'ok' }

    const shiftMs = spToInstant(day).getTime() - spToInstant(oldDay).getTime()
    const start = new Date(oldStart.getTime() + shiftMs)
    const end = event.ends_at ? new Date(new Date(event.ends_at).getTime() + shiftMs) : null

    /* 1. Google. */
    await patchEvent(event.external_id, {
      start: googleTime(start, event.all_day),
      end: end ? googleTime(end, event.all_day) : undefined,
    })

    /* 2. Espelho. */
    const { error: mirrorErr } = await admin
      .from('calendar_events')
      .update({
        starts_at: start.toISOString(),
        ...(end ? { ends_at: end.toISOString() } : {}),
      })
      .eq('id', eventId)

    if (mirrorErr) {
      console.error('[rescheduleCalendarEvent] espelho falhou:', mirrorErr.message)
      return {
        status: 'error',
        message: 'Mudou no Google, mas não aqui. Roda "Sincronizar agora".',
      }
    }

    revalidatePath(CALENDARIO_PATH)
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[rescheduleCalendarEvent] throw:', msg)
    return { status: 'error', message: 'Não deu pra reagendar na agenda do Google.' }
  }
}

const editSchema = z.object({
  eventId: z.string().uuid(),
  title: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length >= 1, { message: 'Dá um título pro evento.' })
    .refine((s) => s.length <= 300, { message: 'Título muito longo.' }),
  when: localDateTime,
})

export type EditEventInput = z.infer<typeof editSchema>

/** Edição de título e horário pelo drawer. Mesmas regras do reagendamento. */
export async function updateCalendarEvent(
  raw: EditEventInput
): Promise<CalendarWriteResult> {
  await requireOperator()

  const parsed = editSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      status: 'invalid',
      reason: parsed.error.issues[0]?.message ?? 'Dados inválidos.',
    }
  }
  const { eventId, title, when } = parsed.data

  const start = spToInstant(when.slice(0, 10), when.slice(11, 16))
  if (Number.isNaN(start.getTime())) {
    return { status: 'invalid', reason: 'Data e hora inválidas.' }
  }

  try {
    const admin = createAdminClient()

    const { data: event, error } = await admin
      .from('calendar_events')
      .select('id, external_id, origin, starts_at, ends_at, status')
      .eq('id', eventId)
      .maybeSingle()

    if (error) {
      console.error('[updateCalendarEvent] leitura:', error.message)
      return { status: 'error', message: error.message }
    }
    if (!event) return { status: 'error', message: 'Evento não encontrado.' }
    if (event.origin !== 'crm') {
      return {
        status: 'invalid',
        reason: 'Esse evento foi criado no Google — a edição acontece por lá.',
      }
    }
    if (event.status !== 'confirmed') {
      return { status: 'invalid', reason: 'Evento cancelado não se edita.' }
    }

    // Preserva a duração que o evento já tinha, em vez de reimpor a default.
    const previousMs = event.ends_at
      ? new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()
      : DEFAULT_DURATION_MIN * 60_000
    const end = new Date(start.getTime() + Math.max(previousMs, 0))

    await patchEvent(event.external_id, {
      summary: title,
      start: { dateTime: start.toISOString(), timeZone: TIMEZONE },
      end: { dateTime: end.toISOString(), timeZone: TIMEZONE },
    })

    const { error: mirrorErr } = await admin
      .from('calendar_events')
      .update({
        title,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      })
      .eq('id', eventId)

    if (mirrorErr) {
      console.error('[updateCalendarEvent] espelho falhou:', mirrorErr.message)
      return {
        status: 'error',
        message: 'Mudou no Google, mas não aqui. Roda "Sincronizar agora".',
      }
    }

    revalidatePath(CALENDARIO_PATH)
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[updateCalendarEvent] throw:', msg)
    return { status: 'error', message: 'Não deu pra editar na agenda do Google.' }
  }
}

/* ------------------------------------------------------------------
   Bandeja de vínculo e metadados CRM (Bloco 4)
   ------------------------------------------------------------------

   Nada aqui escreve no Google, e é decisão de contrato, não economia:
   §13a (vincular não reescreve a descrição) e §13b (o cadeado protege os
   campos DO GOOGLE; pessoa, artista e categoria são metadados do CRM e
   são editáveis em QUALQUER evento, com ou sem cadeado).
*/

/** Janela da bandeja: a mesma que o sync varre (contrato §8.1). */
const BACKLOG_BACK_DAYS = 90
const BACKLOG_FORWARD_DAYS = 400

/**
 * O backlog inteiro de eventos sem dono — não só o do mês aberto. A bandeja
 * existe justamente pra esvaziar o passado: limitá-la à janela da vista
 * esconderia a maior parte do trabalho e o contador mentiria.
 *
 * Lê pela MESMA RPC de todo o resto (contrato §1.1), com a janela larga.
 */
export async function loadUnlinkedEvents(): Promise<LoadWindowResult> {
  await requireOperator()

  const today = spToday()
  const result = await loadCalendarWindow(
    addDayKey(today, -BACKLOG_BACK_DAYS),
    addDayKey(today, BACKLOG_FORWARD_DAYS)
  )
  if (result.status === 'error') return result

  return {
    status: 'ok',
    events: result.events.filter((e) => e.kind === 'event' && !e.person_id),
  }
}

const linkSchema = z.object({
  eventId: z.string().uuid(),
  /** `null` desvincula. */
  personId: z.string().uuid().nullable(),
})

export type LinkEventInput = z.infer<typeof linkSchema>

/**
 * Vincular/desvincular pessoa. Grava `match_source='manual'`, que é o que
 * protege o vínculo do matcher na próxima rodada: manual > automático, sempre
 * (contrato §6). Desvincular limpa os DOIS campos — deixar `match_source` pra
 * trás descreveria um vínculo que não existe mais.
 */
export async function linkEventPerson(
  raw: LinkEventInput
): Promise<CalendarWriteResult> {
  await requireOperator()

  const parsed = linkSchema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'invalid', reason: 'Vínculo inválido.' }
  }
  const { eventId, personId } = parsed.data

  try {
    const admin = createAdminClient()

    if (personId) {
      const { data: person, error } = await admin
        .from('people')
        .select('id, deleted_at')
        .eq('id', personId)
        .maybeSingle()

      if (error) {
        console.error('[linkEventPerson] leitura da pessoa:', error.message)
        return { status: 'error', message: error.message }
      }
      if (!person || person.deleted_at) {
        return { status: 'invalid', reason: 'Pessoa não encontrada.' }
      }
    }

    const { error } = await admin
      .from('calendar_events')
      .update({
        person_id: personId,
        match_source: personId ? 'manual' : null,
      })
      .eq('id', eventId)

    if (error) {
      console.error('[linkEventPerson] escrita:', error.message)
      return { status: 'error', message: error.message }
    }

    revalidatePath(CALENDARIO_PATH)
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[linkEventPerson] throw:', msg)
    return { status: 'error', message: msg }
  }
}

const metaSchema = z.object({
  eventId: z.string().uuid(),
  /** `null` limpa o artista; ausente não mexe. */
  artist: z
    .string()
    .transform((a) => a.trim().toLowerCase())
    .refine((a) => a.length <= 60, { message: 'Nome do artista muito longo.' })
    .nullable()
    .optional(),
  /** Espelha o CHECK do banco: só `sessao` e `outros` moram na tabela. */
  category: z.enum(EVENT_CATEGORIES).optional(),
  /**
   * `null` limpa o tipo (o "—" do drawer); ausente não mexe. Nullable de
   * verdade: evento que não é sessão não tem tipo, e forçar um seria inventar
   * dado que ninguém informou.
   */
  serviceType: z.enum(SERVICE_TYPES).nullable().optional(),
})

export type UpdateEventMetaInput = z.input<typeof metaSchema>

/**
 * Correção de artista/categoria em QUALQUER evento (contrato §13b) — é o
 * caminho do guest: "Tattoo Nicole" nasce como sessão do Julio pelo parser, e
 * um toque aqui conserta.
 *
 * Cada campo corrigido liga a flag `*_manual` correspondente, e é ela que faz
 * o sync PARAR de recomputar aquele campo (contrato §6). Sem a flag, a próxima
 * rodada desfaria a correção e o Julio corrigiria de novo, pra sempre.
 */
export async function updateEventMeta(
  raw: UpdateEventMetaInput
): Promise<CalendarWriteResult> {
  await requireOperator()

  const parsed = metaSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      status: 'invalid',
      reason: parsed.error.issues[0]?.message ?? 'Dados inválidos.',
    }
  }
  const { eventId, artist, category, serviceType } = parsed.data

  if (artist === undefined && category === undefined && serviceType === undefined) {
    return { status: 'ok' }
  }

  try {
    const admin = createAdminClient()

    const { data: event, error: readErr } = await admin
      .from('calendar_events')
      .select('id, meta_source')
      .eq('id', eventId)
      .maybeSingle()

    if (readErr) {
      console.error('[updateEventMeta] leitura:', readErr.message)
      return { status: 'error', message: readErr.message }
    }
    if (!event) return { status: 'error', message: 'Evento não encontrado.' }

    // Merge: as flags existentes ficam. Escrever `{artist_manual:true}` seco
    // apagaria uma `category_manual` ligada numa correção anterior.
    const flags = { ...((event.meta_source as Record<string, unknown> | null) ?? {}) }
    const patch: Record<string, unknown> = {}

    if (artist !== undefined) {
      patch.artist = artist === '' ? null : artist
      flags.artist_manual = true
    }
    if (category !== undefined) {
      patch.category = category
      flags.category_manual = true
    }
    if (serviceType !== undefined) {
      patch.service_type = serviceType
      flags.service_type_manual = true
    }
    patch.meta_source = flags

    const { error } = await admin.from('calendar_events').update(patch).eq('id', eventId)

    if (error) {
      console.error('[updateEventMeta] escrita:', error.message)
      return { status: 'error', message: error.message }
    }

    revalidatePath(CALENDARIO_PATH)
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[updateEventMeta] throw:', msg)
    return { status: 'error', message: msg }
  }
}

/* ------------------------------------------------------------------
   Busca de pessoa (form de evento e bandeja)
   ------------------------------------------------------------------ */

export type PersonOption = { id: string; name: string | null; phone: string | null }

/**
 * Busca por nome ou telefone, server-side, teto baixo. Mesmo espírito da busca
 * dos cadastros: quem normaliza a query é o JS, e o que volta é o mínimo que a
 * linha precisa mostrar.
 */
export async function searchPeople(term: string): Promise<PersonOption[]> {
  await requireOperator()

  const raw = z.string().max(120).safeParse(term ?? '')
  if (!raw.success) return []

  const { text, digits } = normalizeSearch(raw.data)
  if (!text && !digits) return []

  const admin = createAdminClient()
  const parts: string[] = []
  if (text) parts.push(`name_norm.ilike."*${text}*"`)
  if (digits) parts.push(`phone_digits.ilike."*${digits}*"`)

  const { data, error } = await admin
    .from(CADASTROS_VIEW)
    .select('person_id, name, phone')
    .or(parts.join(','))
    .order('name_norm', { ascending: true })
    .limit(12)

  if (error) {
    console.error('[searchPeople] falhou:', error.message)
    return []
  }

  return ((data ?? []) as Array<{ person_id: string; name: string | null; phone: string | null }>).map(
    (r) => ({ id: r.person_id, name: r.name, phone: r.phone })
  )
}

/* ------------------------------------------------------------------
   Comuns
   ------------------------------------------------------------------ */

type AdminClient = ReturnType<typeof createAdminClient>

/** `GoogleDateTime` do jeito que a API espera, por tipo de evento. */
function googleTime(instant: Date, allDay: boolean) {
  if (allDay) return { date: spDayKey(instant) }
  return { dateTime: instant.toISOString(), timeZone: TIMEZONE }
}

async function activeSource(
  admin: AdminClient
): Promise<{ status: 'ok'; id: string } | { status: 'error'; message: string }> {
  const { data, error } = await admin
    .from('calendar_sources')
    .select('id, is_active')
    .eq('provider', 'google')
    .eq('external_id', calendarId())
    .maybeSingle()

  if (error) {
    console.error('[calendar] fonte falhou:', error.message)
    return { status: 'error', message: error.message }
  }
  if (!data || !data.is_active) {
    return { status: 'error', message: 'A agenda não está configurada como fonte ativa.' }
  }
  return { status: 'ok', id: data.id }
}
