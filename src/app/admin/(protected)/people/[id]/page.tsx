import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
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
        <p className="mt-6 text-sm text-[color:var(--oxblood)]" role="alert">
          Não foi possível carregar a pessoa agora.
        </p>
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

      <h1 className="mt-6 mb-8 font-[family-name:var(--font-fraunces)] text-2xl sm:text-3xl">
        {displayName}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* ── Esquerda: edição + fatos do sistema + extra_data ── */}
        <div>
          <ColTitle>Dados</ColTitle>
          <PersonEdit
            personId={person.id}
            operatorEmail={operatorEmail}
            initial={initial}
            locks={locks}
          />

          <dl className="mt-8 flex flex-col gap-1 text-sm">
            <Fact label="Identificado em" value={formatDateTimeBR(person.identified_at)} />
            <Fact
              label="Coordenadas"
              value={hasGeo ? `${person.lat}, ${person.lng}` : '—'}
            />
          </dl>

          <ExtraData data={person.extra_data} />
        </div>

        {/* ── Direita: jobs + consents + eventos ── */}
        <div>
          <ColTitle>Jobs ativos ({active.length})</ColTitle>
          <JobList jobs={active} />

          <div className="mt-8">
            <ColTitle>Histórico ({history.length})</ColTitle>
            <JobList jobs={history} muted />
          </div>

          <div className="mt-8">
            <ColTitle>Consentimentos</ColTitle>
            {latestConsents.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {latestConsents.map((c) => (
                  <li
                    key={c.consent_type}
                    className="text-sm flex items-baseline justify-between gap-3 border-b border-[color:var(--line)] pb-2"
                  >
                    <span>
                      {CONSENT_LABELS[c.consent_type] ?? c.consent_type}{' '}
                      <span className={c.granted ? '' : 'text-[color:var(--oxblood)]'}>
                        {c.granted ? '✓' : '✗'}
                      </span>
                      <span className="block text-xs text-[color:var(--granite)]">
                        {c.policy_version ?? '—'}
                        {c.valid_until
                          ? ` · vale até ${formatDateBR(c.valid_until)}`
                          : ''}
                      </span>
                    </span>
                    <span className="text-xs text-[color:var(--granite)] whitespace-nowrap">
                      {formatRelativeTime(c.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[color:var(--granite)]">Sem consentimentos.</p>
            )}
          </div>

          <div className="mt-8">
            <ColTitle>Últimos eventos</ColTitle>
            <EventList events={events} actorEmails={emails} />
          </div>
        </div>
      </div>
    </div>
  )
}

function JobList({ jobs, muted }: { jobs: JobRow[]; muted?: boolean }) {
  if (jobs.length === 0) {
    return <p className="text-sm text-[color:var(--granite)]">Nenhum.</p>
  }
  return (
    <ul className="flex flex-col">
      {jobs.map((j) => {
        const price = j.final_price ?? j.quoted_price
        return (
          <li key={j.id} className="border-b border-[color:var(--line)] py-3">
            <Link
              href={`/admin/jobs/${j.id}`}
              className={`block group ${muted ? 'text-[color:var(--granite)]' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm">
                  <span className="uppercase text-[11px] tracking-[0.08em]">
                    {STATUS_LABELS[j.status]}
                  </span>
                  {j.body_region ? ` · ${j.body_region}` : ''}
                </span>
                <span className="text-xs text-[color:var(--granite)] whitespace-nowrap tabular-nums">
                  {formatBRL(price)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 mt-0.5">
                <span className="text-xs text-[color:var(--granite)] truncate group-hover:underline underline-offset-4">
                  {truncate(j.description)}
                </span>
                <span className="text-xs text-[color:var(--granite)] whitespace-nowrap">
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
    <details className="mt-6">
      <summary className="text-xs uppercase tracking-[0.1em] text-[color:var(--granite)] cursor-pointer">
        extra_data
      </summary>
      <pre className="mt-2 text-xs bg-[color:var(--whisper)] p-3 rounded overflow-x-auto tabular-nums">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[color:var(--granite)]">{label}</dt>
      <dd className="tabular-nums text-right">{value}</dd>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/admin"
      className="text-sm text-[color:var(--granite)] hover:text-[color:var(--onyx)] transition-colors"
    >
      ← Fila
    </Link>
  )
}

function ColTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-[family-name:var(--font-fraunces)] text-lg mb-4 pb-2 border-b border-[color:var(--line)]">
      {children}
    </h2>
  )
}
