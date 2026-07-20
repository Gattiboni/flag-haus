import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { formatPhoneBR, formatRelativeTime } from '@/lib/format'
import { Alert, Card, CardHeader } from '@/components/ui'
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
        <Alert variant="warning" title="Não foi possível carregar o job agora" className="mt-fh-5">
          Recarrega a página em instantes.
        </Alert>
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

      <div className="mt-fh-4 grid grid-cols-1 lg:grid-cols-3 gap-fh-5 items-start">
        {/* ── Coluna esquerda: Job ── */}
        <Card as="section">
          <CardHeader
            title="Job"
            description={`criado ${formatRelativeTime(job.created_at)}`}
          />

          <div className="mb-fh-5">
            {person ? (
              <Link href={`/admin/people/${person.id}`}>{displayName}</Link>
            ) : (
              <span>{displayName}</span>
            )}
            <div className="fh-micro fh-tnum">{formatPhoneBR(person?.phone)}</div>
          </div>

          <JobDetail jobId={job.id} initial={initial} />

          {timestamps.length > 0 && (
            <dl className="mt-fh-5 flex flex-col gap-fh-1">
              {timestamps.map((t) => (
                <div key={t.label} className="flex justify-between gap-fh-3">
                  <dt className="fh-micro">{t.label}</dt>
                  <dd className="fh-tnum text-right">{formatDateTimeBR(t.at)}</dd>
                </div>
              ))}
            </dl>
          )}

          <ExtraData data={job.extra_data} />
        </Card>

        {/* ── Coluna central: Anamnese ── */}
        <Card as="section">
          <CardHeader title="Anamnese" />
          <Anamnese clinical={clinical} />
        </Card>

        {/* ── Coluna direita: Contexto ── */}
        <Card as="section">
          <CardHeader title="Contexto" />

          <SubTitle>Motivação</SubTitle>
          {motivation ? (
            <div className="mb-fh-5">
              <p>{motivation.content}</p>
              <p className="fh-micro">{formatRelativeTime(motivation.recorded_at)}</p>
            </div>
          ) : (
            <p className="fh-micro mb-fh-5">Sem motivação registrada.</p>
          )}

          <SubTitle>Consentimentos deste job</SubTitle>
          {consents.length > 0 ? (
            <ul className="mb-fh-5 flex flex-col gap-fh-2">
              {consents.map((c, i) => (
                <li
                  key={`${c.consent_type}-${i}`}
                  className="flex items-baseline justify-between gap-fh-3 border-b border-fh-subtle pb-fh-2"
                >
                  <span>
                    {CONSENT_LABELS[c.consent_type] ?? c.consent_type}{' '}
                    <span className={c.granted ? undefined : 'text-fh-accent'}>
                      {c.granted ? '✓' : '✗'}
                    </span>
                    {c.policy_version && (
                      <span className="fh-micro block">{c.policy_version}</span>
                    )}
                  </span>
                  <span className="fh-micro whitespace-nowrap">
                    {formatRelativeTime(c.granted_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fh-micro mb-fh-5">Sem consentimentos neste job.</p>
          )}

          <SubTitle>Últimos eventos</SubTitle>
          <EventList events={events} actorEmails={actorEmails} />
        </Card>
      </div>
    </div>
  )
}

// ── Anamnese ──────────────────────────────────────────────

function Anamnese({ clinical }: { clinical: ClinicalRow | null }) {
  if (!clinical) {
    return <p className="fh-micro">Anamnese não preenchida para esta sessão.</p>
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
    return <Alert variant="success" title="Anamnese sem alertas." />
  }

  return (
    <div className="flex flex-col gap-fh-3">
      {/*
        Alergia é o ÚNICO alerta em `critical` (Oxblood pleno): é o caso de
        segurança que não pode passar batido enquanto o Julio tatua. Os outros
        flags clínicos são `warning` (Terracota) — importantes, mas não podem
        competir com ele, senão nada mais salta.
      */}
      {clinical.has_allergies === true ? (
        <Alert
          variant="critical"
          title="Alergia registrada"
          icon={<AlertTriangle size={22} strokeWidth={1.5} />}
        >
          {clinical.allergies_detail?.trim() ||
            'Sem detalhe informado — confirme com o cliente antes de iniciar.'}
        </Alert>
      ) : (
        <NormalField label="Alergias" value="Não" />
      )}

      {clinical.takes_medication === true ? (
        <ClinicalFlag title="Medicação" detail={clinical.medications_detail} />
      ) : (
        <NormalField label="Medicação" value="Não" />
      )}

      {clinical.has_diabetes === true ? (
        <ClinicalFlag title="Diabetes" detail={null} />
      ) : (
        <NormalField label="Diabetes" value="Não" />
      )}

      {clinical.has_skin_condition === true ? (
        <ClinicalFlag title="Condição de pele" detail={clinical.skin_condition_detail} />
      ) : (
        <NormalField label="Condição de pele" value="Não" />
      )}

      {pregHigh ? (
        <ClinicalFlag
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

/** Flag clínico não-crítico: atenção, não alarme (Terracota). */
function ClinicalFlag({ title, detail }: { title: string; detail: string | null }) {
  return (
    <Alert variant="warning" title={title}>
      {detail?.trim() || 'Sem detalhe informado.'}
    </Alert>
  )
}

function NormalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-fh-3 border-b border-fh-subtle pb-fh-2">
      <span className="fh-micro">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

// ── Blocos auxiliares ─────────────────────────────────────

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

function BackLink() {
  return (
    <Link href="/admin" className="inline-flex items-center gap-fh-2 no-underline">
      <ArrowLeft size={18} strokeWidth={1.5} />
      Fila
    </Link>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="fh-eyebrow mb-fh-2">{children}</h3>
}
