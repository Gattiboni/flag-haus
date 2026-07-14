'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'
import { JOB_STATUSES } from '@/lib/domain/job-status'

/**
 * Texto opcional com trim + limite de tamanho. Vazio (após trim) vira null:
 * limpar o campo apaga o valor no banco (colunas são nullable). O client pode
 * mandar a string atual do input; o server é quem normaliza.
 */
function optionalText(max: number) {
  return z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length <= max, { message: `Máximo ${max} caracteres.` })
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional()
}

const updateJobSchema = z
  .object({
    jobId: z.string().uuid(),
    status: z.enum(JOB_STATUSES).optional(),
    // vazio (null) é válido em todos os preços: o Julio pode apagar.
    quotedPrice: z.number().nonnegative().nullable().optional(),
    finalPrice: z.number().nonnegative().nullable().optional(),
    bodyRegion: optionalText(200),
    description: optionalText(2000),
    style: optionalText(100),
    // size_cm > 0 (0 não faz sentido pra uma tatuagem).
    sizeCm: z.number().positive().nullable().optional(),
  })
  .refine(
    (v) =>
      v.status !== undefined ||
      v.quotedPrice !== undefined ||
      v.finalPrice !== undefined ||
      v.bodyRegion !== undefined ||
      v.description !== undefined ||
      v.style !== undefined ||
      v.sizeCm !== undefined,
    { message: 'Nada para atualizar.' }
  )

export type UpdateJobInput = z.input<typeof updateJobSchema>

export type UpdateJobResult =
  | { status: 'ok' }
  | { status: 'invalid'; reason: string }
  | { status: 'error'; message: string }

/**
 * Edição do job — inline na fila (#4b) e no detalhe (#4c §4). Atualiza os campos
 * editáveis e, quando o status muda ou o preço orçado surge, carimba o timestamp
 * correspondente SE ele ainda for null (nunca sobrescreve um fato histórico já
 * registrado).
 *
 * O servidor decide os carimbos, não o cliente. E toda alteração vira uma linha
 * em `events` com o `actor_id` de quem editou (rastreabilidade de dado sensível
 * — recomendação ANPD).
 */
export async function updateJob(
  raw: UpdateJobInput
): Promise<UpdateJobResult> {
  // SEMPRE a primeira linha. Sem exceção.
  const { userId } = await requireOperator()

  const parsed = updateJobSchema.safeParse(raw)
  if (!parsed.success) {
    console.warn('[updateJob] invalid payload:', parsed.error.message)
    return { status: 'invalid', reason: 'Dados inválidos.' }
  }
  const { jobId, status, quotedPrice, finalPrice, bodyRegion, description, style, sizeCm } =
    parsed.data

  try {
    const admin = createAdminClient()

    // Lê o estado atual: precisa dos timestamps pra decidir o que carimbar sem
    // sobrescrever, e dos valores atuais pra evitar update fantasma.
    const { data: current, error: readErr } = await admin
      .from('jobs')
      .select(
        'id, person_id, status, quoted_price, final_price, body_region, description, style, size_cm, quoted_at, confirmed_at, executed_at, cancelled_at, deleted_at'
      )
      .eq('id', jobId)
      .maybeSingle()

    if (readErr) {
      console.error('[updateJob] read error:', readErr.message)
      return { status: 'error', message: readErr.message }
    }
    if (!current || current.deleted_at) {
      // Não existe ou está deletado: erro, nunca update silencioso.
      return { status: 'error', message: 'Job não encontrado.' }
    }

    const now = new Date().toISOString()
    const update: Record<string, unknown> = {}
    const changed: Record<string, unknown> = {}
    const from: Record<string, unknown> = {}

    if (status !== undefined && status !== current.status) {
      update.status = status
      changed.status = status
      from.status = current.status

      // Carimbo por status, só se ainda null (§4).
      if (status === 'confirmed' && current.confirmed_at == null) {
        update.confirmed_at = now
      } else if (status === 'executed' && current.executed_at == null) {
        update.executed_at = now
      } else if (status === 'cancelled' && current.cancelled_at == null) {
        update.cancelled_at = now
      }
    }

    if (
      quotedPrice !== undefined &&
      !numericEq(quotedPrice, current.quoted_price)
    ) {
      update.quoted_price = quotedPrice
      changed.quoted_price = quotedPrice
      from.quoted_price = current.quoted_price

      // Carimba quoted_at quando o preço orçado SAI de null → valor, e só se
      // quoted_at ainda for null (§4). Nunca reescreve (guarda dupla).
      if (
        quotedPrice !== null &&
        toNum(current.quoted_price) === null &&
        current.quoted_at == null
      ) {
        update.quoted_at = now
      }
    }

    if (finalPrice !== undefined && !numericEq(finalPrice, current.final_price)) {
      update.final_price = finalPrice
      changed.final_price = finalPrice
      from.final_price = current.final_price
      // `final_price` não dispara carimbo nenhum.
    }

    if (bodyRegion !== undefined && bodyRegion !== (current.body_region ?? null)) {
      update.body_region = bodyRegion
      changed.body_region = bodyRegion
      from.body_region = current.body_region
    }

    if (description !== undefined && description !== (current.description ?? null)) {
      update.description = description
      changed.description = description
      from.description = current.description
    }

    if (style !== undefined && style !== (current.style ?? null)) {
      update.style = style
      changed.style = style
      from.style = current.style
    }

    if (sizeCm !== undefined && !numericEq(sizeCm, current.size_cm)) {
      update.size_cm = sizeCm
      changed.size_cm = sizeCm
      from.size_cm = current.size_cm
    }

    if (Object.keys(update).length === 0) {
      // Nada mudou de fato (mesmo valor que já estava). Não grava nem audita.
      revalidatePath('/admin')
      revalidatePath(`/admin/jobs/${jobId}`)
      return { status: 'ok' }
    }

    const { error: writeErr } = await admin
      .from('jobs')
      .update(update)
      .eq('id', jobId)
      .is('deleted_at', null)

    if (writeErr) {
      console.error('[updateJob] write error:', writeErr.message)
      return { status: 'error', message: writeErr.message }
    }

    // Auditoria (§4). Falha aqui não desfaz o update já gravado, mas é
    // registrada — o dado sensível não pode ficar sem rastro silenciosamente.
    const { error: auditErr } = await admin.from('events').insert({
      person_id: current.person_id,
      job_id: jobId,
      event_type: 'admin.job_updated',
      source: 'admin',
      actor_id: userId,
      payload: { changed, from },
    })
    if (auditErr) {
      console.error('[updateJob] audit insert failed:', auditErr.message)
    }

    // A fila pode ter mudado (status/preço) e o próprio detalhe também.
    revalidatePath('/admin')
    revalidatePath(`/admin/jobs/${jobId}`)
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[updateJob] throw:', msg)
    return { status: 'error', message: msg }
  }
}

/** Postgres numeric chega do PostgREST como number ou string; normaliza. */
function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isNaN(n) ? null : n
}

/**
 * Compara o novo número (number|null) com o valor atual do banco, que pode vir
 * como string (numeric do PostgREST). Evita "update fantasma" quando o Julio
 * salva sem ter mexido no campo.
 */
function numericEq(
  next: number | null,
  current: number | string | null | undefined
): boolean {
  const cur = toNum(current)
  if (next === null && cur === null) return true
  if (next === null || cur === null) return false
  return next === cur
}
