'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizePhone, isValidBrazilianPhone } from '@/lib/utils/phone'

const phoneInputSchema = z.string().min(1, 'Telefone obrigatório')

export type FindPersonResult =
  | { status: 'found'; person: PersonRecord }
  | { status: 'not_found' }
  | { status: 'invalid_phone'; reason: string }
  | { status: 'error'; message: string }

export type PersonRecord = {
  id: string
  phone: string
  name: string | null
  email: string | null
  birth_date: string | null
  lifecycle_stage: string
  created_at: string
}

/**
 * Busca pessoa por telefone. Telefone é normalizado antes da query.
 * Retorna found / not_found / invalid_phone / error.
 * Nunca lança exceção pro caller — todos os caminhos retornam objeto.
 */
export async function findPersonByPhone(
  rawPhone: string
): Promise<FindPersonResult> {
  const parsed = phoneInputSchema.safeParse(rawPhone)
  if (!parsed.success) {
    console.warn('[findPersonByPhone] invalid input:', parsed.error.message)
    return { status: 'invalid_phone', reason: 'Telefone vazio' }
  }

  const normalized = normalizePhone(parsed.data)
  if (!isValidBrazilianPhone(normalized)) {
    console.warn('[findPersonByPhone] invalid format:', normalized)
    return {
      status: 'invalid_phone',
      reason: 'Telefone precisa ter 10 ou 11 dígitos (DDD + número)',
    }
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('people')
      .select('id, phone, name, email, birth_date, lifecycle_stage, created_at')
      .eq('phone', normalized)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      console.error('[findPersonByPhone] supabase error:', error.message)
      return { status: 'error', message: error.message }
    }

    if (!data) {
      console.log('[findPersonByPhone] not_found:', normalized)
      return { status: 'not_found' }
    }

    console.log('[findPersonByPhone] found:', data.id)
    return { status: 'found', person: data as PersonRecord }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[findPersonByPhone] throw:', msg)
    return { status: 'error', message: msg }
  }
}
