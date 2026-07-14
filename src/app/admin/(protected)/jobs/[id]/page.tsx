import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatBRL, formatPhoneBR, formatRelativeTime } from '@/lib/format'
import { formatDateTimeBR } from '@/app/admin/_ui/format'
import {
  EventList,
  resolveActorEmails,
  type AdminEvent,
} from '@/app/admin/_ui/events'
import { JobDetail, type JobEditable } from './JobDetail'
import type { JobStatus } from '@/lib/domain/job-status'

/**
 * Detalhe do job (#4c §3). Server Component atrás do gate. A razão de existir da
 * tela é a coluna central — a anamnese que o Julio lê antes de tatuar. Contraste
 * alto nos alertas clínicos é requisito de segurança, não de estética.
 */

type PersonJoin = { id: string; name: string | null; phone: string | null }

type ClinicalRow = {
  has_allergies: boolean | null
  allergies_detail: string | null
  takes_medication: boolean | null
  medications_detail: string | null
  has_diabetes: boolean | null
  has_skin_condition: boolean | null
  skin_condition_detail: string | null
  pregnancy_status: string | null
  health_notes: string | null
  recent_substances: string | null
  filled_at: string | null
}

type ConsentRow = {
  consent_type: string
  granted: boolean
  policy_version: string | null
  granted_at: string
}

type MotivationRow = { content: string; recorded_at: string }

type JobRow = {
  id: string
  person_id: string
  status: JobStatus
  quoted_price: number | string | null
  final_price: number | string | null
  quoted_at: string | null
  confirmed_at: string | null
  executed_at: string | null
  cancelled_at: string | null
  description: string | null
  body_region: string | null
  style: string | null
  size_cm: number | string | null
  extra_data: Record<string, unknown> | null
  created_at: string
  people: PersonJoin | PersonJoin[] | null
  clinical_records: ClinicalRow[] | null
  consents: ConsentRow[] | null
  motivations: MotivationRow[] | null
}

const PREGNANCY_LABELS: Record<string, string> = {
  pregnant: 'Gestante',
  breastfeeding: 'Amamentando',
  no: 'Não',
  prefer_not_say: 'Prefere não dizer',
  not_applicable: 'Não se aplica',
}

const SUBSTANCE_LABELS: Record<string, string> = {
  will_not: 'Não pretende',
  will: 'Pretende',
  discuss_in_session: 'Vai conversar na hora',
}

const CONSENT_LABELS: Record<string, string> = {
  procedure: 'Procedimento',
  health: 'Saúde',
  lgpd: 'LGPD',
  image: 'Imagem',
  marketing: 'Marketing',
}

function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isNaN(n) ? null : n
}

