import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { z } from 'zod'
import { Alert, Badge, Card, CardHeader } from '@/components/ui'
import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatBRL, formatPhoneBR, formatRelativeTime } from '@/lib/format'
import { formatDateBR, formatDateTimeBR } from '@/app/admin/_ui/format'
import {
  EventList,
  resolveUserEmails,
  type AdminEvent,
} from '@/app/admin/_ui/events'
import { LOCKABLE_FIELDS, type PersonField } from '@/app/admin/_ui/person-fields'
import { PersonEdit } from './PersonEdit'
import type { JobStatus } from '@/lib/domain/job-status'

/**
 * Detalhe da pessoa (#4c §5 + §5-bis). Leitura + edição com trava por campo.
 * Nenhum dado clínico entra aqui — anamnese/consents/motivations são declarações
 * da pessoa sobre o próprio corpo, o admin não fala por ela.
 */

const ACTIVE_STATUSES: JobStatus[] = ['quoted', 'confirmed', 'no_response']

const STATUS_LABELS: Record<JobStatus, string> = {
  quoted: 'A orçar',
  confirmed: 'Confirmado',
  executed: 'Executado',
  cancelled: 'Cancelado',
  no_response: 'Sem resposta',
}

const CONSENT_LABELS: Record<string, string> = {
  procedure: 'Procedimento',
  health: 'Saúde',
  lgpd: 'LGPD',
  image: 'Imagem',
  marketing: 'Marketing',
}

type LockInfo = { email: string; locked_at: string }
type AdminLock = { locked_at: string; locked_by: string }

type PersonRow = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  birth_date: string | null
  lat: number | null
  lng: number | null
  extra_data: Record<string, unknown> | null
  identified_at: string | null
}

type JobRow = {
  id: string
  status: JobStatus
  body_region: string | null
  description: string | null
  quoted_price: number | string | null
  final_price: number | string | null
  created_at: string
}

type ConsentRow = {
  consent_type: string
  granted: boolean
  policy_version: string | null
  valid_until: string | null
  created_at: string
}

