'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { toE164 } from '@/lib/utils/phone'
import { isEligibleAge } from '@/lib/utils/age'
import { POLICY_VERSION_ANAMNESE } from '@/lib/legal/policy'

const INVALID_PHONE_REASON =
  'Número inválido pra esse país — confere o DDD e a quantidade de dígitos?'

// ─── getAnamneseProfileByPhone ─────────────────────────────
// Perfil que o /antes-da-sessao precisa pra decidir pular/confirmar/perguntar.
// Fica AQUI (não em people.ts) de propósito: precisa de campos que o /cadastro
// não usa (documento, consentimento de imagem) e não pode tocar naquele fluxo.
// Estado append-only é sempre a linha MAIS RECENTE — `order by created_at desc`
// (Spec #3c §5). Sem ordenação, o seed com 7 linhas de marketing devolveria a
// resposta errada.

export type AnamneseProfile = {
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
    document_type?: string
    document_number?: string
  }
  lgpd_valid: boolean
  marketing: boolean | null // preferência atual (última linha), null = nunca respondeu
  image: boolean | null // autorização atual (última linha), null = nunca respondeu
}

export type GetAnamneseProfileResult =
  | { status: 'found'; profile: AnamneseProfile }
  | { status: 'not_found' }
  | { status: 'invalid_phone'; reason: string }
  | { status: 'error'; message: string }

export async function getAnamneseProfileByPhone(
  rawPhone: string,
  country: string = 'BR'
): Promise<GetAnamneseProfileResult> {
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
      console.error('[getAnamneseProfileByPhone] people error:', pErr.message)
      return { status: 'error', message: pErr.message }
    }
    if (!person) {
      return { status: 'not_found' }
    }

    const { data: consents, error: cErr } = await supabase
      .from('consents')
      .select('consent_type, granted, valid_until, created_at')
      .eq('person_id', person.id)
      .in('consent_type', ['lgpd', 'marketing', 'image'])
      .order('created_at', { ascending: false }) // §5: estado = linha mais recente

    if (cErr) {
      console.error('[getAnamneseProfileByPhone] consents error:', cErr.message)
      return { status: 'error', message: cErr.message }
    }

    // .find() sobre a lista já ordenada desc → primeira ocorrência = a mais recente.
    const latestLgpd = consents?.find((c) => c.consent_type === 'lgpd')
    const latestMkt = consents?.find((c) => c.consent_type === 'marketing')
    const latestImg = consents?.find((c) => c.consent_type === 'image')

    const lgpd_valid = !!(
      latestLgpd?.granted &&
      (latestLgpd.valid_until === null ||
        new Date(latestLgpd.valid_until) > new Date())
    )

    const extra = (person.extra_data ?? {}) as AnamneseProfile['extra']

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
        marketing: latestMkt ? latestMkt.granted : null,
        image: latestImg ? latestImg.granted : null,
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[getAnamneseProfileByPhone] throw:', msg)
    return { status: 'error', message: msg }
  }
}

// ─── submitAnamnese ────────────────────────────────────────

const PREGNANCY = [
  'pregnant',
  'breastfeeding',
  'no',
  'prefer_not_say',
  'not_applicable',
] as const
const SUBSTANCES = ['will_not', 'will', 'discuss_in_session'] as const
const CONSENT_TYPES = [
  'procedure',
  'health',
  'lgpd',
  'image',
  'marketing',
] as const