function onePerson(row: JobRow): PersonJoin | null {
  const p = Array.isArray(row.people) ? row.people[0] : row.people
  return p ?? null
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireOperator()

  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('jobs')
    .select(
      `id, person_id, status, quoted_price, final_price,
       quoted_at, confirmed_at, executed_at, cancelled_at,
       description, body_region, style, size_cm, extra_data, created_at,
       people ( id, name, phone ),
       clinical_records ( has_allergies, allergies_detail, takes_medication, medications_detail, has_diabetes, has_skin_condition, skin_condition_detail, pregnancy_status, health_notes, recent_substances, filled_at ),
       consents ( consent_type, granted, policy_version, granted_at ),
       motivations ( content, recorded_at )`
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    console.error('[admin/job] load failed:', error.message)
    return (
      <div>
        <BackLink />
        <p className="mt-6 text-sm text-[color:var(--oxblood)]" role="alert">
          Não foi possível carregar o job agora.
        </p>
      </div>
    )
  }

  if (!data) notFound()
  const job = data as unknown as JobRow

  const { data: eventsData } = await admin
    .from('events')
    .select('id, event_type, actor_id, occurred_at')
    .eq('job_id', id)
    .order('occurred_at', { ascending: false })
    .limit(20)

  const events = (eventsData ?? []) as AdminEvent[]
  const actorEmails = await resolveActorEmails(admin, events)

  const person = onePerson(job)
  const displayName = person?.name?.trim() || formatPhoneBR(person?.phone)

  const clinical =
    [...(job.clinical_records ?? [])].sort((a, b) =>
      (b.filled_at ?? '').localeCompare(a.filled_at ?? '')
    )[0] ?? null

  const motivation =
    [...(job.motivations ?? [])].sort((a, b) =>
      (b.recorded_at ?? '').localeCompare(a.recorded_at ?? '')
    )[0] ?? null

  const consents = [...(job.consents ?? [])].sort((a, b) =>
    (b.granted_at ?? '').localeCompare(a.granted_at ?? '')
  )

  const initial: JobEditable = {
    status: job.status,
    quotedPrice: toNum(job.quoted_price),
    finalPrice: toNum(job.final_price),
    bodyRegion: job.body_region,
    description: job.description,
    style: job.style,
    sizeCm: toNum(job.size_cm),
  }

  const timestamps: Array<{ label: string; at: string | null }> = [
    { label: 'Orçado em', at: job.quoted_at },
    { label: 'Confirmado em', at: job.confirmed_at },
    { label: 'Executado em', at: job.executed_at },
    { label: 'Cancelado em', at: job.cancelled_at },
  ].filter((t) => t.at)

  return (
    <div>
      <BackLink />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* ── Coluna esquerda: Job ── */}
        <section>
          <ColTitle>Job</ColTitle>
          <div className="mb-6">
            {person ? (
              <Link
                href={`/admin/people/${person.id}`}
                className="text-lg underline decoration-[color:var(--line)] underline-offset-4 hover:decoration-[color:var(--onyx)] transition-colors"
              >
                {displayName}
              </Link>
            ) : (
              <span className="text-lg">{displayName}</span>
            )}
            <div className="text-sm text-[color:var(--granite)] tabular-nums mt-1">
              {formatPhoneBR(person?.phone)}
            </div>
            <div className="text-xs text-[color:var(--granite)] mt-0.5">
              criado {formatRelativeTime(job.created_at)}
            </div>
          </div>

          <JobDetail jobId={job.id} initial={initial} />

          {timestamps.length > 0 && (
            <dl className="mt-6 flex flex-col gap-1 text-sm">
              {timestamps.map((t) => (
                <div key={t.label} className="flex justify-between gap-3">
                  <dt className="text-[color:var(--granite)]">{t.label}</dt>
                  <dd className="tabular-nums text-right">{formatDateTimeBR(t.at)}</dd>
                </div>
              ))}
            </dl>
          )}

          <ExtraData data={job.extra_data} />
        </section>

        {/* ── Coluna central: Anamnese ── */}
        <section>
          <ColTitle>Anamnese</ColTitle>
          <Anamnese clinical={clinical} />
        </section>

        {/* ── Coluna direita: Contexto ── */}
        <section>
          <ColTitle>Contexto</ColTitle>

          <SubTitle>Motivação</SubTitle>
          {motivation ? (
            <div className="mb-6 text-sm">
              <p>{motivation.content}</p>
              <p className="text-xs text-[color:var(--granite)] mt-1">
                {formatRelativeTime(motivation.recorded_at)}
              </p>
            </div>
          ) : (
            <p className="mb-6 text-sm text-[color:var(--granite)]">Sem motivação registrada.</p>
          )}

          <SubTitle>Consentimentos deste job</SubTitle>
          {consents.length > 0 ? (
            <ul className="mb-6 flex flex-col gap-2">
              {consents.map((c, i) => (
                <li
                  key={`${c.consent_type}-${i}`}
                  className="text-sm flex items-baseline justify-between gap-3 border-b border-[color:var(--line)] pb-2"
                >
                  <span>
                    {CONSENT_LABELS[c.consent_type] ?? c.consent_type}{' '}
                    <span className={c.granted ? '' : 'text-[color:var(--oxblood)]'}>
                      {c.granted ? '✓' : '✗'}
                    </span>
                    {c.policy_version && (
                      <span className="block text-xs text-[color:var(--granite)]">
                        {c.policy_version}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-[color:var(--granite)] whitespace-nowrap">
                    {formatRelativeTime(c.granted_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-6 text-sm text-[color:var(--granite)]">Sem consentimentos neste job.</p>
          )}

          <SubTitle>Últimos eventos</SubTitle>
          <EventList events={events} actorEmails={actorEmails} />
        </section>
      </div>
    </div>
  )
}

// ── Anamnese ──────────────────────────────────────────────

function Anamnese({ clinical }: { clinical: ClinicalRow | null }) {
  if (!clinical) {
    return (
      <p className="text-sm text-[color:var(--granite)]">
        Anamnese não preenchida para esta sessão.
      </p>
    )
  }

  const pregHigh =
    clinical.pregnancy_status === 'pregnant' ||
    clinical.pregnancy_status === 'breastfeeding'

  const noFlags =
    clinical.has_allergies !== true &&
    clinical.takes_medication !== true &&
    clinical.has_diabetes !== true &&
    clinical.has_skin_condition !== true
  const pregClear =
    clinical.pregnancy_status === 'no' ||
    clinical.pregnancy_status === 'not_applicable' ||
    clinical.pregnancy_status === 'prefer_not_say' ||
    clinical.pregnancy_status == null
  const substancesClear = clinical.recent_substances === 'will_not'
  const notesEmpty = !clinical.health_notes?.trim()

  if (noFlags && pregClear && substancesClear && notesEmpty) {
    return (
      <span className="inline-block text-sm text-[color:var(--granite)] border border-[color:var(--line)] rounded-full px-3 py-1">
        Anamnese sem alertas.
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {clinical.has_allergies === true ? (
        <AlertCard title="Alergias" detail={clinical.allergies_detail} />
      ) : (
        <NormalField label="Alergias" value="Não" />
      )}

      {clinical.takes_medication === true ? (
        <AlertCard title="Medicação" detail={clinical.medications_detail} />
      ) : (
        <NormalField label="Medicação" value="Não" />
      )}

      {clinical.has_diabetes === true ? (
        <AlertCard title="Diabetes" detail={null} />
      ) : (
        <NormalField label="Diabetes" value="Não" />
      )}

      {clinical.has_skin_condition === true ? (
        <AlertCard title="Condição de pele" detail={clinical.skin_condition_detail} />
      ) : (
        <NormalField label="Condição de pele" value="Não" />
      )}

      {pregHigh ? (
        <AlertCard
          title="Gravidez"
          detail={PREGNANCY_LABELS[clinical.pregnancy_status ?? ''] ?? clinical.pregnancy_status}
        />
      ) : (
        <NormalField
          label="Gravidez"
          value={PREGNANCY_LABELS[clinical.pregnancy_status ?? ''] ?? '—'}
        />
      )}

      <NormalField
        label="Substâncias (24h)"
        value={SUBSTANCE_LABELS[clinical.recent_substances ?? ''] ?? '—'}
      />

      {clinical.health_notes?.trim() && (
        <NormalField label="Anotações gerais" value={clinical.health_notes} />
      )}

      <NormalField label="Preenchida em" value={formatDateTimeBR(clinical.filled_at)} />
    </div>
  )
}

function AlertCard({ title, detail }: { title: string; detail: string | null }) {
  return (
    <div
      className="border-2 border-[color:var(--oxblood)] rounded-md px-4 py-3"
      style={{ backgroundColor: 'color-mix(in srgb, var(--oxblood) 6%, var(--white))' }}
    >
      <div className="text-[11px] uppercase tracking-[0.1em] font-medium text-[color:var(--oxblood)]">
        ⚠ {title}
      </div>
      {detail && (
        <p className="mt-1 text-base font-medium text-[color:var(--onyx)]">{detail}</p>
      )}
    </div>
  )
}

function NormalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm flex items-baseline justify-between gap-3 border-b border-[color:var(--line)] pb-1.5">
      <span className="text-[color:var(--granite)]">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

// ── Blocos auxiliares ─────────────────────────────────────

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

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--granite)] mb-2">
      {children}
    </h3>
  )
}
