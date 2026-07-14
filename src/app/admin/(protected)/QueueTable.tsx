'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { updateJob } from '@/app/actions/admin-jobs'
import { JOB_STATUSES, type JobStatus } from '@/lib/domain/job-status'

export type QueueJob = {
  id: string
  displayName: string // nome, ou telefone formatado se não há nome
  phone: string // formatado BR (— se ausente)
  bodyRegion: string
  description: string // já truncado
  quotedPriceLabel: string // BRL ou —
  ageLabel: string // tempo relativo
  status: JobStatus
  finalPrice: number | null // cru, pro input
}

const STATUS_LABELS: Record<JobStatus, string> = {
  quoted: 'A orçar',
  confirmed: 'Confirmado',
  executed: 'Executado',
  cancelled: 'Cancelado',
  no_response: 'Sem resposta',
}

// Grid compartilhado entre cabeçalho e linhas pra manter as colunas alinhadas.
// Em telas estreitas colapsa pra uma coluna (cards empilhados).
const GRID =
  'grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_0.7fr_minmax(0,1.7fr)_0.8fr_0.8fr_1fr_0.9fr] md:items-center gap-x-3 gap-y-1'

export function QueueTable({ jobs }: { jobs: QueueJob[] }) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-[color:var(--granite)] py-3">Nada aqui.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="md:min-w-[720px]">
        <div
          className={`${GRID} hidden md:grid text-[11px] uppercase tracking-[0.1em] text-[color:var(--granite)] border-b border-[color:var(--line)] pb-2`}
        >
          <span>Cliente</span>
          <span>Região</span>
          <span>Descrição</span>
          <span>Orçado</span>
          <span>Idade</span>
          <span>Status</span>
          <span>Preço final</span>
        </div>

        <ul>
          {jobs.map((job) => (
            <QueueRow key={job.id} job={job} />
          ))}
        </ul>
      </div>
    </div>
  )
}

function QueueRow({ job }: { job: QueueJob }) {
  const initialFinal = job.finalPrice === null ? '' : String(job.finalPrice)

  const [status, setStatus] = useState<JobStatus>(job.status)
  const [finalPrice, setFinalPrice] = useState(initialFinal)
  // Baseline = valores salvos. Após um save bem-sucedido, viram os novos
  // valores atuais, então o botão Salvar some sem depender do re-render do
  // servidor.
  const [baseStatus, setBaseStatus] = useState<JobStatus>(job.status)
  const [baseFinal, setBaseFinal] = useState(initialFinal)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  const dirty =
    status !== baseStatus || finalPrice.trim() !== baseFinal.trim()

  function parseFinal(): { ok: true; value: number | null } | { ok: false } {
    const raw = finalPrice.trim()
    if (raw === '') return { ok: true, value: null }
    const n = Number(raw.replace(',', '.'))
    if (Number.isNaN(n) || n < 0) return { ok: false }
    return { ok: true, value: n }
  }

  function handleSave() {
    if (!dirty || saving) return
    setError(null)

    const parsed = parseFinal()
    if (!parsed.ok) {
      setError('Preço inválido.')
      return
    }

    const payload: {
      jobId: string
      status?: JobStatus
      finalPrice?: number | null
    } = { jobId: job.id }
    if (status !== baseStatus) payload.status = status
    if (finalPrice.trim() !== baseFinal.trim()) payload.finalPrice = parsed.value

    startSaving(async () => {
      const res = await updateJob(payload)
      if (res.status === 'ok') {
        // Sucesso: fixa o novo baseline. Se o grupo mudou, o revalidatePath
        // remonta esta linha no grupo certo com props novas; se não, o botão
        // Salvar apenas some, valores preservados.
        setBaseStatus(status)
        setBaseFinal(finalPrice.trim())
        setError(null)
      } else {
        // Erro: mensagem na linha, valores NÃO revertidos.
        setError(
          res.status === 'invalid' ? res.reason : 'Não deu pra salvar. Tenta de novo.'
        )
      }
    })
  }

  return (
    <li
      className={`${GRID} border-b border-[color:var(--line)] py-3 text-sm ${
        saving ? 'opacity-60' : ''
      }`}
    >
      <div className="min-w-0">
        <Link
          href={`/admin/jobs/${job.id}`}
          className="block truncate underline decoration-[color:var(--line)] underline-offset-4 hover:decoration-[color:var(--onyx)] transition-colors"
        >
          {job.displayName}
        </Link>
        <div className="text-xs text-[color:var(--granite)] tabular-nums">
          {job.phone}
        </div>
      </div>

      <Cell label="Região">{job.bodyRegion || '—'}</Cell>

      <Cell label="Descrição">
        <span className="text-[color:var(--granite)] md:text-[color:var(--onyx)]">
          {job.description}
        </span>
      </Cell>

      <Cell label="Orçado">
        <span className="tabular-nums">{job.quotedPriceLabel}</span>
      </Cell>

      <Cell label="Idade">
        <span className="text-[color:var(--granite)]">{job.ageLabel}</span>
      </Cell>

      <Cell label="Status">
        <select
          value={status}
          disabled={saving}
          onChange={(e) => setStatus(e.target.value as JobStatus)}
          className="w-full border-b border-[color:var(--line)] bg-transparent py-1 focus:outline-none focus:border-[color:var(--onyx)] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Cell>

      <Cell label="Preço final">
        <input
          type="text"
          inputMode="decimal"
          value={finalPrice}
          disabled={saving}
          placeholder="—"
          onChange={(e) => setFinalPrice(e.target.value)}
          className="w-full border-b border-[color:var(--line)] bg-transparent py-1 tabular-nums focus:outline-none focus:border-[color:var(--onyx)] transition-colors disabled:opacity-50"
        />
      </Cell>

      {(dirty || error) && (
        <div className="md:col-span-7 flex items-center justify-end gap-4 pt-2">
          {error && (
            <span className="text-xs text-[color:var(--oxblood)]" role="alert">
              {error}
            </span>
          )}
          {dirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="text-sm tracking-[0.04em] px-5 py-2 rounded-full bg-[color:var(--onyx)] text-[color:var(--white)] border border-[color:var(--onyx)] hover:bg-[color:var(--oxblood)] hover:border-[color:var(--oxblood)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          )}
        </div>
      )}
    </li>
  )
}

/**
 * Célula com rótulo que só aparece no mobile (md:hidden). No desktop os
 * cabeçalhos da tabela dão o contexto; no mobile cada campo precisa do seu.
 */
function Cell({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 flex justify-between gap-3 md:block">
      <span className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--granite)] md:hidden">
        {label}
      </span>
      <span className="min-w-0 text-right md:text-left">{children}</span>
    </div>
  )
}
