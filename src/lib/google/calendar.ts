import 'server-only'

import { JWT } from 'google-auth-library'

/**
 * Cliente da Google Calendar API v3 — o ÚNICO ponto do repo que fala com o
 * Google. Autenticação por service account (JWT), chamadas por `fetch` na API
 * REST: `google-auth-library` entra só pela assinatura do JWT, que é a parte
 * que não se escreve à mão. O `googleapis` completo seria ~50MB de SDK pra três
 * endpoints (contrato: dependência autorizada é só a auth).
 *
 * Escopo: `calendar.events` — a SA lê e escreve evento, e não mexe na agenda em
 * si (não cria, não apaga, não muda ACL).
 *
 * Nada aqui sabe o que é `calendar_events`, pessoa ou categoria: este módulo
 * devolve o evento como o Google o descreve. Quem traduz é `sync.ts`.
 */

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const API_BASE = 'https://www.googleapis.com/calendar/v3'

/* ------------------------------------------------------------------
   Credenciais
   ------------------------------------------------------------------ */

type ServiceAccountKey = { client_email: string; private_key: string }

function readServiceAccount(): ServiceAccountKey {
  const b64 = process.env.GOOGLE_SA_KEY_BASE64
  if (!b64) {
    throw new Error('[google/calendar] Missing env: GOOGLE_SA_KEY_BASE64')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
  } catch {
    // Mensagem sem o conteúdo decodificado: é uma chave privada, e log de
    // erro é o lugar mais fácil do mundo de vazar uma.
    throw new Error('[google/calendar] GOOGLE_SA_KEY_BASE64 não é um JSON válido em base64')
  }

  const key = parsed as Partial<ServiceAccountKey>
  if (!key?.client_email || !key?.private_key) {
    throw new Error('[google/calendar] JSON da service account sem client_email/private_key')
  }

  return { client_email: key.client_email, private_key: key.private_key }
}

/** O calendar ID da agenda operada. */
export function calendarId(): string {
  const id = process.env.GOOGLE_CALENDAR_ID
  if (!id) throw new Error('[google/calendar] Missing env: GOOGLE_CALENDAR_ID')
  return id
}

/**
 * Token de acesso da SA. O `JWT` do google-auth-library cacheia o token em
 * memória e só reassina perto do vencimento, então instanciar por chamada de
 * sync (não por request HTTP ao Google) é barato o bastante.
 */
async function accessToken(): Promise<string> {
  const sa = readServiceAccount()
  const client = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: [CALENDAR_SCOPE],
  })
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('[google/calendar] service account não devolveu access token')
  return token
}

/* ------------------------------------------------------------------
   Tipos do Google (só o que o espelho usa)
   ------------------------------------------------------------------ */

export type GoogleDateTime = {
  /** Evento com horário: RFC3339 com offset. */
  dateTime?: string
  /** Evento de dia inteiro: "YYYY-MM-DD". */
  date?: string
  timeZone?: string
}

export type GoogleEvent = {
  id: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  summary?: string
  description?: string
  start?: GoogleDateTime
  end?: GoogleDateTime
  creator?: { email?: string }
  recurringEventId?: string
}

/**
 * Erro de token de sync invalidado (HTTP 410). O sync trata este caso
 * refazendo a janela cheia — é a única exceção que ele distingue por tipo.
 */
export class SyncTokenGoneError extends Error {
  constructor() {
    super('[google/calendar] syncToken inválido (410) — precisa de janela cheia')
    this.name = 'SyncTokenGoneError'
  }
}

/* ------------------------------------------------------------------
   Chamada crua
   ------------------------------------------------------------------ */

async function call<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | undefined> } = {}
): Promise<T> {
  const { query, ...rest } = init
  const url = new URL(`${API_BASE}${path}`)
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, v)
  }

  const token = await accessToken()
  const res = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(rest.headers ?? {}),
    },
    // Espelho de agenda nunca pode vir de cache do fetch do Next.
    cache: 'no-store',
  })

  if (res.status === 410) throw new SyncTokenGoneError()

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `[google/calendar] ${rest.method ?? 'GET'} ${path} → ${res.status} ${res.statusText} ${body.slice(0, 300)}`
    )
  }

  // DELETE devolve 204 sem corpo; os endpoints usados aqui sempre devolvem JSON.
  return (await res.json()) as T
}

/* ------------------------------------------------------------------
   Leitura
   ------------------------------------------------------------------ */

export type ListResult = {
  events: GoogleEvent[]
  /** Token pra próxima rodada incremental. */
  nextSyncToken: string | null
}

type ListPage = {
  items?: GoogleEvent[]
  nextPageToken?: string
  nextSyncToken?: string
}

/**
 * Lista eventos: incremental (`syncToken`) ou por janela (`timeMin`/`timeMax`).
 * Segue a paginação até o fim e devolve tudo — a agenda tem ~130 eventos/mês, e
 * paginação preguiçosa aqui seria complexidade sem carga que a justifique.
 *
 * `singleEvents=true` expande recorrência em ocorrências, cada uma com id
 * próprio: é o que permite o espelho tratar toda linha igual, sem entender RRULE.
 * A flag precisa ser a MESMA da rodada que gerou o syncToken, senão o Google
 * devolve 410 — por isso ela é fixa aqui, e não parâmetro.
 *
 * `showDeleted=true` porque cancelamento é informação: o evento vira
 * `status='cancelled'` no espelho (contrato §13e), nunca DELETE.
 */
export async function listEvents(
  params: { syncToken: string } | { timeMin: string; timeMax: string }
): Promise<ListResult> {
  const events: GoogleEvent[] = []
  let pageToken: string | undefined
  let nextSyncToken: string | null = null

  do {
    const page: ListPage = await call<ListPage>(
      `/calendars/${encodeURIComponent(calendarId())}/events`,
      {
        query: {
          singleEvents: 'true',
          showDeleted: 'true',
          maxResults: '250',
          pageToken,
          ...('syncToken' in params
            ? { syncToken: params.syncToken }
            : { timeMin: params.timeMin, timeMax: params.timeMax }),
        },
      }
    )

    events.push(...(page.items ?? []))
    pageToken = page.nextPageToken
    // O Google só manda o syncToken na ÚLTIMA página da varredura.
    nextSyncToken = page.nextSyncToken ?? nextSyncToken
  } while (pageToken)

  return { events, nextSyncToken }
}

/* ------------------------------------------------------------------
   Escrita (write-through)
   ------------------------------------------------------------------ */

export type EventWrite = {
  summary?: string
  description?: string
  start?: GoogleDateTime
  end?: GoogleDateTime
}

/** Cria o evento NA agenda do Google. O espelho só reflete depois disto. */
export async function createEvent(body: EventWrite): Promise<GoogleEvent> {
  return call<GoogleEvent>(`/calendars/${encodeURIComponent(calendarId())}/events`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Patch parcial do evento no Google. PATCH e não PUT de propósito: o CRM só
 * conhece os campos que edita, e um PUT apagaria convidados, lembretes e
 * qualquer coisa que o Julio tenha configurado por lá.
 */
export async function patchEvent(
  eventId: string,
  body: EventWrite
): Promise<GoogleEvent> {
  return call<GoogleEvent>(
    `/calendars/${encodeURIComponent(calendarId())}/events/${encodeURIComponent(eventId)}`,
    { method: 'PATCH', body: JSON.stringify(body) }
  )
}
