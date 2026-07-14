'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'
import { toE164 } from '@/lib/utils/phone'
import { isEligibleAge } from '@/lib/utils/age'
import {
  LOCKABLE_FIELDS,
  COLUMN_FIELDS,
  type PersonField,
} from '@/app/admin/_ui/person-fields'

/**
 * Edição de pessoa pelo admin, com trava por campo (#4c §5-bis).
 *
 * Modelo: "admin ganha por padrão, com destrava explícita". Todo campo que o
 * admin muda de valor ganha uma entrada em `extra_data.admin_locks`. Enquanto a
 * chave existir, a intenção é que as RPCs `submit_*` NÃO sobrescrevam aquele
 * campo — mas essa parte depende de uma migration do Alan (Emenda C): **até ela
 * rodar, a trava só vive no lado do admin.** Nada nesta camada altera as RPCs.
 *
 * Nenhum campo clínico entra aqui (anamnese/consents/motivations são declarações
 * da pessoa sobre o próprio corpo — o admin não fala por ela).
 */

// Mesmo formato do CHECK people_email_format no banco.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function optionalText(max: number) {
  return z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length <= max, { message: `Máximo ${max} caracteres.` })
    .transform((s) => (s === '' ? null : s))
    .nullable()
    .optional()
}

const patchSchema = z
  .object({
    name: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s.length >= 1 && s.length <= 200, {
        message: 'Nome deve ter entre 1 e 200 caracteres.',
      }),
    email: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s === '' || EMAIL_RE.test(s), { message: 'E-mail inválido.' })
      .transform((s) => (s === '' ? null : s)),
    // Validação de E.164 real acontece no action (via toE164), aqui só o básico.
    phone: z.string().min(1),
    birth_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida.' })
      .refine((d) => isEligibleAge(d), { message: 'A pessoa precisa ter 18 anos completos.' }),
    document_type: z.enum(['cpf', 'rg', 'cnh']).nullable(),
    document_number: optionalText(30),
    neighborhood: optionalText(100),
    city: optionalText(100),
    instagram: optionalText(100),
    occupation: optionalText(100),
    preferred_channel: z
      .enum(['whatsapp', 'email', 'instagram', 'tanto_faz'])
      .nullable(),
  })
  .partial()

export type UpdatePersonInput = {
  personId: string
  patch: Record<string, unknown>
}

export type UpdatePersonResult =
  | { status: 'ok'; lockedNow: PersonField[] }
  | { status: 'invalid'; reason: string }
  | { status: 'error'; message: string }

type AdminLock = { locked_at: string; locked_by: string }
type ExtraData = Record<string, unknown> & {
  admin_locks?: Record<string, AdminLock>
}

/** null/undefined/'' colapsam pro mesmo "vazio" na comparação de mudança. */
function norm(v: unknown): unknown {
  return v === undefined || v === '' ? null : v
}
function changedValue(next: unknown, current: unknown): boolean {
  return norm(next) !== norm(current)
}