const anamnesePayloadSchema = z.object({
  submission_id: z.string().uuid(),
  // E.164 já normalizado no client; a RPC revalida com a mesma regex.
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  // OBRIGATÓRIO na aplicação (nullable só no banco). Gate de idade server-side:
  // nunca confia no client. A RPC também rejeita null e < 18.
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => isEligibleAge(d), {
      message: 'Sessão exige 18 anos completos.',
    }),
  mode: z.enum(['new', 'returning']),
  source: z.literal('form_anamnese'),

  name: z.string().nullable(),
  email: z.string().email().nullable().or(z.literal('').transform(() => null)),
  lat: z.number().nullable(),
  lng: z.number().nullable(),

  body_region: z.string().min(1),

  extra_data: z.object({
    document_type: z.enum(['cpf', 'rg', 'cnh']).optional(),
    document_number: z.string().optional(),
    acquisition_source: z.string().optional(),
    is_first_tattoo: z.boolean().optional(),
    instagram: z.string().optional(),
    occupation: z.string().optional(),
    preferred_channel: z.string().optional(),
    interests: z.string().optional(),
    neighborhood: z.string().optional(),
    // cidade obrigatória: unidade analítica mínima da base (Decision #023).
    city: z.string().min(1),
  }),

  clinical: z.object({
    has_allergies: z.boolean(),
    allergies_detail: z.string().nullable(),
    takes_medication: z.boolean(),
    medications_detail: z.string().nullable(),
    has_diabetes: z.boolean(),
    has_skin_condition: z.boolean(),
    skin_condition_detail: z.string().nullable(),
    pregnancy_status: z.enum(PREGNANCY),
    health_notes: z.string().nullable(),
    recent_substances: z.enum(SUBSTANCES),
  }),

  // policy_version obrigatório em CADA consent (§11): é a prova jurídica.
  consents: z
    .array(
      z.object({
        type: z.enum(CONSENT_TYPES),
        granted: z.boolean(),
        policy_version: z.string().min(1),
        valid_months: z.number().int().positive().optional(),
      })
    )
    .min(1),

  motivation: z.string().nullable(),
})

export type AnamnesePayload = z.infer<typeof anamnesePayloadSchema>

export type SubmitAnamneseResult =
  | { status: 'ok'; personId: string; jobId: string; duplicate: boolean }
  | { status: 'invalid'; reason: string }
  | { status: 'error'; message: string }

// Exceptions que a RPC pode levantar (§8) → mensagem legível pro usuário.
// NUNCA logar o payload: contém dado de saúde.
const RPC_EXCEPTIONS: Record<string, string> = {
  invalid_phone: INVALID_PHONE_REASON,
  invalid_submission_id: 'Sessão inválida — recarrega a página e tenta de novo?',
  birth_date_required: 'Precisamos da sua data de nascimento pra seguir.',
  minor_not_allowed: 'Só tatuamos maiores de 18, sem exceção.',
  consent_policy_version_required:
    'Não consegui registrar os consentimentos — recarrega e tenta de novo?',
}

function translateRpcError(message: string): string {
  for (const [code, friendly] of Object.entries(RPC_EXCEPTIONS)) {
    if (message.includes(code)) return friendly
  }
  return 'Algo deu errado ao salvar. Tenta de novo?'
}

/**
 * Submit único do /antes-da-sessao. Valida com Zod, garante que todo consent
 * carrega a POLICY_VERSION_ANAMNESE e chama a RPC transacional submit_anamnese
 * (people + jobs + clinical_records + consents + motivations + events, tudo numa
 * transação, com idempotência por submission_id).
 */
export async function submitAnamnese(
  raw: AnamnesePayload
): Promise<SubmitAnamneseResult> {
  const parsed = anamnesePayloadSchema.safeParse(raw)
  if (!parsed.success) {
    // Sem parsed.error.message no log: pode conter recorte de dado sensível.
    console.warn('[submitAnamnese] invalid payload')
    return {
      status: 'invalid',
      reason: 'Dados inválidos — revisa os campos e tenta de novo.',
    }
  }

  const p = parsed.data

  // Fonte única da versão: reafirma a constante em cada consent, ignorando o que
  // veio do client. Garante que o banco e o texto congelado nunca divergem.
  const consents = p.consents.map((c) => ({
    ...c,
    policy_version: POLICY_VERSION_ANAMNESE,
  }))

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('submit_anamnese', {
      payload: {
        submission_id: p.submission_id,
        phone: p.phone,
        birth_date: p.birth_date,
        mode: p.mode,
        source: p.source,
        name: p.name,
        email: p.email,
        lat: p.lat,
        lng: p.lng,
        body_region: p.body_region,
        extra_data: p.extra_data,
        clinical: p.clinical,
        consents,
        motivation: p.motivation,
      },
    })

    if (error) {
      console.error('[submitAnamnese] rpc error:', error.message)
      // Erro conhecido da RPC → mensagem legível; genérico → tenta de novo.
      return { status: 'error', message: translateRpcError(error.message) }
    }

    console.log(
      '[submitAnamnese] ok:',
      data?.person_id,
      'job:',
      data?.job_id,
      'dup:',
      data?.duplicate
    )
    return {
      status: 'ok',
      personId: data.person_id,
      jobId: data.job_id,
      duplicate: !!data.duplicate,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[submitAnamnese] throw:', msg)
    return { status: 'error', message: 'Algo deu errado ao salvar. Tenta de novo?' }
  }
}
