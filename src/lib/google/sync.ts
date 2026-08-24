import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { toE164 } from '@/lib/utils/phone'
import { spToInstant } from '@/app/admin/_ui/format'
import {
  LETHICIA_EMAIL_FRAGMENT,
  SESSION_KEYWORDS,
  normalizeText,
  type EventCategory,
  type ServiceType,
} from '@/app/admin/_ui/calendario'
import {
  calendarId,
  listEvents,
  SyncTokenGoneError,
  type GoogleDateTime,
} from './calendar'

/**
 * Núcleo do sync do espelho (contrato §8-§9). Função pura de efeito no sentido
 * que importa: chamável do cron (route handler) e do botão (Server Action) sem
 * que nenhum dos dois saiba do outro — a UI nunca faz HTTP pra si mesma.
 *
 * As três regras que este arquivo existe pra não quebrar:
 *
 * 1. **Google vence** nos campos dele (título, descrição, horários, status,
 *    criador). Sem merge, sem conflito, sem cerimônia.
 * 2. **O CRM vence no que é dele.** `origin` é imutável; `person_id` e
 *    `match_source` só o matcher preenche, e só quando estão nulos; `artist`,
 *    `category` e `service_type` só são recomputados quando a flag `*_manual`
 *    correspondente é falsa. Rodar o sync não pode desfazer o trabalho do
 *    Julio na bandeja e no drawer.
 * 3. **Rodar duas vezes não duplica nada** — o upsert é por
 *    `(source_id, external_id)`, que é a UNIQUE do banco.
 *
 * `dryRun` lê tudo, computa tudo e não escreve nada: é como a implementação se
 * valida contra a agenda real sem tocar em produção.
 */

/** Janela cheia da primeira rodada e do token invalidado (contrato §8.1). */
const FULL_WINDOW_BACK_DAYS = 90
const FULL_WINDOW_FORWARD_DAYS = 400

/** Teto de itens por chamada `in(...)` ao PostgREST — URL tem limite prático. */
const CHUNK = 150

const LOG = '[calendar/sync]'

export type SyncCounts = {
  /** Eventos lidos do Google nesta rodada. */
  lidos: number
  criados: number
  atualizados: number
  cancelados: number
  /** Dos eventos tocados, quantos seguem sem pessoa vinculada. */
  sem_vinculo: number
}

export type SyncResult =
  | {
      status: 'ok'
      counts: SyncCounts
      /** Carimbo da rodada (ISO). Em dry-run, o instante do cálculo. */
      syncedAt: string
      mode: 'incremental' | 'full'
      dryRun: boolean
      /** Distribuição do parser — leitura do dry-run, ignorada pela UI. */
      parser: Record<string, number>
      /** Distribuição de tipo de serviço — idem. */
      serviceTypes: Record<string, number>
      /** Quantos casariam pessoa por telefone nesta rodada. */
      matched: number
    }
  | { status: 'error'; message: string }

/* ------------------------------------------------------------------
   Parser de artista e categoria (contrato §9.2)
   ------------------------------------------------------------------ */

export type Parsed = {
  artist: string | null
  category: EventCategory
  serviceType: ServiceType | null
}

/**
 * Determinístico e sem adivinhação de guest (contrato §13c): "Tattoo Nicole"
 * resolve como sessão do Julio, e a correção pra guest é 1 toque no drawer.
 * Tentar ler nome de artista no título confunde guest com nome de cliente
 * ("Tattoo - Marcela e Ana") e erra pro lado que dói.
 *
 * `serviceType` sai do ARTISTA, não de keyword no título, e é o que a divisão
 * de trabalho do estúdio já diz: a Lethicia faz piercing, o Julio tatua. Ler
 * "piercing" no título seria uma segunda fonte de verdade discordando da
 * primeira em "Piercing - retoque da tattoo".
 *
 * Fora de sessão não há tipo: `null`, nunca `tattoo` por omissão — o CHECK
 * aceita só os dois valores e "Reunião fornecedor" não é nenhum deles.
 */
export function parseEvent(title: string | null, creatorEmail: string | null): Parsed {
  if (creatorEmail && normalizeText(creatorEmail).includes(LETHICIA_EMAIL_FRAGMENT)) {
    return { artist: 'lethicia', category: 'sessao', serviceType: 'piercing' }
  }

  const t = normalizeText(title)
  if (SESSION_KEYWORDS.some((k) => t.includes(k))) {
    return { artist: 'julio', category: 'sessao', serviceType: 'tattoo' }
  }

  return { artist: null, category: 'outros', serviceType: null }
}

/* ------------------------------------------------------------------
   Matcher de pessoa por telefone (contrato §9.1)
   ------------------------------------------------------------------ */

