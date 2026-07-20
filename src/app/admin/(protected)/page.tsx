import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatBRL, formatPhoneBR, formatRelativeTime } from '@/lib/format'
import { QueueTable, type QueueJob } from './QueueTable'
import type { JobStatus } from '@/lib/domain/job-status'
import { Alert, Badge, Card, CardHeader } from '@/components/ui'

/**
 * Home do admin = a FILA (#4b). Não é dashboard: é o que precisa da mão do
 * Julio hoje, em ordem de urgência. Uma query só (service_role, atrás do gate),
 * agrupada em memória em quatro seções.
 *
 * A distinção que quebra código descuidado: `quoted` não significa "sem preço".
 * Quem separa "ainda não orçei" de "orçei e o cliente sumiu" é o quoted_price,
 * não o status. Por isso os grupos 1 e 2 filtram por quoted_price, não só pelo
 * enum.
 */

// Postgres numeric chega do PostgREST como number ou string; normaliza.
function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isNaN(n) ? null : n
}

function truncate(s: string | null | undefined, n = 80): string {
  if (!s) return '—'
  const t = s.trim()
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t
}

type PersonJoin = { name: string | null; phone: string | null } | null

type JobRow = {
  id: string
  status: JobStatus
  quoted_price: number | string | null
  final_price: number | string | null
  created_at: string
  description: string | null
  body_region: string | null
  people: PersonJoin | PersonJoin[]
}

function person(row: JobRow): { name: string | null; phone: string | null } {
  const p = Array.isArray(row.people) ? row.people[0] : row.people
  return { name: p?.name ?? null, phone: p?.phone ?? null }
}

function toQueueJob(row: JobRow): QueueJob {
  const { name, phone } = person(row)
  const phoneFmt = formatPhoneBR(phone)
  return {
    id: row.id,
    displayName: name?.trim() || phoneFmt,
    phone: phoneFmt,
    bodyRegion: row.body_region ?? '',
    description: truncate(row.description),
    quotedPriceLabel: formatBRL(row.quoted_price),
    ageLabel: formatRelativeTime(row.created_at),
    status: row.status,
    finalPrice: toNum(row.final_price),
  }
}

export default async function AdminQueuePage() {
  await requireOperator()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('jobs')
    .select(
      'id, status, quoted_price, final_price, created_at, description, body_region, people(name, phone)'
    )
    .is('deleted_at', null)
    .in('status', ['quoted', 'confirmed', 'no_response'])
    // O mais antigo primeiro: a fila é sobre quem espera há mais tempo.
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[admin/queue] load failed:', error.message)
    return (
      <div>
        <Header />
        <Alert variant="warning" title="Não foi possível carregar a fila agora">
          Recarrega a página em instantes.
        </Alert>
      </div>
    )
  }

  const rows = (data ?? []) as JobRow[]

  // Agrupamento em memória. A ordem ASC da query se preserva dentro de cada
  // grupo (filter mantém a ordem original).
  const needsPrice: QueueJob[] = []
  const awaitingReply: QueueJob[] = []
  const awaitingSession: QueueJob[] = []
  const noResponse: QueueJob[] = []

  for (const row of rows) {
    const job = toQueueJob(row)
    if (row.status === 'quoted') {
      if (toNum(row.quoted_price) === null) needsPrice.push(job)
      else awaitingReply.push(job)
    } else if (row.status === 'confirmed') {
      awaitingSession.push(job)
    } else if (row.status === 'no_response') {
      noResponse.push(job)
    }
  }

  const total =
    needsPrice.length +
    awaitingReply.length +
    awaitingSession.length +
    noResponse.length

  return (
    <div>
      <Header />

      <div className="flex flex-col gap-fh-5">
        <Group title="Precisa de preço" jobs={needsPrice} />
        <Group title="Aguardando resposta" jobs={awaitingReply} />
        <Group title="Aguardando sessão" jobs={awaitingSession} />
        <Group title="Sem resposta" jobs={noResponse} />
      </div>

      <p className="fh-micro mt-fh-5">
        {total} {total === 1 ? 'job' : 'jobs'} na fila
      </p>
    </div>
  )
}

function Header() {
  return <h1 className="mb-fh-6">Fila de trabalho</h1>
}

function Group({ title, jobs }: { title: string; jobs: QueueJob[] }) {
  return (
    <Card as="section">
      <CardHeader
        title={title}
        action={<Badge variant="neutral">{jobs.length}</Badge>}
      />
      <QueueTable jobs={jobs} />
    </Card>
  )
}
