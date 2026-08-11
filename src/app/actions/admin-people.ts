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
import { CADASTROS_PATH } from '@/app/admin/_ui/cadastros'

/**
 * Edição de pessoa pelo admin, com trava por campo (#4c §5-bis).
 *
 * Modelo: "admin ganha por padrão, com destrava explícita". Todo campo que o
 * admin muda de valor ganha uma entrada em `extra_data.admin_locks`. Enquanto a
 * chave existir, as RPCs `submit_cadastro`/`submit_anamnese` NÃO sobrescrevem
 * aquele campo — a trava vale ponta a ponta, não só no admin:
 *
 * - chaves de `extra_data`: subtraídas do patch do formulário antes do merge;
 * - colunas diretas (`name`, `email`, `birth_date`): `case` sobre os locks no
 *   `on conflict do update`, que mantém o valor atual quando travado;
 * - `phone`: nunca sobrescrito pelo formulário, travado ou não.
 *
 * Verificado lendo as funções no banco de produção em 09/08/2026. Nada nesta
 * camada altera as RPCs.
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

/* ------------------------------------------------------------------
   Observações vivas (Bloco 5B)
   ------------------------------------------------------------------ */

/** Nota operacional é parágrafo, não dossiê. Teto generoso, mas com teto. */
const NOTES_MAX = 4000

export type UpdatePersonNotesInput = { personId: string; notes: string }

export type UpdatePersonNotesResult =
  | { status: 'ok'; cleared: boolean }
  | { status: 'invalid'; reason: string }
  | { status: 'error'; message: string }

/**
 * A caderneta do Julio sobre a pessoa: "não gosta de agulha fina", "vai voltar
 * em março", "irmã do Léo". Mora em `people.extra_data.admin_notes` porque é
 * nota operacional de um operador só — coluna nova ou tabela nova seriam
 * estrutura demais pra um texto livre que ninguém consulta em massa.
 *
 * Três regras que essa nota não pode quebrar:
 *
 * 1. NÃO entra em `admin_locks`. Trava existe pra campo que o formulário
 *    público também escreve; `admin_notes` nenhum formulário escreve, então não
 *    há o que travar — carimbar um lock aqui só sujaria o JSON.
 * 2. O merge preserva as outras chaves do `extra_data` (bairro, instagram,
 *    locks…). Escrever `{ admin_notes }` seco apagaria o cadastro inteiro.
 * 3. O evento registra QUE a nota mudou, nunca O QUE ela diz. A pessoa pode ter
 *    contado algo sensível na conversa, e `events` é append-only: o que entra
 *    ali não sai. Por isso o payload leva só o nome do campo.
 */
export async function updatePersonNotes(
  input: UpdatePersonNotesInput
): Promise<UpdatePersonNotesResult> {
  // SEMPRE a primeira linha. Sem exceção.
  const { userId } = await requireOperator()

  const personId = z.string().uuid().safeParse(input?.personId)
  if (!personId.success) {
    return { status: 'invalid', reason: 'Pessoa inválida.' }
  }

  const parsedNotes = z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length <= NOTES_MAX, {
      message: `A observação passou de ${NOTES_MAX} caracteres.`,
    })
    .safeParse(input?.notes ?? '')

  if (!parsedNotes.success) {
    return {
      status: 'invalid',
      reason: parsedNotes.error.issues[0]?.message ?? 'Observação inválida.',
    }
  }
  const notes = parsedNotes.data

  try {
    const admin = createAdminClient()

    const { data: current, error: readErr } = await admin
      .from('people')
      .select('id, extra_data, deleted_at')
      .eq('id', personId.data)
      .maybeSingle()

    if (readErr) {
      console.error('[updatePersonNotes] read error:', readErr.message)
      return { status: 'error', message: readErr.message }
    }
    if (!current || current.deleted_at) {
      return { status: 'error', message: 'Pessoa não encontrada.' }
    }

    const extra: ExtraData = { ...((current.extra_data as ExtraData | null) ?? {}) }
    const before = typeof extra.admin_notes === 'string' ? extra.admin_notes : ''

    if (before === notes) {
      // Salvou sem ter mexido: não grava nem audita.
      return { status: 'ok', cleared: notes === '' }
    }

    // Nota apagada some do JSON em vez de virar "": a chave existir com string
    // vazia sugeriria que há uma nota, e não há.
    if (notes === '') delete extra.admin_notes
    else extra.admin_notes = notes

    const { error: writeErr } = await admin
      .from('people')
      .update({ extra_data: extra })
      .eq('id', personId.data)
      .is('deleted_at', null)

    if (writeErr) {
      console.error('[updatePersonNotes] write error:', writeErr.message)
      return { status: 'error', message: writeErr.message }
    }

    // Mesmo tipo de evento das outras edições de pessoa. `field` diz o que
    // mudou; `cleared` diz se foi apagada. O texto não entra aqui — nunca.
    const { error: auditErr } = await admin.from('events').insert({
      person_id: personId.data,
      event_type: 'admin.person_updated',
      source: 'admin',
      actor_id: userId,
      payload: { field: 'admin_notes', cleared: notes === '' },
    })
    if (auditErr) {
      console.error('[updatePersonNotes] audit insert failed:', auditErr.message)
    }

    revalidatePath(`/admin/people/${personId.data}`)
    return { status: 'ok', cleared: notes === '' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[updatePersonNotes] throw:', msg)
    return { status: 'error', message: msg }
  }
}

/* ------------------------------------------------------------------
   Exclusão de pessoa (Bloco 5C)
   ------------------------------------------------------------------ */

