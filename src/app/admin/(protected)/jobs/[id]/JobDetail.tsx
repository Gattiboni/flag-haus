'use client'

import { useState, useTransition } from 'react'
import { updateJob, type UpdateJobInput } from '@/app/actions/admin-jobs'
import { JOB_STATUSES, type JobStatus } from '@/lib/domain/job-status'

/**
 * Bloco editável do detalhe do job (#4c §4). Mesmo padrão da fila (#4b): estado
 * de baseline por campo, botão Salvar só aparece quando algo mudou, salva tudo
 * numa chamada. O servidor decide carimbos e auditoria.
 */

const STATUS_LABELS: Record<JobStatus, string> = {
  quoted: 'A orçar',
  confirmed: 'Confirmado',
  executed: 'Executado',
  cancelled: 'Cancelado',
  no_response: 'Sem resposta',
}

export type JobEditable = {
  status: JobStatus
  quotedPrice: number | null
  finalPrice: number | null
  bodyRegion: string | null
  description: string | null
  style: string | null
  sizeCm: number | null
}

function numToStr(n: number | null): string {
  return n === null ? '' : String(n)
}
function strToNull(s: string | null): string {
  return s ?? ''
}

type NumParse = { ok: true; value: number | null } | { ok: false }
function parseNum(raw: string, positive: boolean): NumParse {
  const t = raw.trim()
  if (t === '') return { ok: true, value: null }
  const n = Number(t.replace(',', '.'))
  if (Number.isNaN(n)) return { ok: false }
  if (positive ? n <= 0 : n < 0) return { ok: false }
  return { ok: true, value: n }
}

export function JobDetail({
  jobId,
  initial,
}: {
  jobId: string
  initial: JobEditable
}) {
  const [status, setStatus] = useState<JobStatus>(initial.status)
  const [quotedPrice, setQuotedPrice] = useState(numToStr(initial.quotedPrice))
  const [finalPrice, setFinalPrice] = useState(numToStr(initial.finalPrice))
  const [bodyRegion, setBodyRegion] = useState(strToNull(initial.bodyRegion))
  const [description, setDescription] = useState(strToNull(initial.description))
  const [style, setStyle] = useState(strToNull(initial.style))
  const [sizeCm, setSizeCm] = useState(numToStr(initial.sizeCm))

  // Baseline = último valor salvo. Após salvar, vira o novo atual.
  const [base, setBase] = useState({
    status: initial.status,
    quotedPrice: numToStr(initial.quotedPrice),
    finalPrice: numToStr(initial.finalPrice),
    bodyRegion: strToNull(initial.bodyRegion),
    description: strToNull(initial.description),
    style: strToNull(initial.style),
    sizeCm: numToStr(initial.sizeCm),
  })

  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  const dirty =
    status !== base.status ||
    quotedPrice.trim() !== base.quotedPrice.trim() ||
    finalPrice.trim() !== base.finalPrice.trim() ||
    bodyRegion.trim() !== base.bodyRegion.trim() ||
    description.trim() !== base.description.trim() ||
    style.trim() !== base.style.trim() ||
    sizeCm.trim() !== base.sizeCm.trim()

  function handleSave() {
    if (!dirty || saving) return
    setError(null)

    const payload: UpdateJobInput = { jobId }

    if (status !== base.status) payload.status = status

    if (quotedPrice.trim() !== base.quotedPrice.trim()) {
      const p = parseNum(quotedPrice, false)
      if (!p.ok) return setError('Preço orçado inválido.')
      payload.quotedPrice = p.value
    }
    if (finalPrice.trim() !== base.finalPrice.trim()) {
      const p = parseNum(finalPrice, false)
      if (!p.ok) return setError('Preço final inválido.')
      payload.finalPrice = p.value
    }
    if (sizeCm.trim() !== base.sizeCm.trim()) {
      const p = parseNum(sizeCm, true)
      if (!p.ok) return setError('Tamanho inválido (deve ser maior que zero).')
      payload.sizeCm = p.value
    }
    if (bodyRegion.trim() !== base.bodyRegion.trim()) payload.bodyRegion = bodyRegion
    if (description.trim() !== base.description.trim()) payload.description = description
    if (style.trim() !== base.style.trim()) payload.style = style

    startSaving(async () => {
      const res = await updateJob(payload)
      if (res.status === 'ok') {
        setBase({
          status,
          quotedPrice: quotedPrice.trim(),
          finalPrice: finalPrice.trim(),
          bodyRegion: bodyRegion.trim(),
          description: description.trim(),
          style: style.trim(),
          sizeCm: sizeCm.trim(),
        })
        setError(null)
      } else {
        setError(
          res.status === 'invalid'
            ? res.reason
            : 'Não deu pra salvar. Tenta de novo.'
        )
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Status">
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
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Orçado (R$)">
          <TextInput
            value={quotedPrice}
            onChange={setQuotedPrice}
            disabled={saving}
            numeric
          />
        </Field>
        <Field label="Final (R$)">
          <TextInput
            value={finalPrice}
            onChange={setFinalPrice}
            disabled={saving}
            numeric
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Região do corpo">
          <TextInput value={bodyRegion} onChange={setBodyRegion} disabled={saving} />
        </Field>
        <Field label="Tamanho (cm)">
          <TextInput value={sizeCm} onChange={setSizeCm} disabled={saving} numeric />
        </Field>
      </div>

      <Field label="Estilo">
        <TextInput value={style} onChange={setStyle} disabled={saving} />
      </Field>

      <Field label="Descrição">
        <textarea
          value={description}
          disabled={saving}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border-b border-[color:var(--line)] bg-transparent py-1 focus:outline-none focus:border-[color:var(--onyx)] transition-colors disabled:opacity-50 resize-y"
        />
      </Field>

      {(dirty || error) && (
        <div className="flex items-center justify-end gap-4 pt-1">
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
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--granite)]">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function TextInput({
  value,
  onChange,
  disabled,
  numeric,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
  numeric?: boolean
}) {
  return (
    <input
      type="text"
      inputMode={numeric ? 'decimal' : undefined}
      value={value}
      disabled={disabled}
      placeholder="—"
      onChange={(e) => onChange(e.target.value)}
      className={`w-full border-b border-[color:var(--line)] bg-transparent py-1 focus:outline-none focus:border-[color:var(--onyx)] transition-colors disabled:opacity-50 ${
        numeric ? 'tabular-nums' : ''
      }`}
    />
  )
}