export async function updatePerson(
  input: UpdatePersonInput
): Promise<UpdatePersonResult> {
  const { userId } = await requireOperator()

  const personId = z.string().uuid().safeParse(input?.personId)
  if (!personId.success) {
    return { status: 'invalid', reason: 'Pessoa inválida.' }
  }

  const parsed = patchSchema.safeParse(input?.patch ?? {})
  if (!parsed.success) {
    console.warn('[updatePerson] invalid patch:', parsed.error.message)
    return { status: 'invalid', reason: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }
  const patch = parsed.data

  // Normaliza o telefone pra E.164 aqui (a chave do upsert do form).
  let phoneE164: string | undefined
  if (patch.phone !== undefined) {
    const e164 = toE164(patch.phone, 'BR')
    if (!e164) {
      return {
        status: 'invalid',
        reason: 'Telefone inválido — confere o DDD e a quantidade de dígitos?',
      }
    }
    phoneE164 = e164
  }

  try {
    const admin = createAdminClient()

    const { data: current, error: readErr } = await admin
      .from('people')
      .select('id, name, email, phone, birth_date, extra_data, deleted_at')
      .eq('id', personId.data)
      .maybeSingle()

    if (readErr) {
      console.error('[updatePerson] read error:', readErr.message)
      return { status: 'error', message: readErr.message }
    }
    if (!current || current.deleted_at) {
      return { status: 'error', message: 'Pessoa não encontrada.' }
    }

    const extra: ExtraData = { ...((current.extra_data as ExtraData | null) ?? {}) }
    const columnUpdate: Record<string, unknown> = {}
    const changed: Record<string, unknown> = {}
    const from: Record<string, unknown> = {}
    const lockedNow: PersonField[] = []

    // Valores normalizados do patch, indexados por campo.
    const patchValues: Partial<Record<PersonField, unknown>> = {
      ...patch,
      ...(phoneE164 !== undefined ? { phone: phoneE164 } : {}),
    }

    const isColumn = (f: PersonField) => (COLUMN_FIELDS as readonly string[]).includes(f)

    for (const field of LOCKABLE_FIELDS) {
      if (!(field in patchValues)) continue
      const next = patchValues[field] ?? null

      const currentValue = isColumn(field)
        ? (current as Record<string, unknown>)[field] ?? null
        : extra[field] ?? null

      if (!changedValue(next, currentValue)) continue

      if (isColumn(field)) {
        columnUpdate[field] = next
      } else {
        extra[field] = next
      }
      changed[field] = next
      from[field] = currentValue ?? null
      lockedNow.push(field)
    }

    if (lockedNow.length === 0) {
      revalidatePath(`/admin/people/${personId.data}`)
      revalidatePath('/admin')
      return { status: 'ok', lockedNow: [] }
    }

    // Carimba/atualiza o lock de cada campo que mudou. Campos não editados
    // preservam o lock que já tinham (não são tocados).
    const now = new Date().toISOString()
    const locks: Record<string, AdminLock> = { ...(extra.admin_locks ?? {}) }
    for (const field of lockedNow) {
      locks[field] = { locked_at: now, locked_by: userId }
    }
    extra.admin_locks = locks

    const { error: writeErr } = await admin
      .from('people')
      .update({ ...columnUpdate, extra_data: extra })
      .eq('id', personId.data)
      .is('deleted_at', null)

    if (writeErr) {
      console.error('[updatePerson] write error:', writeErr.message)
      return { status: 'error', message: writeErr.message }
    }

    const { error: auditErr } = await admin.from('events').insert({
      person_id: personId.data,
      event_type: 'admin.person_updated',
      source: 'admin',
      actor_id: userId,
      payload: { changed, from, locked_now: lockedNow },
    })
    if (auditErr) {
      console.error('[updatePerson] audit insert failed:', auditErr.message)
    }

    revalidatePath(`/admin/people/${personId.data}`)
    revalidatePath('/admin')
    return { status: 'ok', lockedNow }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[updatePerson] throw:', msg)
    return { status: 'error', message: msg }
  }
}

export type UnlockFieldInput = { personId: string; field: string }
export type UnlockFieldResult =
  | { status: 'ok' }
  | { status: 'invalid'; reason: string }
  | { status: 'error'; message: string }

/**
 * Remove a trava de UM campo. A próxima submissão do formulário volta a poder
 * sobrescrever aquele campo (depois da migration da Emenda C). Não altera o
 * valor — só a chave em `admin_locks`.
 */
export async function unlockField(
  input: UnlockFieldInput
): Promise<UnlockFieldResult> {
  const { userId } = await requireOperator()

  const personId = z.string().uuid().safeParse(input?.personId)
  if (!personId.success) {
    return { status: 'invalid', reason: 'Pessoa inválida.' }
  }
  const field = z.enum(LOCKABLE_FIELDS).safeParse(input?.field)
  if (!field.success) {
    return { status: 'invalid', reason: 'Campo inválido.' }
  }

  try {
    const admin = createAdminClient()

    const { data: current, error: readErr } = await admin
      .from('people')
      .select('id, extra_data, deleted_at')
      .eq('id', personId.data)
      .maybeSingle()

    if (readErr) {
      console.error('[unlockField] read error:', readErr.message)
      return { status: 'error', message: readErr.message }
    }
    if (!current || current.deleted_at) {
      return { status: 'error', message: 'Pessoa não encontrada.' }
    }

    const extra: ExtraData = { ...((current.extra_data as ExtraData | null) ?? {}) }
    const locks: Record<string, AdminLock> = { ...(extra.admin_locks ?? {}) }

    if (!(field.data in locks)) {
      // Já estava destravado: nada a fazer, sem gravar nem auditar.
      return { status: 'ok' }
    }

    delete locks[field.data]
    extra.admin_locks = locks

    const { error: writeErr } = await admin
      .from('people')
      .update({ extra_data: extra })
      .eq('id', personId.data)
      .is('deleted_at', null)

    if (writeErr) {
      console.error('[unlockField] write error:', writeErr.message)
      return { status: 'error', message: writeErr.message }
    }

    const { error: auditErr } = await admin.from('events').insert({
      person_id: personId.data,
      event_type: 'admin.person_field_unlocked',
      source: 'admin',
      actor_id: userId,
      payload: { field: field.data },
    })
    if (auditErr) {
      console.error('[unlockField] audit insert failed:', auditErr.message)
    }

    revalidatePath(`/admin/people/${personId.data}`)
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[unlockField] throw:', msg)
    return { status: 'error', message: msg }
  }
}
