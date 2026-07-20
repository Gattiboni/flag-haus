'use client'

import { useState, useTransition } from 'react'
import { updateJob, type UpdateJobInput } from '@/app/actions/admin-jobs'
import { JOB_STATUSES, type JobStatus } from '@/lib/domain/job-status'
import { Button, Input, Select, Textarea } from '@/components/ui'

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
    <div className="flex flex-col gap-fh-4">
      <Select
        label="Status"
        value={status}
        disabled={saving}
        onChange={(e) => setStatus(e.target.value as JobStatus)}
        options={JOB_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
      />

      <div className="grid grid-cols-2 gap-fh-4">
        <Input
          label="Orçado"
          prefix="R$"
          type="text"
          inputMode="decimal"
          placeholder="—"
          value={quotedPrice}
          disabled={saving}
          onChange={(e) => setQuotedPrice(e.target.value)}
        />
        <Input
          label="Final"
          prefix="R$"
          type="text"
          inputMode="decimal"
          placeholder="—"
          value={finalPrice}
          disabled={saving}
          onChange={(e) => setFinalPrice(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-fh-4">
        <Input
          label="Região do corpo"
          type="text"
          placeholder="—"
          value={bodyRegion}
          disabled={saving}
          onChange={(e) => setBodyRegion(e.target.value)}
        />
        <Input
          label="Tamanho"
          suffix="cm"
          type="text"
          inputMode="decimal"
          placeholder="—"
          value={sizeCm}
          disabled={saving}
          onChange={(e) => setSizeCm(e.target.value)}
        />
      </div>

      <Input
        label="Estilo"
        type="text"
        placeholder="—"
        value={style}
        disabled={saving}
        onChange={(e) => setStyle(e.target.value)}
      />

      <Textarea
        label="Descrição"
        rows={3}
        value={description}
        disabled={saving}
        onChange={(e) => setDescription(e.target.value)}
      />

      {(dirty || error) && (
        <div className="flex items-center justify-end gap-fh-3">
          {error && (
            <span className="fh-error" role="alert">
              {error}
            </span>
          )}
          {dirty && (
            <Button size="sm" onClick={handleSave} loading={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