export type DeletePersonInput = { personId: string; confirmName: string }

export type DeletePersonResult =
  | { status: 'ok'; jobsDeleted: number }
  | { status: 'invalid'; reason: string }
  | { status: 'error'; message: string }

/** Comparação tolerante do nome digitado: sem acento, sem caixa, sem espaço duplo. */
function normName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function digitsOf(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '')
}

/**
 * "Excluir cadastro" da ficha (pedido de 09/08). SOFT-DELETE, sempre: carimba
 * `deleted_at` na pessoa e nos jobs dela. Nunca `delete from`.
 *
 * O que some: a pessoa sai das listas, do Funil e das views (todas filtram
 * `deleted_at is null`). O que fica: consents, events, motivations e registros
 * clínicos, que são append-only — são a prova de que um consentimento foi dado
 * e de que uma sessão aconteceu, e apagá-los destruiria a defesa do estúdio,
 * não a privacidade de ninguém. Se um dia vier um pedido de eliminação da LGPD,
 * ele é outro procedimento, com outra decisão por trás.
 *
 * O evento entra ANTES do carimbo: um `admin.person_deleted` gravado depois
 * seria um evento sobre uma pessoa que, para todo o resto do sistema, já não
 * existe. E `{reason: 'admin_ui'}` distingue esta exclusão de qualquer limpeza
 * futura feita por script.
 *
 * Reversível só tecnicamente: `deleted_at = null` de volta, pelo banco. Não há
 * botão de desfazer, e é por isso que o modal exige digitar o nome.
 */
export async function deletePerson(
  input: DeletePersonInput
): Promise<DeletePersonResult> {
  // SEMPRE a primeira linha. Sem exceção.
  const { userId } = await requireOperator()

  const personId = z.string().uuid().safeParse(input?.personId)
  if (!personId.success) {
    return { status: 'invalid', reason: 'Pessoa inválida.' }
  }

  const confirmName = z.string().max(200).safeParse(input?.confirmName ?? '')
  if (!confirmName.success) {
    return { status: 'invalid', reason: 'Confirmação inválida.' }
  }

  try {
    const admin = createAdminClient()

    const { data: person, error: readErr } = await admin
      .from('people')
      .select('id, name, phone, deleted_at')
      .eq('id', personId.data)
      .maybeSingle()

    if (readErr) {
      console.error('[deletePerson] read error:', readErr.message)
      return { status: 'error', message: readErr.message }
    }
    if (!person) {
      return { status: 'error', message: 'Pessoa não encontrada.' }
    }
    if (person.deleted_at) {
      // Já excluída (duplo clique, aba velha): não re-carimba nem audita de novo.
      return { status: 'ok', jobsDeleted: 0 }
    }

    // O modal já trava o botão sem o nome certo; o server confere de novo porque
    // a Server Action é um endpoint como qualquer outro — a trava do client é
    // ergonomia, não garantia.
    const typed = normName(confirmName.data)
    const expected = normName(person.name ?? '')
    const matches =
      (expected !== '' && typed === expected) ||
      // Sem nome, a ficha se identifica pelo telefone — é ele que o Julio vê e
      // é ele que ele digita.
      (expected === '' && digitsOf(confirmName.data) !== '' &&
        digitsOf(confirmName.data) === digitsOf(person.phone))

    if (!matches) {
      return {
        status: 'invalid',
        reason: 'O nome digitado não confere com o do cadastro.',
      }
    }

    // 1. Evento ANTES do carimbo.
    const { error: auditErr } = await admin.from('events').insert({
      person_id: personId.data,
      event_type: 'admin.person_deleted',
      source: 'admin',
      actor_id: userId,
      payload: { reason: 'admin_ui' },
    })
    if (auditErr) {
      // Aqui a falha ABORTA: uma exclusão sem rastro é exatamente o que não
      // pode acontecer com dado de pessoa. Nada foi carimbado ainda.
      console.error('[deletePerson] audit insert failed:', auditErr.message)
      return { status: 'error', message: 'Não deu pra registrar a exclusão.' }
    }

    const now = new Date().toISOString()

    // 2. A pessoa.
    const { error: personErr } = await admin
      .from('people')
      .update({ deleted_at: now })
      .eq('id', personId.data)
      .is('deleted_at', null)

    if (personErr) {
      console.error('[deletePerson] person soft-delete failed:', personErr.message)
      return { status: 'error', message: personErr.message }
    }

    // 3. Os jobs vivos dela — todos, não só os de status aberto: um job
    // executado de uma pessoa excluída seria uma linha órfã em toda query que
    // parte de `jobs`. O histórico continua no banco, só carimbado.
    const { data: deletedJobs, error: jobsErr } = await admin
      .from('jobs')
      .update({ deleted_at: now })
      .eq('person_id', personId.data)
      .is('deleted_at', null)
      .select('id')

    if (jobsErr) {
      // A pessoa já saiu das listas; os jobs dela não. Estado parcial, e o
      // Julio precisa saber — não devolve 'ok'.
      console.error('[deletePerson] jobs soft-delete failed:', jobsErr.message)
      return {
        status: 'error',
        message: 'A pessoa foi excluída, mas os jobs dela não. Avisa o Alan.',
      }
    }

    revalidatePath('/admin')
    revalidatePath(CADASTROS_PATH)
    revalidatePath(`/admin/people/${personId.data}`)
    return { status: 'ok', jobsDeleted: deletedJobs?.length ?? 0 }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[deletePerson] throw:', msg)
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
