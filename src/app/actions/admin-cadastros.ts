'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePerson } from '@/app/actions/admin-people'
import { CADASTROS_PATH, PREFERRED_CHANNELS } from '@/app/admin/_ui/cadastros'

/**
 * Edição inline da lista de Cadastros (Bloco 4). Campos permitidos e por quê:
 *
 * - `preferred_channel` e `neighborhood` são campos DA PESSOA que o formulário
 *   público também escreve. Por isso NÃO são gravados aqui: delegam pro
 *   `updatePerson`, que é o caminho canônico de "admin editou uma pessoa" e
 *   carimba a trava por campo (`extra_data.admin_locks`) que as RPCs
 *   `submit_cadastro`/`submit_anamnese` respeitam. Reimplementar o merge de
 *   locks num segundo arquivo é exatamente como esse contrato se perde.
 *
 * - `is_vip` / `is_difficult` são flags só do admin: o formulário público nunca
 *   as escreve, então não existe trava a carimbar. Vão direto nas colunas
 *   `people.vip_flag` / `people.difficult_flag` — a view expõe os nomes
 *   `is_vip`/`is_difficult` (contrato §2.2), a tabela guarda `*_flag`
 *   (docs/db/schema.md). O de-para vive aqui e em nenhum outro lugar.
 *
 * `operational_status` é computado pela view e NÃO entra: quem move status é o
 * Funil/job. Nome, telefone, e-mail e nascimento também não — esses só no
 * PersonEdit, que tem o aviso de troca de telefone e o fluxo de destravar.
 */

const patchSchema = z
  .object({
    preferred_channel: z.enum(PREFERRED_CHANNELS).nullable().optional(),
    neighborhood: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s.length <= 100, { message: 'Bairro: máximo 100 caracteres.' })
      .transform((s) => (s === '' ? null : s))
      .nullable()
      .optional(),
    is_vip: z.boolean().optional(),
    is_difficult: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nada para atualizar.' })

export type UpdateCadastroInput = {
  personId: string
  patch: {
    preferred_channel?: string | null
    neighborhood?: string | null
    is_vip?: boolean
    is_difficult?: boolean
  }
}

export type UpdateCadastroResult =
  | { status: 'ok' }
  | { status: 'invalid'; reason: string }
  | { status: 'error'; message: string }

export async function updateCadastroInline(
  input: UpdateCadastroInput
): Promise<UpdateCadastroResult> {
  // SEMPRE a primeira linha. Sem exceção.
  const { userId } = await requireOperator()

  const personId = z.string().uuid().safeParse(input?.personId)
  if (!personId.success) {
    return { status: 'invalid', reason: 'Pessoa inválida.' }
  }

  const parsed = patchSchema.safeParse(input?.patch ?? {})
  if (!parsed.success) {
    console.warn('[updateCadastroInline] invalid patch:', parsed.error.message)
    return {
      status: 'invalid',
      reason: parsed.error.issues[0]?.message ?? 'Dados inválidos.',
    }
  }
  const patch = parsed.data

  // ── Campos travávis: caminho canônico, com lock + auditoria. ──
  const lockable: Record<string, unknown> = {}
  if ('preferred_channel' in patch) lockable.preferred_channel = patch.preferred_channel
  if ('neighborhood' in patch) lockable.neighborhood = patch.neighborhood

  if (Object.keys(lockable).length > 0) {
    const res = await updatePerson({ personId: personId.data, patch: lockable })
    if (res.status !== 'ok') {
      revalidatePath(CADASTROS_PATH)
      return res.status === 'invalid'
        ? { status: 'invalid', reason: res.reason }
        : { status: 'error', message: res.message }
    }
  }

  // ── Flags: colunas diretas, sem trava. ──
  const wantsFlags = 'is_vip' in patch || 'is_difficult' in patch
  if (!wantsFlags) {
    revalidatePath(CADASTROS_PATH)
    return { status: 'ok' }
  }

  try {
    const admin = createAdminClient()

    const { data: current, error: readErr } = await admin
      .from('people')
      .select('id, vip_flag, difficult_flag, deleted_at')
      .eq('id', personId.data)
      .maybeSingle()

    if (readErr) {
      console.error('[updateCadastroInline] read error:', readErr.message)
      return { status: 'error', message: readErr.message }
    }
    if (!current || current.deleted_at) {
      return { status: 'error', message: 'Pessoa não encontrada.' }
    }

    const update: Record<string, boolean> = {}
    const changed: Record<string, boolean> = {}
    const from: Record<string, boolean> = {}

    if (patch.is_vip !== undefined && patch.is_vip !== current.vip_flag) {
      update.vip_flag = patch.is_vip
      changed.vip_flag = patch.is_vip
      from.vip_flag = current.vip_flag
    }
    if (
      patch.is_difficult !== undefined &&
      patch.is_difficult !== current.difficult_flag
    ) {
      update.difficult_flag = patch.is_difficult
      changed.difficult_flag = patch.is_difficult
      from.difficult_flag = current.difficult_flag
    }

    if (Object.keys(update).length === 0) {
      // Mesmo valor que já estava: não grava nem audita.
      revalidatePath(CADASTROS_PATH)
      return { status: 'ok' }
    }

    const { error: writeErr } = await admin
      .from('people')
      .update(update)
      .eq('id', personId.data)
      .is('deleted_at', null)

    if (writeErr) {
      console.error('[updateCadastroInline] write error:', writeErr.message)
      return { status: 'error', message: writeErr.message }
    }

    // Mesmo tipo de evento das outras edições de pessoa — o histórico do
    // PersonEdit e o desta tela contam a mesma história, sem dialeto novo.
    const { error: auditErr } = await admin.from('events').insert({
      person_id: personId.data,
      event_type: 'admin.person_updated',
      source: 'admin',
      actor_id: userId,
      payload: { changed, from, locked_now: [] },
    })
    if (auditErr) {
      console.error('[updateCadastroInline] audit insert failed:', auditErr.message)
    }

    revalidatePath(CADASTROS_PATH)
    revalidatePath(`/admin/people/${personId.data}`)
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[updateCadastroInline] throw:', msg)
    return { status: 'error', message: msg }
  }
}