function truncate(s: string | null | undefined, n = 60): string {
  if (!s) return '—'
  const t = s.trim()
  return t.length > n ? `${t.slice(0, n).trimEnd()}…` : t
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { email: operatorEmail } = await requireOperator()

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()

  const admin = createAdminClient()

  const { data: personData, error: personErr } = await admin
    .from('people')
    .select('id, name, phone, email, birth_date, lat, lng, extra_data, identified_at, deleted_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (personErr) {
    console.error('[admin/person] load failed:', personErr.message)
    return (
      <div>
        <BackLink />
        <Alert variant="warning" title="Não foi possível carregar a pessoa agora" className="mt-fh-5">
          Recarrega a página em instantes.
        </Alert>
      </div>
    )
  }
  if (!personData) notFound()
  const person = personData as unknown as PersonRow

  const [{ data: jobsData }, { data: consentsData }, { data: eventsData }] =
    await Promise.all([
      admin
        .from('jobs')
        .select('id, status, body_region, description, quoted_price, final_price, created_at')
        .eq('person_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      admin
        .from('consents')
        .select('consent_type, granted, policy_version, valid_until, created_at')
        .eq('person_id', id)
        .order('created_at', { ascending: false }),
      admin
        .from('events')
        .select('id, event_type, actor_id, occurred_at')
        .eq('person_id', id)
        .order('occurred_at', { ascending: false })
        .limit(20),
    ])

  const jobs = (jobsData ?? []) as JobRow[]
  const consents = (consentsData ?? []) as ConsentRow[]
  const events = (eventsData ?? []) as AdminEvent[]

  const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status))
  const history = jobs.filter((j) => !ACTIVE_STATUSES.includes(j.status))

  // Consents: a linha mais recente por consent_type (lista já vem desc).
  const latestByType = new Map<string, ConsentRow>()
  for (const c of consents) {
    if (!latestByType.has(c.consent_type)) latestByType.set(c.consent_type, c)
  }
  const latestConsents = [...latestByType.values()]

  const extra = (person.extra_data ?? {}) as Record<string, unknown>
  const rawLocks = (extra.admin_locks ?? {}) as Record<string, AdminLock>

  // Resolve e-mails de actors (eventos) + donos das travas, numa tacada.
  const emails = await resolveUserEmails(admin, [
    ...events.map((e) => e.actor_id),
    ...Object.values(rawLocks).map((l) => l.locked_by),
  ])

  const initial: Record<PersonField, string> = {
    name: str(person.name),
    email: str(person.email),
    phone: str(person.phone),
    birth_date: str(person.birth_date),
    document_type: str(extra.document_type),
    document_number: str(extra.document_number),
    neighborhood: str(extra.neighborhood),
    city: str(extra.city),
    instagram: str(extra.instagram),
    occupation: str(extra.occupation),
    preferred_channel: str(extra.preferred_channel),
  }

  const locks: Partial<Record<PersonField, LockInfo>> = {}
  for (const field of LOCKABLE_FIELDS) {
    const l = rawLocks[field]
    if (l) {
      locks[field] = {
        email: emails[l.locked_by] ?? '',
        locked_at: l.locked_at,
      }
    }
  }

  const displayName = person.name?.trim() || formatPhoneBR(person.phone)
  const hasGeo = person.lat != null && person.lng != null

  return (
    <div>
      <BackLink />

      <h1 className="mt-fh-4 mb-fh-5">{displayName}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-fh-5 items-start">
        {/* ── Esquerda: edição + fatos do sistema + extra_data ── */}
        <div className="flex flex-col gap-fh-5">
          <Card>
            <CardHeader
              title="Dados"
              description="Clique no lápis para editar um campo. O cadeado marca o que o formulário não pode mais sobrescrever."
            />
            <PersonEdit
              personId={person.id}
              operatorEmail={operatorEmail}
              initial={initial}
              locks={locks}
            />

            <dl className="mt-fh-5 flex flex-col gap-fh-1">
              <Fact label="Identificado em" value={formatDateTimeBR(person.identified_at)} />
              <Fact
                label="Coordenadas"
                value={hasGeo ? `${person.lat}, ${person.lng}` : '—'}
              />
            </dl>

            <ExtraData data={person.extra_data} />
          </Card>
        </div>

        {/* ── Direita: jobs + consents + eventos ── */}
        <div className="flex flex-col gap-fh-5">
          <Card>
            <CardHeader
              title="Jobs ativos"
              action={<Badge variant="neutral">{active.length}</Badge>}
            />
            <JobList jobs={active} />
          </Card>

          <Card>
            <CardHeader
              title="Histórico"
              action={<Badge variant="neutral">{history.length}</Badge>}
            />
            <JobList jobs={history} muted />
          </Card>

          <Card>
            <CardHeader title="Consentimentos" />
            {latestConsents.length > 0 ? (
              <ul className="flex flex-col gap-fh-2">
                {latestConsents.map((c) => (
                  <li
                    key={c.consent_type}
                    className="flex items-baseline justify-between gap-fh-3 border-b border-fh-subtle pb-fh-2"
                  >
                    <span>
                      {CONSENT_LABELS[c.consent_type] ?? c.consent_type}{' '}
                      <span className={c.granted ? undefined : 'text-fh-accent'}>
                        {c.granted ? '✓' : '✗'}
                      </span>
                      <span className="fh-micro block">
                        {c.policy_version ?? '—'}
                        {c.valid_until
                          ? ` · vale até ${formatDateBR(c.valid_until)}`
                          : ''}
                      </span>
                    </span>
                    <span className="fh-micro whitespace-nowrap">
                      {formatRelativeTime(c.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fh-micro">Sem consentimentos.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Últimos eventos" />
            <EventList events={events} actorEmails={emails} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function JobList({ jobs, muted }: { jobs: JobRow[]; muted?: boolean }) {
  if (jobs.length === 0) {
    return <p className="fh-micro">Nenhum.</p>
  }
  return (
    <ul className="flex flex-col">
      {jobs.map((j) => {
        const price = j.final_price ?? j.quoted_price
        return (
          <li key={j.id} className="border-b border-fh-subtle py-fh-3">
            <Link
              href={`/admin/jobs/${j.id}`}
              className={`block no-underline ${muted ? 'opacity-70' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-fh-3">
                <span className="flex items-center gap-fh-2 min-w-0">
                  <Badge variant={j.status}>{STATUS_LABELS[j.status]}</Badge>
                  {j.body_region && <span className="truncate">{j.body_region}</span>}
                </span>
                <span className="fh-micro fh-tnum whitespace-nowrap">
                  {formatBRL(price)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-fh-3 mt-fh-1">
                <span className="fh-micro truncate">{truncate(j.description)}</span>
                <span className="fh-micro whitespace-nowrap">
                  {formatRelativeTime(j.created_at)}
                </span>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function ExtraData({ data }: { data: Record<string, unknown> | null }) {
  if (!data || Object.keys(data).length === 0) return null
  return (
    <details className="mt-fh-5">
      <summary className="fh-eyebrow cursor-pointer">extra_data</summary>
      <pre className="mt-fh-2 p-fh-3 bg-fh-sunken rounded-fh-md overflow-x-auto fh-micro fh-tnum">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-fh-3">
      <dt className="fh-micro">{label}</dt>
      <dd className="fh-tnum text-right">{value}</dd>
    </div>
  )
}

function BackLink() {
  return (
    <Link href="/admin" className="inline-flex items-center gap-fh-2 no-underline">
      <ArrowLeft size={18} strokeWidth={1.5} />
      Fila
    </Link>
  )
}