/**
 * Candidatos a telefone brasileiro em texto livre. Deliberadamente frouxa: quem
 * decide se o número presta é o `toE164` do util existente, que é a única
 * normalização de telefone do repo. A regex só recorta.
 *
 * O separador não inclui `/`, senão "12/08/2026" viraria candidato a telefone.
 */
const PHONE_CANDIDATE_RE = /(?:\+?55[\s.-]*)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g

/**
 * Telefones DISTINTOS e válidos da descrição, em E.164. Dois números diferentes
 * são ambiguidade, e ambiguidade é humano (contrato §13d): o evento cai na
 * bandeja em vez de vincular o primeiro e errar calado.
 */
export function extractPhones(description: string | null): string[] {
  if (!description) return []
  const found = new Set<string>()
  for (const raw of description.match(PHONE_CANDIDATE_RE) ?? []) {
    const e164 = toE164(raw, 'BR')
    if (e164) found.add(e164)
  }
  return [...found]
}

/* ------------------------------------------------------------------
   Google → linha do espelho
   ------------------------------------------------------------------ */

/** `GoogleDateTime` → instante ISO. Dia inteiro resolve na meia-noite de SP. */
function toInstant(dt: GoogleDateTime | undefined): string | null {
  if (!dt) return null
  if (dt.dateTime) {
    const d = new Date(dt.dateTime)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  if (dt.date) return spToInstant(dt.date).toISOString()
  return null
}

type MirrorRow = {
  source_id: string
  external_id: string
  title: string | null
  description: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
  status: 'confirmed' | 'cancelled'
  origin: 'google' | 'crm'
  creator_email: string | null
  category: EventCategory
  artist: string | null
  service_type: ServiceType | null
  meta_source: Record<string, unknown>
  person_id: string | null
  match_source: 'phone' | 'manual' | null
}

type ExistingRow = {
  id: string
  external_id: string
  status: string
  origin: string
  category: string
  artist: string | null
  service_type: string | null
  meta_source: Record<string, unknown> | null
  person_id: string | null
  match_source: string | null
  title: string | null
  description: string | null
  starts_at: string
  ends_at: string | null
  all_day: boolean
  creator_email: string | null
}

/* ------------------------------------------------------------------
   O núcleo
   ------------------------------------------------------------------ */

export type SyncOptions = {
  dryRun?: boolean
  /**
   * Ignora o `sync_token` e varre a janela cheia. Existe pro dry-run: com o
   * token salvo, a rodada incremental devolve só o que mudou desde a última —
   * ótimo em produção, inútil pra conferir a distribuição do parser sobre a
   * agenda inteira. Só faz sentido junto de `dryRun`, e é o que a rota exige.
   */
  forceFull?: boolean
}

export async function syncCalendar(opts: SyncOptions = {}): Promise<SyncResult> {
  const dryRun = opts.dryRun === true
  const tag = dryRun ? `${LOG} (dry-run)` : LOG

  try {
    const admin = createAdminClient()
    const externalCalendarId = calendarId()

    /* 1. A fonte. */
    const { data: source, error: sourceErr } = await admin
      .from('calendar_sources')
      .select('id, external_id, label, sync_token, is_active')
      .eq('provider', 'google')
      .eq('external_id', externalCalendarId)
      .maybeSingle()

    if (sourceErr) {
      console.error(`${tag} leitura da fonte falhou:`, sourceErr.message)
      return { status: 'error', message: sourceErr.message }
    }
    if (!source) {
      return {
        status: 'error',
        message: `Agenda ${externalCalendarId} não está em calendar_sources.`,
      }
    }
    if (!source.is_active) {
      return { status: 'error', message: `Agenda "${source.label}" está desativada.` }
    }

    /* 2. Leitura do Google: incremental, com queda pra janela cheia. */
    const useToken = source.sync_token && !opts.forceFull
    let mode: 'incremental' | 'full' = useToken ? 'incremental' : 'full'
    let listed
    try {
      listed = useToken
        ? await listEvents({ syncToken: source.sync_token as string })
        : await listEvents(fullWindow())
    } catch (e) {
      if (e instanceof SyncTokenGoneError) {
        // Token expirado do lado do Google: refaz a janela cheia. O upsert é
        // idempotente, então reler tudo custa tempo, não consistência.
        console.warn(`${tag} syncToken invalidado (410) — refazendo janela cheia`)
        mode = 'full'
        listed = await listEvents(fullWindow())
      } else {
        throw e
      }
    }

    const googleEvents = listed.events
    console.info(
      `${tag} ${googleEvents.length} eventos lidos de "${source.label}" (${mode})`
    )

    /* 3. O que já existe no espelho. */
    const externalIds = googleEvents.map((g) => g.id).filter(Boolean)
    const existing = await loadExisting(admin, source.id, externalIds)

    /* 4. Matcher: só pros eventos que precisam (person_id nulo hoje). */
    const phonesByEvent = new Map<string, string[]>()
    const allPhones = new Set<string>()
    for (const g of googleEvents) {
      if (g.status === 'cancelled') continue
      const current = existing.get(g.id)
      // Vínculo manual NUNCA é sobrescrito — o matcher nem olha pro evento.
      if (current?.person_id) continue
      const phones = extractPhones(g.description ?? null)
      if (phones.length !== 1) continue
      phonesByEvent.set(g.id, phones)
      allPhones.add(phones[0])
    }
    const peopleByPhone = await loadPeopleByPhone(admin, [...allPhones])

    /* 5. Monta as linhas, respeitando a tabela de propriedade (§6). */
    const rows: MirrorRow[] = []
    const counts: SyncCounts = {
      lidos: googleEvents.length,
      criados: 0,
      atualizados: 0,
      cancelados: 0,
      sem_vinculo: 0,
    }
    const parser: Record<string, number> = {}
    const serviceTypes: Record<string, number> = {}
    let matched = 0

    for (const g of googleEvents) {
      const current = existing.get(g.id)

      /* Cancelado no Google (contrato §13e): status, nunca DELETE. */
      if (g.status === 'cancelled') {
        // Cancelado que o espelho nunca viu não vira linha: seria inventar
        // histórico de um evento que, pra este CRM, nunca existiu.
        if (!current) continue
        rows.push({ ...fromExisting(current, source.id), status: 'cancelled' })
        if (current.status !== 'cancelled') counts.cancelados++
        continue
      }

      const startsAt = toInstant(g.start)
      if (!startsAt) {
        // `starts_at` é NOT NULL e um evento sem início não é agendável.
        console.warn(`${tag} evento ${g.id} sem início utilizável — ignorado`)
        continue
      }

      const flags = (current?.meta_source ?? {}) as Record<string, unknown>
      const artistManual = flags.artist_manual === true
      const categoryManual = flags.category_manual === true
      const serviceTypeManual = flags.service_type_manual === true

      const creatorEmail = g.creator?.email ?? null
      const parsed = parseEvent(g.summary ?? null, creatorEmail)

      // Recompute SÓ com a flag falsa (§6). Com a flag ligada, o que o Julio
      // corrigiu no drawer sobrevive a todas as rodadas seguintes.
      const artist = artistManual ? (current?.artist ?? null) : parsed.artist
      const category = categoryManual
        ? ((current?.category ?? 'outros') as EventCategory)
        : parsed.category
      const serviceType = serviceTypeManual
        ? ((current?.service_type ?? null) as ServiceType | null)
        : parsed.serviceType

      const bucket = `${category}/${artist ?? 'sem-artista'}`
      parser[bucket] = (parser[bucket] ?? 0) + 1
      const stBucket = serviceType ?? 'null'
      serviceTypes[stBucket] = (serviceTypes[stBucket] ?? 0) + 1

      /* Vínculo: manual > automático, sempre. */
      let personId = current?.person_id ?? null
      let matchSource = (current?.match_source ?? null) as 'phone' | 'manual' | null
      if (!personId) {
        const phones = phonesByEvent.get(g.id)
        const found = phones ? peopleByPhone.get(phones[0]) : undefined
        if (found) {
          personId = found
          matchSource = 'phone'
          matched++
        }
      }
      if (!personId) counts.sem_vinculo++

      rows.push({
        source_id: source.id,
        external_id: g.id,
        // Campos Google-owned: sobrescritos sempre.
        title: g.summary ?? null,
        description: g.description ?? null,
        starts_at: startsAt,
        ends_at: toInstant(g.end),
        all_day: Boolean(g.start?.date),
        // O CHECK do banco só conhece confirmed/cancelled; `tentative` é um
        // evento que existe na agenda, então entra como confirmado.
        status: 'confirmed',
        // `origin` é imutável: preserva o que já existe, e evento desconhecido
        // nasce 'google' (contrato §5).
        origin: (current?.origin ?? 'google') as 'google' | 'crm',
        creator_email: creatorEmail,
        category,
        artist,
        service_type: serviceType,
        // As flags são do CRM: o sync repassa o que achou, nunca as reescreve.
        meta_source: (current?.meta_source ?? {}) as Record<string, unknown>,
        person_id: personId,
        match_source: matchSource,
      })

      if (current) counts.atualizados++
      else counts.criados++
    }

    const syncedAt = new Date().toISOString()

    /* 6. Escrita — o único trecho que o dry-run pula. */
    if (!dryRun) {
      const wrote = await writeRows(admin, rows)
      if (wrote) return { status: 'error', message: wrote }

      const { error: stampErr } = await admin
        .from('calendar_sources')
        .update({
          last_synced_at: syncedAt,
          // Sem token novo (o Google só manda na última página), mantém o
          // atual: perder o token só custaria uma janela cheia na próxima.
          ...(listed.nextSyncToken ? { sync_token: listed.nextSyncToken } : {}),
        })
        .eq('id', source.id)

      if (stampErr) {
        console.error(`${tag} carimbo da fonte falhou:`, stampErr.message)
        return { status: 'error', message: stampErr.message }
      }
    }

    console.info(
      `${tag} ${counts.criados} novos · ${counts.atualizados} atualizados · ` +
        `${counts.cancelados} cancelados · ${counts.sem_vinculo} sem vínculo · ` +
        `${matched} casados por telefone · tipo ` +
        Object.entries(serviceTypes)
          .map(([k, v]) => `${k}:${v}`)
          .join(' ')
    )

    return { status: 'ok', counts, syncedAt, mode, dryRun, parser, serviceTypes, matched }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error(`${tag} throw:`, msg)
    return { status: 'error', message: msg }
  }
}

/* ------------------------------------------------------------------
   Auxiliares
   ------------------------------------------------------------------ */

function fullWindow(): { timeMin: string; timeMax: string } {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  return {
    timeMin: new Date(now - FULL_WINDOW_BACK_DAYS * day).toISOString(),
    timeMax: new Date(now + FULL_WINDOW_FORWARD_DAYS * day).toISOString(),
  }
}

/**
 * Linha existente → payload do upsert, preservando TUDO. Usado no caminho do
 * cancelamento, onde a carga do Google vem mínima (às vezes só id e status) e
 * reescrever os campos com `null` apagaria o evento em vez de cancelá-lo.
 */
function fromExisting(current: ExistingRow, sourceId: string): MirrorRow {
  return {
    source_id: sourceId,
    external_id: current.external_id,
    title: current.title,
    description: current.description,
    starts_at: current.starts_at,
    ends_at: current.ends_at,
    all_day: current.all_day,
    status: 'confirmed',
    origin: current.origin as 'google' | 'crm',
    creator_email: current.creator_email,
    category: current.category as EventCategory,
    artist: current.artist,
    service_type: current.service_type as ServiceType | null,
    meta_source: (current.meta_source ?? {}) as Record<string, unknown>,
    person_id: current.person_id,
    match_source: current.match_source as 'phone' | 'manual' | null,
  }
}

type Admin = ReturnType<typeof createAdminClient>

async function loadExisting(
  admin: Admin,
  sourceId: string,
  externalIds: string[]
): Promise<Map<string, ExistingRow>> {
  const map = new Map<string, ExistingRow>()

  for (let i = 0; i < externalIds.length; i += CHUNK) {
    const slice = externalIds.slice(i, i + CHUNK)
    const { data, error } = await admin
      .from('calendar_events')
      .select(
        'id, external_id, status, origin, category, artist, service_type, meta_source, person_id, match_source, title, description, starts_at, ends_at, all_day, creator_email'
      )
      .eq('source_id', sourceId)
      .in('external_id', slice)

    if (error) throw new Error(`leitura do espelho falhou: ${error.message}`)
    for (const row of (data ?? []) as ExistingRow[]) map.set(row.external_id, row)
  }

  return map
}

/**
 * Telefone E.164 → id da pessoa ATIVA. O índice único parcial
 * `people_phone_unique` garante no máximo uma viva por telefone, então "match
 * único" é propriedade do banco, não uma checagem que este código faz.
 */
async function loadPeopleByPhone(
  admin: Admin,
  phones: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (phones.length === 0) return map

  for (let i = 0; i < phones.length; i += CHUNK) {
    const slice = phones.slice(i, i + CHUNK)
    const { data, error } = await admin
      .from('people')
      .select('id, phone')
      .in('phone', slice)
      .is('deleted_at', null)

    if (error) throw new Error(`leitura de pessoas falhou: ${error.message}`)
    for (const p of (data ?? []) as Array<{ id: string; phone: string }>) {
      map.set(p.phone, p.id)
    }
  }

  return map
}

/** Upsert por `(source_id, external_id)` — a UNIQUE que torna a rodada idempotente. */
async function writeRows(admin: Admin, rows: MirrorRow[]): Promise<string | null> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await admin
      .from('calendar_events')
      .upsert(rows.slice(i, i + CHUNK), { onConflict: 'source_id,external_id' })

    if (error) {
      console.error(`${LOG} upsert falhou:`, error.message)
      return error.message
    }
  }
  return null
}
