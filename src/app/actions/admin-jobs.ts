'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'
import { JOB_STATUSES } from '@/lib/domain/job-status'
import { CADASTROS_PATH } from '@/app/admin/_ui/cadastros'

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

/* ------------------------------------------------------------------
   Criação manual de job (#4d)
   ------------------------------------------------------------------ */

/**
 * Relógio de parede de São Paulo → instante UTC. O `datetime-local` devolve
 * "YYYY-MM-DDTHH:mm" SEM fuso nenhum; ler essa string com o relógio do servidor
 * (UTC na Vercel) empurraria toda sessão três horas pra frente. O admin já
 * EXIBE tudo em America/Sao_Paulo (`admin/_ui/format.ts`), então é nesse fuso
 * que ela também é lida — o que o Julio digita é o que ele lê de volta.
 *
 * Offset fixo em -03:00 porque o Brasil não tem horário de verão desde 2019.
 * Se voltar a ter, este é o único ponto a mudar.
 */
function saoPauloToISO(local: string): string | null {
  const d = new Date(`${local}:00.000-03:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const createJobSchema = z.object({
  personId: z.string().uuid(),
  description: optionalText(2000),
  bodyRegion: optionalText(200),
  style: optionalText(100),
  sizeCm: z.number().positive().nullable().optional(),
  quotedPrice: z.number().nonnegative().nullable().optional(),
  /** Relógio de parede de São Paulo, direto do `datetime-local`. */
  scheduledAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, { message: 'Data da sessão inválida.' })
    .nullable()
    .optional(),
  /** "A sessão já está combinada com o cliente" — só vale com data. */
  sessionAgreed: z.boolean().optional(),
})

export type CreateJobInput = z.input<typeof createJobSchema>

export type CreateJobResult =
  | { status: 'ok'; jobId: string }
  | { status: 'invalid'; reason: string }
  | { status: 'error'; message: string }

/**
 * Job criado à mão pelo Julio, na ficha da pessoa (#4d). O caminho normal de um
 * job é nascer do formulário público; este é o do cliente que chegou pelo
 * WhatsApp, pela indicação ou pela porta da rua.
 *
 * O status NÃO é escolhido no formulário, é derivado — e a razão é que status
 * aqui é consequência, não opinião: um job nasce `quoted` porque orçar é o
 * primeiro trabalho que ele dá. Só quando existe data E o Julio confirma que a
 * sessão está combinada com o cliente é que ele nasce `confirmed` (com o
 * `confirmed_at` carimbado, mesma regra do `updateJob`). Dali em diante quem
 * move o status é o Funil, como em qualquer job.
 *
 * `quoted_at` segue a mesma regra do `updateJob`: carimba quando o preço orçado
 * existe, não quando o job existe.
 */
export async function createJob(raw: CreateJobInput): Promise<CreateJobResult> {
  // SEMPRE a primeira linha. Sem exceção.
  const { userId } = await requireOperator()

  const parsed = createJobSchema.safeParse(raw)
  if (!parsed.success) {
    console.warn('[createJob] invalid payload:', parsed.error.message)
    return {
      status: 'invalid',
      reason: parsed.error.issues[0]?.message ?? 'Dados inválidos.',
    }
  }
  const {
    personId,
    description,
    bodyRegion,
    style,
    sizeCm,
    quotedPrice,
    scheduledAt,
    sessionAgreed,
  } = parsed.data

  let scheduledISO: string | null = null
  if (scheduledAt) {
    scheduledISO = saoPauloToISO(scheduledAt)
    if (!scheduledISO) {
      return { status: 'invalid', reason: 'Data da sessão inválida.' }
    }
  }

  // Derivação do status. Sem data não há sessão combinada — o checkbox sozinho
  // não confirma nada, e o client já o desabilita nesse caso.
  const confirmed = scheduledISO !== null && sessionAgreed === true
  const status = confirmed ? 'confirmed' : 'quoted'

  try {
    const admin = createAdminClient()

    // A FK é ON DELETE RESTRICT, então um person_id inexistente estouraria no
    // insert — mas com mensagem de banco. E pessoa soft-deletada passaria pela
    // FK sem passar pela regra: ninguém cria job pra quem foi excluído.
    const { data: person, error: readErr } = await admin
      .from('people')
      .select('id, deleted_at')
      .eq('id', personId)
      .maybeSingle()

    if (readErr) {
      console.error('[createJob] read error:', readErr.message)
      return { status: 'error', message: readErr.message }
    }
    if (!person || person.deleted_at) {
      return { status: 'error', message: 'Pessoa não encontrada.' }
    }

    const now = new Date().toISOString()
    const insert: Record<string, unknown> = {
      person_id: personId,
      status,
      description: description ?? null,
      body_region: bodyRegion ?? null,
      style: style ?? null,
      size_cm: sizeCm ?? null,
      quoted_price: quotedPrice ?? null,
      scheduled_at: scheduledISO,
    }
    if (quotedPrice != null) insert.quoted_at = now
    if (confirmed) insert.confirmed_at = now

    const { data: created, error: writeErr } = await admin
      .from('jobs')
      .insert(insert)
      .select('id')
      .single()

    if (writeErr || !created) {
      const msg = writeErr?.message ?? 'insert não retornou o job.'
      console.error('[createJob] write error:', msg)
      return { status: 'error', message: msg }
    }

    // Auditoria. `job.%` cai como classe `operational` na taxonomia da
    // `v_person_last_interaction` — criar job à mão É uma interação
    // operacional, não uma edição de cadastro.
    const { error: auditErr } = await admin.from('events').insert({
      person_id: personId,
      job_id: created.id,
      event_type: 'job.created_manual',
      source: 'admin',
      actor_id: userId,
      payload: {
        created: {
          status,
          scheduled_at: scheduledISO,
          quoted_price: quotedPrice ?? null,
          body_region: bodyRegion ?? null,
          style: style ?? null,
          size_cm: sizeCm ?? null,
          description: description ?? null,
        },
        session_agreed: confirmed,
      },
    })
    if (auditErr) {
      console.error('[createJob] audit insert failed:', auditErr.message)
    }

    // Fila (o job entra num grupo), ficha (Jobs ativos) e Cadastros (status
    // operacional e "Próxima sessão" saem das views, que já enxergam o job).
    revalidatePath('/admin')
    revalidatePath(`/admin/people/${personId}`)
    revalidatePath(CADASTROS_PATH)
    return { status: 'ok', jobId: created.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[createJob] throw:', msg)
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
