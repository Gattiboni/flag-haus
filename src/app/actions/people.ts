'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { toE164 } from '@/lib/utils/phone'

const INVALID_PHONE_REASON =
  'Número inválido pra esse país — confere o DDD e a quantidade de dígitos?'

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
 * Busca pessoa por telefone. Número é convertido pra E.164 (com o país)
 * antes da query. Retorna found / not_found / invalid_phone / error.
 * Nunca lança exceção pro caller — todos os caminhos retornam objeto.
 */
export async function findPersonByPhone(
  rawPhone: string,
  country: string = 'BR'
): Promise<FindPersonResult> {
  const e164 = toE164(rawPhone ?? '', country)
  if (!e164) {
    console.warn('[findPersonByPhone] invalid format:', rawPhone, country)
    return { status: 'invalid_phone', reason: INVALID_PHONE_REASON }
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('people')
      .select('id, phone, name, email, birth_date, lifecycle_stage, created_at')
      .eq('phone', e164)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      console.error('[findPersonByPhone] supabase error:', error.message)
      return { status: 'error', message: error.message }
    }

    if (!data) {
      console.log('[findPersonByPhone] not_found:', e164)
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

// ─── getPersonProfileByPhone ───────────────────────────────

export type PersonProfile = {
  id: string
  phone: string
  name: string | null
  email: string | null
  birth_date: string | null
  extra: {
    neighborhood?: string
    city?: string
    instagram?: string
    acquisition_source?: string
    is_first_tattoo?: boolean
    occupation?: string
    interests?: string
    preferred_channel?: string
    circulation_areas?: string
  }
  lgpd_valid: boolean
  marketing_opt_in: boolean | null
}

export type GetProfileResult =
  | { status: 'found'; profile: PersonProfile }
  | { status: 'not_found' }
  | { status: 'invalid_phone'; reason: string }
  | { status: 'error'; message: string }

/**
 * Perfil completo por telefone: dados base + extra_data + estado
 * dos consentimentos (lgpd vigente? opt-in marketing atual?).
 * Usada pelo form pra decidir o que pular/confirmar/perguntar.
 */
export async function getPersonProfileByPhone(
  rawPhone: string,
  country: string = 'BR'
): Promise<GetProfileResult> {
  const e164 = toE164(rawPhone ?? '', country)
  if (!e164) {
    return { status: 'invalid_phone', reason: INVALID_PHONE_REASON }
  }

  try {
    const supabase = createAdminClient()

    const { data: person, error: pErr } = await supabase
      .from('people')
      .select('id, phone, name, email, birth_date, extra_data')
      .eq('phone', e164)
      .is('deleted_at', null)
      .maybeSingle()

    if (pErr) {
      console.error('[getPersonProfileByPhone] people error:', pErr.message)
      return { status: 'error', message: pErr.message }
    }
    if (!person) {
      console.log('[getPersonProfileByPhone] not_found:', e164)
      return { status: 'not_found' }
    }

    const { data: consents, error: cErr } = await supabase
      .from('consents')
      .select('consent_type, granted, valid_until, granted_at')
      .eq('person_id', person.id)
      .in('consent_type', ['lgpd', 'marketing'])
      .order('granted_at', { ascending: false })

    if (cErr) {
      console.error('[getPersonProfileByPhone] consents error:', cErr.message)
      return { status: 'error', message: cErr.message }
    }

    const latestLgpd = consents?.find((c) => c.consent_type === 'lgpd')
    const latestMkt = consents?.find((c) => c.consent_type === 'marketing')

    const lgpd_valid = !!(
      latestLgpd?.granted &&
      (latestLgpd.valid_until === null || new Date(latestLgpd.valid_until) > new Date())
    )
    const marketing_opt_in = latestMkt ? latestMkt.granted : null

    const extra = (person.extra_data ?? {}) as PersonProfile['extra']

    console.log('[getPersonProfileByPhone] found:', person.id)
    return {
      status: 'found',
      profile: {
        id: person.id,
        phone: person.phone,
        name: person.name,
        email: person.email,
        birth_date: person.birth_date,
        extra,
        lgpd_valid,
        marketing_opt_in,
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[getPersonProfileByPhone] throw:', msg)
    return { status: 'error', message: msg }
  }
}

// ─── submitCadastro ────────────────────────────────────────

const cadastroPayloadSchema = z.object({
  phone: z.string().min(1),
  country: z.string().length(2),
  mode: z.enum(['new', 'returning']),
  name: z.string().nullable(),
  email: z.string().email().nullable().or(z.literal('').transform(() => null)),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  extra_data: z.record(z.string(), z.union([z.string(), z.boolean()])),
  lgpd_accepted: z.boolean().nullable(),      // null = step não exibido (pulado)
  marketing_opt_in: z.boolean().nullable(),   // null = step não exibido
  motivation: z.string().nullable(),
})

export type CadastroPayload = z.infer<typeof cadastroPayloadSchema>

export type SubmitCadastroResult =
  | { status: 'ok'; personId: string }
  | { status: 'invalid'; reason: string }
  | { status: 'error'; message: string }

/**
 * Submit único do form /cadastro. Valida, normaliza telefone,
 * monta o payload da RPC e chama submit_cadastro (transação única
 * no Postgres: people + consents + motivations + events).
 */
export async function submitCadastro(
  raw: CadastroPayload
): Promise<SubmitCadastroResult> {
  const parsed = cadastroPayloadSchema.safeParse(raw)
  if (!parsed.success) {
    console.warn('[submitCadastro] invalid payload:', parsed.error.message)
    return { status: 'invalid', reason: 'Dados inválidos — revisa os campos e tenta de novo.' }
  }

  const p = parsed.data
  const e164 = toE164(p.phone, p.country)
  if (!e164) {
    return { status: 'invalid', reason: INVALID_PHONE_REASON }
  }

  const consents: Array<{ type: string; granted: boolean; valid_months?: number }> = []
  if (p.lgpd_accepted !== null) {
    consents.push({ type: 'lgpd', granted: p.lgpd_accepted, valid_months: 12 })
  }
  if (p.marketing_opt_in !== null) {
    consents.push({ type: 'marketing', granted: p.marketing_opt_in })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('submit_cadastro', {
      payload: {
        phone: e164,
        mode: p.mode,
        name: p.name,
        email: p.email,
        birth_date: p.birth_date,
        lat: p.lat,
        lng: p.lng,
        extra_data: p.extra_data,
        consents,
        motivation: p.motivation,
        source: 'form_cadastro',
      },
    })

    if (error) {
      console.error('[submitCadastro] rpc error:', error.message)
      return { status: 'error', message: error.message }
    }

    console.log('[submitCadastro] ok:', data?.person_id, 'mode:', p.mode)
    return { status: 'ok', personId: data.person_id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[submitCadastro] throw:', msg)
    return { status: 'error', message: msg }
  }
}
