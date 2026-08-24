import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { spToInstant } from '@/app/admin/_ui/format'
import type { CalendarEventRow } from '@/app/admin/_ui/calendario'
import type { TagCatalogEntry } from '@/app/admin/_ui/tags'
import { calendarId } from '@/lib/google/calendar'

/**
 * Leitura da tela de Calendário. Fonte ÚNICA: a RPC `calendar_events_between`
 * (contrato §1.1). O front nunca consulta o Google, nunca lê `calendar_events`
 * direto e nunca monta a agenda de fontes paralelas — inclusive os aniversários
 * vêm de lá, com a recorrência já resolvida no SQL.
 *
 * A janela chega em chave de dia de São Paulo e sai daqui em instante UTC: a
 * conversão é a do ponto único (`_ui/format.ts`).
 */

export type CalendarPageData = {
  events: CalendarEventRow[]
  /** Carimbo de `calendar_sources.last_synced_at`. */
  lastSyncedAt: string | null
  sourceLabel: string | null
  /** Catálogo inteiro — o render resolve slug→(nome,cor) e trata órfã. */
  tags: TagCatalogEntry[]
}

export type LoadCalendarResult =
  | { status: 'ok'; data: CalendarPageData }
  | { status: 'error'; message: string }

/**
 * Eventos da janela [from, to) — chaves "YYYY-MM-DD" do dia de São Paulo.
 * Exportada à parte porque a navegação client-side recarrega só isto quando sai
 * da janela já carregada.
 */
export async function loadCalendarWindow(
  from: string,
  to: string
): Promise<{ status: 'ok'; events: CalendarEventRow[] } | { status: 'error'; message: string }> {
  const admin = createAdminClient()

  const { data, error } = await admin.rpc('calendar_events_between', {
    p_start: spToInstant(from).toISOString(),
    p_end: spToInstant(to).toISOString(),
  })

  if (error) {
    console.error('[admin/calendario] RPC falhou:', error.message)
    return { status: 'error', message: error.message }
  }

  return { status: 'ok', events: (data ?? []) as CalendarEventRow[] }
}

/** Catálogo de tags inteiro (ativas e inativas) — some ~dezenas de linhas. */
export async function loadTagCatalog(): Promise<TagCatalogEntry[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('tags')
    .select('slug, name, color, is_active')
    .order('name', { ascending: true })

  if (error) {
    // Catálogo é acessório: sem ele a badge cai no tratamento de órfã (cinza),
    // que já é um caminho previsto. Derrubar a agenda por causa disso seria
    // trocar um degrade por uma tela de erro.
    console.error('[admin/calendario] catálogo de tags falhou:', error.message)
    return []
  }

  return (data ?? []) as TagCatalogEntry[]
}

export async function loadCalendarPage(
  from: string,
  to: string
): Promise<LoadCalendarResult> {
  try {
    const admin = createAdminClient()

    const [windowResult, tags, sourceResult] = await Promise.all([
      loadCalendarWindow(from, to),
      loadTagCatalog(),
      admin
        .from('calendar_sources')
        .select('label, last_synced_at')
        .eq('provider', 'google')
        .eq('external_id', calendarId())
        .maybeSingle(),
    ])

    if (windowResult.status === 'error') return windowResult

    if (sourceResult.error) {
      // O carimbo é informação de rodapé; a agenda em si já veio.
      console.error('[admin/calendario] fonte falhou:', sourceResult.error.message)
    }

    return {
      status: 'ok',
      data: {
        events: windowResult.events,
        lastSyncedAt: sourceResult.data?.last_synced_at ?? null,
        sourceLabel: sourceResult.data?.label ?? null,
        tags,
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[admin/calendario] load threw:', msg)
    return { status: 'error', message: msg }
  }
}
