'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { isValidPhoneNumber, type CountryCode } from 'libphonenumber-js/max'
import type {
  AnamneseProfile,
  GetAnamneseProfileResult,
  AnamnesePayload,
  SubmitAnamneseResult,
} from '@/app/actions/anamnese'
import { calculateAge } from '@/lib/utils/age'
import { toE164 } from '@/lib/utils/phone'
import { POLICY_VERSION_ANAMNESE } from '@/lib/legal/policy'
import { StepShell } from '@/components/form/StepShell'
import { TerminalScreen } from '@/components/form/TerminalScreen'
import { OptionPills } from '@/components/form/OptionPills'
import { ConfirmField } from '@/components/form/ConfirmField'
import { GeoFields } from '@/components/form/GeoFields'
import { PhoneField } from '@/components/form/PhoneField'
import { Alert, Card, Checkbox, Input, Textarea } from '@/components/ui'

type Props = {
  getProfileAction: (phone: string, country?: string) => Promise<GetAnamneseProfileResult>
  submitAction: (payload: AnamnesePayload) => Promise<SubmitAnamneseResult>
}

type Mode = 'new' | 'returning'
type YN = '' | 'yes' | 'no'

type FormState = {
  stepIndex: number
  visibleSteps: number[]
  mode: Mode
  profile: AnamneseProfile | null

  phone: string
  country: string
  phoneError: string | null

  birth_date: string
  birthError: string | null

  // ── saúde ──
  body_region: string
  bodyError: string | null
  has_allergies: YN
  allergies_detail: string
  allergiesError: string | null
  takes_medication: YN
  medications_detail: string
  medicationError: string | null
  has_diabetes: YN
  diabetesError: string | null
  has_skin_condition: YN
  skin_condition_detail: string
  skinError: string | null
  pregnancy_status: string // '' | enum
  pregnancyError: string | null
  health_notes: string
  recent_substances: string // '' | enum
  substancesError: string | null

  // ── documento + consentimento ──
  document_type: string // '' | 'cpf' | 'rg' | 'cnh'
  document_number: string
  docEditing: boolean
  docError: string | null
  procedure_accepted: boolean
  procedureError: string | null
  health_accepted: boolean
  healthConsentError: string | null
  lgpd_accepted: boolean
  lgpdError: string | null
  image_opt_in: YN
  imageError: string | null

  // ── cadastro ──
  name: string
  email: string
  emailError: string | null
  neighborhood: string
  city: string
  cityError: string | null
  lat: number | null
  lng: number | null
  acquisition_source: string
  is_first_tattoo: YN
  instagram: string
  occupation: string
  preferred_channel: string
  interests: string
  marketing_opt_in: YN
  marketingError: string | null
  motivation: string

  submitError: string | null
  done: boolean
  duplicate: boolean
  blocked: boolean // gate de idade: menor de 18 → tela terminal, ZERO escrita
}

// Ordem dos steps (0–30). É a ordem natural aqui, mas mantida explícita porque
// o wizard navega por índice na lista de visíveis, não pelo número do step.
const ALL_STEPS = Array.from({ length: 31 }, (_, i) => i)

/**
 * Steps visíveis: "pula o que já tem" é POR CAMPO (Spec #3c §4), nunca por bloco.
 * Saúde (4–11) e os consentimentos procedure/health (14,15) NUNCA somem, nem
 * para recorrente. Só quatro steps podem sumir de vez quando já respondidos.
 */
function computeVisible(mode: Mode, profile: AnamneseProfile | null): number[] {
  if (mode === 'new' || !profile) return ALL_STEPS
  return ALL_STEPS.filter((s) => {
    switch (s) {
      case 3:
        // gate: pula só quem já tem nascimento válido de maior de 18.
        if (!profile.birth_date) return true
        return (calculateAge(profile.birth_date) ?? -1) < 18
      case 16:
        // LGPD: pula se consentiu há < 12 meses e ainda vale.
        return !profile.lgpd_valid
      case 22:
        return !profile.extra.acquisition_source
      case 23:
        return profile.extra.is_first_tattoo === undefined
      default:
        return true
    }
  })
}

const initialState: FormState = {
  stepIndex: 0,
  visibleSteps: ALL_STEPS,
  mode: 'new',
  profile: null,
  phone: '',
  country: 'BR',
  phoneError: null,
  birth_date: '',
  birthError: null,
  body_region: '',
  bodyError: null,
  has_allergies: '',
  allergies_detail: '',
  allergiesError: null,
  takes_medication: '',
  medications_detail: '',
  medicationError: null,
  has_diabetes: '',
  diabetesError: null,
  has_skin_condition: '',
  skin_condition_detail: '',
  skinError: null,
  pregnancy_status: '',
  pregnancyError: null,
  health_notes: '',
  recent_substances: '',
  substancesError: null,
  document_type: '',
  document_number: '',
  docEditing: false,
  docError: null,
  procedure_accepted: false,
  procedureError: null,
  health_accepted: false,
  healthConsentError: null,
  lgpd_accepted: false,
  lgpdError: null,
  image_opt_in: '',
  imageError: null,
  name: '',
  email: '',
  emailError: null,
  neighborhood: '',
  city: '',
  cityError: null,
  lat: null,
  lng: null,
  acquisition_source: '',
  is_first_tattoo: '',
  instagram: '',
  occupation: '',
  preferred_channel: '',
  interests: '',
  marketing_opt_in: '',
  marketingError: null,
  motivation: '',
  submitError: null,
  done: false,
  duplicate: false,
  blocked: false,
}

// Só espaçamento: cor, tamanho e peso de h1/h2/p vêm do base.css do padrão.
const h1Cls = 'mb-fh-5'
const h2Cls = 'mb-fh-4'
const mutedCls = 'fh-lead mb-fh-5'
const fieldCls = 'my-fh-6'
const errCls = 'fh-error mt-fh-2'
// Lista dos textos jurídicos congelados (consentimentos).
const listCls = 'list-disc pl-5 flex flex-col gap-fh-2'

export function AnamneseForm({ getProfileAction, submitAction }: Props) {
  const [state, setState] = useState<FormState>(initialState)
  const [isPending, startTransition] = useTransition()

  // uuid de idempotência gerado UMA vez, no mount. Reenvio do mesmo formulário
  // (retry, F5 no submit) reusa este id → a RPC detecta e não grava de novo.
  const [submissionId] = useState(() => crypto.randomUUID())

  const currentStep = state.visibleSteps[state.stepIndex]
  const counter = `${state.stepIndex + 1} de ${state.visibleSteps.length}`

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }, [state.stepIndex, state.done])

  // Guarda síncrona contra submit duplo (Enter dobrado / Enter + clique).
  const submitLockRef = useRef(false)

  // Enter avança o step chamando o MESMO handler do botão. Refs mantêm handler
  // e guardas sempre frescos sem re-anexar o listener a cada render. A atribuição
  // vai num effect (não no corpo do render) — mutar ref durante o render é
  // proibido pelo react-hooks/refs; o listener só lê .current no evento, bem
  // depois do effect ter rodado.
  const handleNextRef = useRef<() => void>(() => {})
  const guardRef = useRef({ isPending, blocked: state.blocked, done: state.done })
  useEffect(() => {
    handleNextRef.current = handleNext
    guardRef.current = { isPending, blocked: state.blocked, done: state.done }
  })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return
      // Autocomplete aberto chama preventDefault ao selecionar: não avançamos.
      if (e.defaultPrevented) return
      // <textarea>: Enter é quebra de linha, nunca avanço.
      const t = e.target as HTMLElement | null
      if (t && t.tagName === 'TEXTAREA') return
      const g = guardRef.current
      if (g.blocked || g.done || g.isPending) return
      e.preventDefault()
      handleNextRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const set = (patch: Partial<FormState>) => setState((s) => ({ ...s, ...patch }))

  const advance = () =>
    setState((s) => ({
      ...s,
      stepIndex: Math.min(s.stepIndex + 1, s.visibleSteps.length - 1),
    }))
  const back = () =>
    setState((s) => ({ ...s, stepIndex: Math.max(s.stepIndex - 1, 0) }))

  /** True quando returning e o campo do step já tem valor no banco. */
  function isFilled(step: number): boolean {
    if (state.mode !== 'returning' || !state.profile) return false
    const p = state.profile
    switch (step) {
      case 13:
        return !!p.extra.document_type && !!p.extra.document_number
      case 17:
        return p.image !== null
      case 19:
        return !!p.name
      case 20:
        return !!p.email
      case 21:
        return !!p.extra.neighborhood && !!p.extra.city
      case 24:
        return !!p.extra.instagram
      case 25:
        return !!p.extra.occupation
      case 27:
        return p.marketing !== null
      case 28:
        return !!p.extra.interests
      default:
        return false
    }
  }

  function handlePhoneNext() {
    if (!isValidPhoneNumber(state.phone, state.country as CountryCode)) {
      set({
        phoneError:
          'Número inválido pra esse país — confere o DDD e a quantidade de dígitos?',
      })
      return
    }
    set({ phoneError: null })
    startTransition(async () => {
      const r = await getProfileAction(state.phone, state.country)
      if (r.status === 'found') {
        const p = r.profile
        const visible = computeVisible('returning', p)
        const age = p.birth_date ? calculateAge(p.birth_date) : null
        const minor = age !== null && age < 18
        setState((s) => ({
          ...s,
          mode: 'returning',
          profile: p,
          visibleSteps: visible,
          stepIndex: visible.indexOf(2), // pula pro reconhecimento
          blocked: minor,
          birth_date: p.birth_date ?? '',
          name: p.name ?? '',
          email: p.email ?? '',
          neighborhood: p.extra.neighborhood ?? '',
          city: p.extra.city ?? '',
          instagram: p.extra.instagram ?? '',
          acquisition_source: p.extra.acquisition_source ?? '',
          occupation: p.extra.occupation ?? '',
          interests: p.extra.interests ?? '',
          preferred_channel: p.extra.preferred_channel ?? '',
          document_type: p.extra.document_type ?? '',
          document_number: p.extra.document_number ?? '',
          is_first_tattoo:
            p.extra.is_first_tattoo === undefined
              ? ''
              : p.extra.is_first_tattoo
                ? 'yes'
                : 'no',
          // consentimentos por pessoa: pré-carrega a última resposta pra o
          // caminho de confirmação (§13). null = nunca respondeu → pergunta.
          image_opt_in: p.image === null ? '' : p.image ? 'yes' : 'no',
          marketing_opt_in: p.marketing === null ? '' : p.marketing ? 'yes' : 'no',
          phoneError: null,
        }))
      } else if (r.status === 'not_found') {
        setState((s) => ({
          ...s,
          mode: 'new',
          profile: null,
          visibleSteps: ALL_STEPS,
          stepIndex: ALL_STEPS.indexOf(2),
          phoneError: null,
        }))
      } else if (r.status === 'invalid_phone') {
        set({ phoneError: r.reason })
      } else {
        set({ phoneError: 'Não consegui buscar agora — tenta de novo?' })
      }
    })
  }

  function handleGateNext() {
    const v = state.birth_date
    if (!v) {
      set({ birthError: 'Precisa preencher pra seguir.' })
      return
    }
    const age = calculateAge(v)
    if (age === null || age < 0 || age > 120) {
      set({ birthError: 'Data inválida — confere aí?' })
      return
    }
    if (age < 18) {
      // menor de 18: tela terminal, nenhuma escrita (submit é único, no final).
      set({ birthError: null, blocked: true })
      return
    }
    set({ birthError: null })
    advance()
  }

  function requirePill(
    value: string,
    errorKey: keyof FormState,
    msg = 'Escolhe uma opção pra seguir.'
  ) {
    if (!value) {
      set({ [errorKey]: msg } as Partial<FormState>)
      return false
    }
    set({ [errorKey]: null } as Partial<FormState>)
    return true
  }

  function handleBodyRegionNext() {
    if (!state.body_region.trim()) {
      set({ bodyError: 'Só a região — braço, costela, coxa, costas…' })
      return
    }
    set({ bodyError: null })
    advance()
  }

  function handleDocNext() {
    // returning com documento e sem editar: confirmação, segue direto.
    if (isFilled(13) && !state.docEditing) {
      set({ docError: null })
      advance()
      return
    }
    if (!state.document_type) {
      set({ docError: 'Escolhe o tipo de documento.' })
      return
    }
    if (!state.document_number.trim()) {
      set({ docError: 'Preenche o número do documento.' })
      return
    }
    set({ docError: null })
    advance()
  }

  function handleEmailNext() {
    const v = state.email.trim()
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      set({ emailError: 'Formato de e-mail inválido' })
      return
    }
    set({ emailError: null })
    advance()
  }

  function handleLocationNext() {
    if (!state.city.trim()) {
      set({ cityError: 'Precisa preencher pra seguir.' })
      return
    }
    set({ cityError: null })
    advance()
  }

  function buildPayload(): AnamnesePayload | null {
    const e164 = toE164(state.phone, state.country)
    if (!e164) return null // telefone já validado no step 1; guarda defensiva

    const visible = (s: number) => state.visibleSteps.includes(s)

    // ── extra_data (merge no people.extra_data) ──
    const extra: AnamnesePayload['extra_data'] = { city: state.city.trim() }
    if (state.neighborhood.trim()) extra.neighborhood = state.neighborhood.trim()
    if (state.document_type === 'cpf' || state.document_type === 'rg' || state.document_type === 'cnh')
      extra.document_type = state.document_type
    if (state.document_number.trim()) extra.document_number = state.document_number.trim()
    if (visible(22) && state.acquisition_source)
      extra.acquisition_source = state.acquisition_source
    if (visible(23) && (state.is_first_tattoo === 'yes' || state.is_first_tattoo === 'no'))
      extra.is_first_tattoo = state.is_first_tattoo === 'yes'
    {
      // instagram: sempre visível; Remover (returning) → "" pra apagar no merge.
      const v = state.instagram.trim()
      const had = state.mode === 'returning' && !!state.profile?.extra.instagram
      if (v) extra.instagram = v
      else if (had) extra.instagram = ''
    }
    if (state.occupation.trim()) extra.occupation = state.occupation.trim()
    if (state.preferred_channel) extra.preferred_channel = state.preferred_channel
    if (state.interests.trim()) extra.interests = state.interests.trim()

    // ── clinical (1 linha por sessão) ──
    const yn = (v: YN) => v === 'yes'
    const detail = (cond: YN, d: string) =>
      cond === 'yes' && d.trim() ? d.trim() : null
    const clinical: AnamnesePayload['clinical'] = {
      has_allergies: yn(state.has_allergies),
      allergies_detail: detail(state.has_allergies, state.allergies_detail),
      takes_medication: yn(state.takes_medication),
      medications_detail: detail(state.takes_medication, state.medications_detail),
      has_diabetes: yn(state.has_diabetes),
      has_skin_condition: yn(state.has_skin_condition),
      skin_condition_detail: detail(state.has_skin_condition, state.skin_condition_detail),
      pregnancy_status: state.pregnancy_status as AnamnesePayload['clinical']['pregnancy_status'],
      health_notes: state.health_notes.trim() || null,
      recent_substances: state.recent_substances as AnamnesePayload['clinical']['recent_substances'],
    }

    // ── consents (append-only; a RPC amarra job_id por tipo) ──
    const pv = POLICY_VERSION_ANAMNESE
    const consents: AnamnesePayload['consents'] = [
      { type: 'procedure', granted: true, policy_version: pv },
      { type: 'health', granted: true, policy_version: pv },
    ]
    // LGPD só quando o step apareceu (pulado quando vigente < 12 meses → §12).
    if (visible(16))
      consents.push({ type: 'lgpd', granted: true, policy_version: pv, valid_months: 12 })
    // image/marketing: grava só se for resposta nova OU se mudou de fato (§7:
    // "se nunca respondeu"). Confirmar sem mudança não empilha linha nova.
    const imgChosen = state.image_opt_in === 'yes'
    if (!isFilled(17)) {
      consents.push({ type: 'image', granted: imgChosen, policy_version: pv })
    } else if (state.profile && imgChosen !== state.profile.image) {
      consents.push({ type: 'image', granted: imgChosen, policy_version: pv })
    }
    const mktChosen = state.marketing_opt_in === 'yes'
    if (!isFilled(27)) {
      consents.push({ type: 'marketing', granted: mktChosen, policy_version: pv })
    } else if (state.profile && mktChosen !== state.profile.marketing) {
      consents.push({ type: 'marketing', granted: mktChosen, policy_version: pv })
    }

    return {
      submission_id: submissionId,
      phone: e164,
      birth_date: state.birth_date,
      mode: state.mode,
      source: 'form_anamnese',
      name: state.name.trim() || null,
      email: state.email.trim() || null,
      lat: state.lat,
      lng: state.lng,
      body_region: state.body_region.trim(),
      extra_data: extra,
      clinical,
      consents,
      motivation: state.motivation.trim() || null,
    }
  }

  function handleSubmit() {
    if (submitLockRef.current) return
    submitLockRef.current = true
    const payload = buildPayload()
    if (!payload) {
      submitLockRef.current = false
      set({ submitError: 'Número de telefone inválido — volta e confere?' })
      return
    }
    set({ submitError: null })
    startTransition(async () => {
      const r = await submitAction(payload)
      submitLockRef.current = false
      if (r.status === 'ok') {
        setState((s) => ({ ...s, done: true, duplicate: r.duplicate, submitError: null }))
      } else if (r.status === 'invalid') {
        set({ submitError: r.reason })
      } else {
        // 'error': a mensagem já vem traduzida (translateRpcError) pela action.
        set({ submitError: r.message })
      }
    })
  }

  function handleNext() {
    switch (currentStep) {
      case 1:
        return handlePhoneNext()
      case 3:
        return handleGateNext()
      case 4:
        return handleBodyRegionNext()
      case 5:
        return requirePill(state.has_allergies, 'allergiesError') && advance()
      case 6:
        return requirePill(state.takes_medication, 'medicationError') && advance()
      case 7:
        return requirePill(state.has_diabetes, 'diabetesError') && advance()
      case 8:
        return requirePill(state.has_skin_condition, 'skinError') && advance()
      case 9:
        return requirePill(state.pregnancy_status, 'pregnancyError') && advance()
      case 11:
        return requirePill(state.recent_substances, 'substancesError') && advance()
      case 13:
        return handleDocNext()
      case 14:
        if (!state.procedure_accepted) {
          set({ procedureError: 'Precisa confirmar pra seguir.' })
          return
        }
        set({ procedureError: null })
        return advance()
      case 15:
        if (!state.health_accepted) {
          set({ healthConsentError: 'Precisa autorizar pra seguir.' })
          return
        }
        set({ healthConsentError: null })
        return advance()
      case 16:
        if (!state.lgpd_accepted) {
          set({ lgpdError: 'Precisa concordar pra seguir.' })
          return
        }
        set({ lgpdError: null })
        return advance()
      case 17:
        return requirePill(state.image_opt_in, 'imageError') && advance()
      case 20:
        return handleEmailNext()
      case 21:
        return handleLocationNext()
      case 27:
        return requirePill(state.marketing_opt_in, 'marketingError') && advance()
      case 30:
        return handleSubmit()
      default:
        return advance()
    }
  }

  // ── Tela de bloqueio (menor de 18) — terminal, NENHUMA escrita ──
  if (state.blocked) {
    return (
      <TerminalScreen title="Obrigado pela honestidade.">
        <p>
          A gente não tatua menores de 18, sem exceção. É o que a lei pede e o
          que a gente acredita.
        </p>
        <p>Quando você completar 18, a gente vai estar aqui.</p>
      </TerminalScreen>
    )
  }

  // ── Tela de sucesso (copy 30 — Fechamento) ──
  if (state.done) {
    return (
      <TerminalScreen title="Fechou.">
        <p>Cadastro atualizado, saúde checada, combinações alinhadas.</p>
        <p>
          Agora a gente segue pra confirmação final da sessão e as orientações de
          cuidado pré-tatuagem — chegam aqui pelo WhatsApp.
        </p>
        <p>Qualquer coisa antes do dia, me chama.</p>
      </TerminalScreen>
    )
  }

  const nextLabel =
    currentStep === 0
      ? 'Bora'
      : currentStep === 2
        ? 'Seguir'
        : currentStep === 1
          ? isPending
            ? 'Buscando…'
            : 'Continuar'
          : currentStep === 30
            ? isPending
              ? 'Enviando…'
              : 'Concluir'
            : 'Continuar'

  return (
    <StepShell
      counter={counter}
      onBack={state.stepIndex > 0 ? back : undefined}
      onNext={handleNext}
      nextLabel={nextLabel}
      nextDisabled={isPending}
    >
      {renderStep()}
    </StepShell>
  )

  function renderStep() {
    switch (currentStep) {
      // 0 — Abertura
      case 0:
        return (
          <div>
            <h1 className={h1Cls}>Antes da sua sessão.</h1>
            <p className="mb-fh-4">
              Tem algumas coisas que precisamos confirmar juntos antes do dia.
            </p>
            <p className="mb-fh-4">
              Saúde, segurança, e os seus dados com a gente. Leva uns 3 a 5
              minutos.
            </p>
            <p className="mb-fh-4">Pode fazer agora pelo celular mesmo.</p>
            <p className="fh-lead mt-fh-6">— Julio</p>
          </div>
        )

      // 1 — Telefone (chave)
      case 1:
        return (
          <div>
            <h2 className={h2Cls}>Primeiro: qual o seu WhatsApp?</h2>
            <p className={mutedCls}>É como a gente se acha por aqui.</p>
            <PhoneField
              phone={state.phone}
              country={state.country}
              onPhoneChange={(v) => set({ phone: v, phoneError: null })}
              onCountryChange={(c) => set({ country: c, phoneError: null })}
              error={state.phoneError}
            />
          </div>
        )

      // 2 — Reconhecimento
      case 2:
        return state.mode === 'returning' ? (
          <div>
            <h1 className={h1Cls}>
              {state.profile?.name
                ? `Beleza, ${state.profile.name} — bom te ver de volta.`
                : 'Beleza — bom te ver de volta.'}
            </h1>
            <p className="mb-fh-4">
              Vou só confirmar rapidinho o que já tenho seu por aqui, e perguntar o
              que ainda falta.
            </p>
          </div>
        ) : (
          <div>
            <h1 className={h1Cls}>Primeira vez por aqui — bem-vindo.</h1>
            <p className="mb-fh-4">
              Vamos do começo, então. Algumas perguntas sobre saúde primeiro,
              depois sobre você.
            </p>
          </div>
        )

      // 3 — Data de nascimento ◄── GATE
      case 3:
        return (
          <div>
            <h2 className={h2Cls}>Sua data de nascimento.</h2>
            <p className={mutedCls}>Preciso confirmar antes de seguir.</p>
            <Input
              className={fieldCls}
              label="Data de nascimento"
              type="date"
              required
              value={state.birth_date}
              onChange={(e) => set({ birth_date: e.target.value, birthError: null })}
              error={state.birthError ?? undefined}
            />
          </div>
        )

      // 4 — Região do corpo
      case 4:
        return (
          <div>
            <h2 className={h2Cls}>Onde vai ser a tatuagem?</h2>
            <p className={mutedCls}>
              Só a região — braço, costela, coxa, costas. Preciso saber pra te
              perguntar certo sobre a pele.
            </p>
            <Input
              className={fieldCls}
              label="Região do corpo"
              type="text"
              value={state.body_region}
              onChange={(e) => set({ body_region: e.target.value, bodyError: null })}
              placeholder="Ex.: antebraço esquerdo"
              error={state.bodyError ?? undefined}
            />
          </div>
        )

      // 5 — Alergias
      case 5:
        return (
          <div>
            <h2 className={h2Cls}>Você tem alguma alergia conhecida?</h2>
            <p className={mutedCls}>
              Pode ser a látex, antisséptico, anestésico, antibiótico, metal,
              pigmento, adesivo — qualquer coisa que já te causou reação.
            </p>
            <OptionPills
              value={state.has_allergies}
              onChange={(v) => set({ has_allergies: v as YN, allergiesError: null })}
              options={[
                { value: 'yes', label: 'Sim, tenho' },
                { value: 'no', label: 'Não tenho' },
              ]}
            />
            {state.allergiesError && <p className={errCls}>{state.allergiesError}</p>}
            {state.has_allergies === 'yes' && (
              <Textarea
                className={fieldCls}
                label="Pode me contar quais?"
                value={state.allergies_detail}
                onChange={(e) => set({ allergies_detail: e.target.value })}
                autoFocus
              />
            )}
          </div>
        )

      // 6 — Medicação regular
      case 6:
        return (
          <div>
            <h2 className={h2Cls}>Você toma alguma medicação no dia a dia?</h2>
            <p className={mutedCls}>
              Vale qualquer remédio de uso contínuo, mesmo que pareça simples.
            </p>
            <OptionPills
              value={state.takes_medication}
              onChange={(v) => set({ takes_medication: v as YN, medicationError: null })}
              options={[
                { value: 'yes', label: 'Sim, tomo' },
                { value: 'no', label: 'Não tomo' },
              ]}
            />
            {state.medicationError && <p className={errCls}>{state.medicationError}</p>}
            {state.takes_medication === 'yes' && (
              <Textarea
                className={fieldCls}
                label="Pode me contar quais?"
                helperText="Se for anticoagulante, imunossupressor ou algo pra autoimune, é especialmente importante eu saber."
                value={state.medications_detail}
                onChange={(e) => set({ medications_detail: e.target.value })}
                autoFocus
              />
            )}
          </div>
        )

      // 7 — Diabetes
      case 7:
        return (
          <div>
            <h2 className={h2Cls}>Você tem diabetes?</h2>
            <OptionPills
              value={state.has_diabetes}
              onChange={(v) => set({ has_diabetes: v as YN, diabetesError: null })}
              options={[
                { value: 'yes', label: 'Sim' },
                { value: 'no', label: 'Não' },
              ]}
            />
            {state.diabetesError && <p className={errCls}>{state.diabetesError}</p>}
          </div>
        )

      // 8 — Pele no local (contextualizado pelo step 4)
      case 8:
        return (
          <div>
            <h2 className={h2Cls}>
              Como está a pele em {state.body_region.trim() || 'onde vai ser a tatuagem'}?
            </h2>
            <p className={mutedCls}>
              Pergunto sobre psoríase, eczema, vitiligo, machucado recente, queloide
              de outra tatuagem, qualquer coisa fora do normal naquela área.
            </p>
            <OptionPills
              value={state.has_skin_condition}
              onChange={(v) => set({ has_skin_condition: v as YN, skinError: null })}
              options={[
                { value: 'no', label: 'Tá tudo certo' },
                { value: 'yes', label: 'Tem alguma coisa' },
              ]}
            />
            {state.skinError && <p className={errCls}>{state.skinError}</p>}
            {state.has_skin_condition === 'yes' && (
              <Textarea
                className={fieldCls}
                label="Me conta um pouco mais?"
                value={state.skin_condition_detail}
                onChange={(e) => set({ skin_condition_detail: e.target.value })}
                autoFocus
              />
            )}
          </div>
        )

      // 9 — Gravidez / amamentação (5 opções)
      case 9:
        return (
          <div>
            <h2 className={h2Cls}>Você está grávida ou amamentando?</h2>
            <p className={mutedCls}>
              Sem julgamento — só importante a gente saber pra pensar juntos no
              melhor momento.
            </p>
            <OptionPills
              value={state.pregnancy_status}
              onChange={(v) => set({ pregnancy_status: v, pregnancyError: null })}
              stacked
              options={[
                { value: 'pregnant', label: 'Estou grávida' },
                { value: 'breastfeeding', label: 'Estou amamentando' },
                { value: 'no', label: 'Não' },
                { value: 'prefer_not_say', label: 'Prefiro não dizer' },
                { value: 'not_applicable', label: 'Não se aplica' },
              ]}
            />
            {state.pregnancyError && <p className={errCls}>{state.pregnancyError}</p>}
          </div>
        )

      // 10 — Saúde geral (texto livre, opcional)
      case 10:
        return (
          <div>
            <h2 className={h2Cls}>
              Tem alguma condição de saúde, infecção transmissível pelo sangue, ou
              tratamento em curso que possa afetar cicatrização, sangramento, risco
              de infecção, ou que peça acompanhamento médico antes de tatuar?
            </h2>
            <p className={mutedCls}>
              Pode ser texto livre. Tudo que você me contar fica entre a gente.
            </p>
            <Textarea
              className={fieldCls}
              value={state.health_notes}
              onChange={(e) => set({ health_notes: e.target.value })}
              placeholder="Opcional."
            />
          </div>
        )

      // 11 — Últimas 24h (3 opções)
      case 11:
        return (
          <div>
            <h2 className={h2Cls}>
              Nas últimas 24 horas antes da sessão, você pretende beber álcool ou
              usar alguma substância que afete coagulação?
            </h2>
            <p className={mutedCls}>
              Pergunto porque mexe com sangramento, sensação na hora e qualidade da
              cicatrização.
            </p>
            <OptionPills
              value={state.recent_substances}
              onChange={(v) => set({ recent_substances: v, substancesError: null })}
              stacked
              options={[
                { value: 'will_not', label: 'Não pretendo' },
                { value: 'will', label: 'Pretendo' },
                { value: 'discuss_in_session', label: 'Prefiro só conversar sobre isso na hora' },
              ]}
            />
            {state.substancesError && <p className={errCls}>{state.substancesError}</p>}
          </div>
        )

      // 12 — RESPIRO 1
      case 12:
        return (
          <div>
            <h1 className={h1Cls}>Pronto.</h1>
            <p className="mb-fh-4">
              A parte de saúde tá fechada. Agora um momento sobre o que a gente
              combina juntos.
            </p>
          </div>
        )

      // 13 — Documento
      case 13:
        if (isFilled(13) && !state.docEditing) {
          const p = state.profile!
          const last3 = (p.extra.document_number ?? '').slice(-3)
          return (
            <div>
              <h2 className={h2Cls}>
                Documento já registrado: {(p.extra.document_type ?? '').toUpperCase()}{' '}
                terminado em …{last3}.
              </h2>
              <p className={mutedCls}>Continua válido?</p>
              <OptionPills
                value=""
                onChange={(v) => {
                  if (v === 'edit') set({ docEditing: true, docError: null })
                  else advance()
                }}
                options={[
                  { value: 'confirm', label: 'Confirmar' },
                  { value: 'edit', label: 'Atualizar' },
                ]}
              />
            </div>
          )
        }
        return (
          <div>
            <h2 className={h2Cls}>
              Pra fechar nosso registro, preciso de um documento de identificação.
            </h2>
            <p className={mutedCls}>CPF, RG ou CNH — como preferir.</p>
            <OptionPills
              value={state.document_type}
              onChange={(v) => set({ document_type: v, docError: null })}
              options={[
                { value: 'cpf', label: 'CPF' },
                { value: 'rg', label: 'RG' },
                { value: 'cnh', label: 'CNH' },
              ]}
            />
            <Input
              className={fieldCls}
              label="Número do documento"
              type="text"
              value={state.document_number}
              onChange={(e) => set({ document_number: e.target.value, docError: null })}
              error={state.docError ?? undefined}
            />
          </div>
        )

      // 14 — Consentimento do procedimento (texto congelado — legal/anamnese_v1)
      case 14:
        return (
          <div>
            <h2 className={h2Cls}>Uma confirmação importante.</h2>
            <Card className="my-fh-5">
              <p className="mb-fh-4">Eu entendo e concordo que:</p>
              <ul className={listCls}>
                <li>Estou pedindo essa tatuagem por escolha minha, sem pressão de ninguém.</li>
                <li>Tatuagem é permanente. Pode precisar de retoque depois de cicatrizada.</li>
                <li>
                  Existem riscos conhecidos: cicatrização variável, reação alérgica
                  rara, infecção se o cuidado pós não for seguido.
                </li>
                <li>As informações de saúde que dei aqui são verdadeiras.</li>
                <li>
                  O Julio pode adiar ou recusar a sessão se identificar algum risco
                  — pela segurança dos dois lados.
                </li>
                <li>Vou receber e seguir as orientações de cuidado depois da sessão.</li>
              </ul>
              <div className="mt-fh-4 pt-fh-4 border-t border-fh-subtle">
                <Checkbox
                  label="Confirmo todas essas combinações"
                  checked={state.procedure_accepted}
                  onChange={(e) =>
                    set({ procedure_accepted: e.target.checked, procedureError: null })
                  }
                />
              </div>
            </Card>
            {state.procedureError && <p className={errCls}>{state.procedureError}</p>}
          </div>
        )

      // 15 — Consentimento de dados de saúde (texto congelado, DESTACADO)
      case 15:
        return (
          <div>
            <h2 className={h2Cls}>Uma autorização separada, e ela é específica.</h2>
            <Card accent className="my-fh-5 flex flex-col gap-fh-4">
              <p>
                As informações de saúde que você acabou de me dar — alergias,
                medicação, condição de pele, e o que mais tiver aparecido aqui — são
                dados sensíveis. A lei trata elas de um jeito diferente, e eu também.
              </p>
              <p>
                Elas servem pra uma coisa só: decidir se dá pra tatuar com segurança,
                e como. Não vão pra lista de e-mail, não viram post, não vão pra
                lugar nenhum.
              </p>
              <p>
                Ficam guardadas porque a vigilância sanitária pede registro do
                procedimento. Você pode pedir acesso, correção ou apagamento quando
                quiser — e revogar essa autorização também, falando comigo no
                WhatsApp (11) 97661-7569.
              </p>
              <div className="pt-fh-4 border-t border-fh-subtle">
                <Checkbox
                  label="Autorizo o uso das minhas informações de saúde pra isso"
                  checked={state.health_accepted}
                  onChange={(e) =>
                    set({ health_accepted: e.target.checked, healthConsentError: null })
                  }
                />
              </div>
            </Card>
            {state.healthConsentError && <p className={errCls}>{state.healthConsentError}</p>}
          </div>
        )

      // 16 — LGPD geral (texto congelado; pula se vigente < 12 meses)
      case 16:
        return (
          <div>
            <h2 className={h2Cls}>Sobre seus dados.</h2>
            <Card className="my-fh-5">
              <p className="mb-fh-4">Seus dados ficam com a gente pra:</p>
              <ul className={listCls}>
                <li>Fazer e registrar seu atendimento.</li>
                <li>Cumprir o que a lei pede.</li>
                <li>
                  Manter seu cadastro atualizado e te avisar sobre próximas agendas e
                  novidades — se você quiser, claro.
                </li>
              </ul>
              <p className="mt-fh-4">
                Você pode pedir acesso, correção ou apagamento desses dados quando
                quiser, no WhatsApp (11) 97661-7569.
              </p>
              <div className="mt-fh-4 pt-fh-4 border-t border-fh-subtle">
                <Checkbox
                  label="Entendi e concordo"
                  checked={state.lgpd_accepted}
                  onChange={(e) => set({ lgpd_accepted: e.target.checked, lgpdError: null })}
                />
              </div>
            </Card>
            {state.lgpdError && <p className={errCls}>{state.lgpdError}</p>}
          </div>
        )

      // 17 — Autorização de imagem (texto congelado; confirma se já respondeu)
      case 17:
        if (isFilled(17)) {
          const cur: YN = state.profile?.image ? 'yes' : 'no'
          const opp: YN = cur === 'yes' ? 'no' : 'yes'
          return (
            <div>
              <h2 className={h2Cls}>
                Autorização de imagem: você disse {cur === 'yes' ? 'SIM' : 'NÃO'}.
                Continua valendo?
              </h2>
              <OptionPills
                value={state.image_opt_in}
                onChange={(v) => set({ image_opt_in: v as YN, imageError: null })}
                options={[
                  { value: cur, label: 'Confirmar' },
                  { value: opp, label: 'Mudar' },
                ]}
              />
              {state.imageError && <p className={errCls}>{state.imageError}</p>}
            </div>
          )
        }
        return (
          <div>
            <h2 className={h2Cls}>Última coisa do consentimento — e essa é opcional.</h2>
            <p className="mb-fh-4">
              Posso usar fotos do trabalho finalizado no Instagram, portfólio e site
              da Flag Haus?
            </p>
            <p className={mutedCls}>Sem rosto, sem identificação — só a tatuagem.</p>
            <OptionPills
              value={state.image_opt_in}
              onChange={(v) => set({ image_opt_in: v as YN, imageError: null })}
              options={[
                { value: 'yes', label: 'Sim, pode usar' },
                { value: 'no', label: 'Prefiro que não' },
              ]}
            />
            {state.imageError && <p className={errCls}>{state.imageError}</p>}
          </div>
        )

      // 18 — RESPIRO 2
      case 18:
        return (
          <div>
            <h1 className={h1Cls}>Boa.</h1>
            <p className="mb-fh-4">Última parte. Quero te conhecer um pouco melhor.</p>
          </div>
        )

      // 19 — Nome completo
      case 19:
        return isFilled(19) ? (
          <ConfirmField
            label={`Você é ${state.profile?.name}, certo?`}
            value={state.name}
            onChange={(v) => set({ name: v })}
            editLabel="Corrigir"
          />
        ) : (
          <div>
            <h2 className={h2Cls}>Como você se chama?</h2>
            <p className={mutedCls}>Nome completo, do jeito que aparece no documento.</p>
            <Input
              className={fieldCls}
              label="Nome completo"
              type="text"
              value={state.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
        )

      // 20 — E-mail
      case 20:
        return isFilled(20) ? (
          <ConfirmField
            label={`Teu e-mail continua sendo ${state.profile?.email}?`}
            value={state.email}
            onChange={(v) => set({ email: v })}
            editLabel="Atualizar"
            inputType="email"
          />
        ) : (
          <div>
            <h2 className={h2Cls}>Seu e-mail.</h2>
            <Input
              className={fieldCls}
              label="E-mail"
              optionalText="opcional"
              type="email"
              value={state.email}
              onChange={(e) => set({ email: e.target.value, emailError: null })}
              error={state.emailError ?? undefined}
            />
          </div>
        )

      // 21 — Bairro e cidade
      case 21:
        return isFilled(21) ? (
          <ConfirmField
            label={`Você mora em ${state.profile?.extra.neighborhood}${
              state.profile?.extra.city ? `, ${state.profile.extra.city}` : ''
            }?`}
            value={state.neighborhood}
            onChange={(v) => set({ neighborhood: v })}
            editLabel="Atualizar"
            renderEditor={() => (
              <GeoFields
                neighborhood={state.neighborhood}
                city={state.city}
                onNeighborhood={(v) => set({ neighborhood: v })}
                onCity={(v) => set({ city: v, cityError: null })}
                onCoords={(lat, lng) => set({ lat, lng })}
                lat={state.lat}
                lng={state.lng}
                cityError={state.cityError}
              />
            )}
          />
        ) : (
          <div>
            <h2 className={h2Cls}>Em que bairro você mora?</h2>
            <p className={mutedCls}>
              Se preferir, pode permitir o acesso à localização — assim eu preencho
              pra você. Sem isso, é só digitar.
            </p>
            <GeoFields
              neighborhood={state.neighborhood}
              city={state.city}
              onNeighborhood={(v) => set({ neighborhood: v })}
              onCity={(v) => set({ city: v, cityError: null })}
              onCoords={(lat, lng) => set({ lat, lng })}
              lat={state.lat}
              lng={state.lng}
              cityError={state.cityError}
            />
          </div>
        )

      // 22 — Como conheceu (pula se já tem)
      case 22:
        return (
          <div>
            <h2 className={h2Cls}>Como você chegou na Flag Haus?</h2>
            <p className={mutedCls}>
              Indicação, Google, Instagram, viu numa rua, num post de alguém —
              qualquer caminho.
            </p>
            <OptionPills
              value={state.acquisition_source}
              onChange={(v) => set({ acquisition_source: v })}
              stacked
              options={[
                { value: 'indicacao', label: 'Indicação' },
                { value: 'google', label: 'Google' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'rua', label: 'Vi na rua' },
                { value: 'outra_rede', label: 'Outra rede social' },
                { value: 'outro', label: 'Outro caminho — me conta' },
              ]}
            />
          </div>
        )

      // 23 — Primeira tatuagem (pula se já tem)
      case 23:
        return (
          <div>
            <h2 className={h2Cls}>Essa é sua primeira tatuagem na vida?</h2>
            <OptionPills
              value={state.is_first_tattoo}
              onChange={(v) => set({ is_first_tattoo: v as YN })}
              options={[
                { value: 'yes', label: 'Sim' },
                { value: 'no', label: 'Não' },
              ]}
            />
          </div>
        )

      // 24 — Instagram (opcional)
      case 24:
        return isFilled(24) ? (
          <ConfirmField
            label={`Teu Instagram: ${state.profile?.extra.instagram}. Continua?`}
            value={state.instagram}
            onChange={(v) => set({ instagram: v })}
            editLabel="Atualizar"
            allowRemove
          />
        ) : (
          <div>
            <h2 className={h2Cls}>Seu Instagram, se quiser deixar.</h2>
            <p className={mutedCls}>
              Sem obrigação. É só pra a gente trocar ideia por lá quando fizer
              sentido.
            </p>
            <Input
              className={fieldCls}
              label="Instagram"
              optionalText="opcional"
              type="text"
              value={state.instagram}
              onChange={(e) => set({ instagram: e.target.value })}
              placeholder="@seu.handle"
            />
          </div>
        )

      // 25 — Profissão (opcional; discreto quando já tem)
      case 25:
        return isFilled(25) ? (
          <ConfirmField
            label={`Profissão: ${state.profile?.extra.occupation}. Atualizar?`}
            value={state.occupation}
            onChange={(v) => set({ occupation: v })}
            confirmLabel="Manter"
            editLabel="Atualizar"
          />
        ) : (
          <div>
            <h2 className={h2Cls}>O que você faz?</h2>
            <p className={mutedCls}>
              Pode ser profissão, estudo, atividade principal — do jeito que você
              costuma responder essa pergunta.
            </p>
            <Input
              className={fieldCls}
              label="Profissão"
              optionalText="opcional"
              type="text"
              value={state.occupation}
              onChange={(e) => set({ occupation: e.target.value })}
            />
          </div>
        )

      // 26 — Canal de contato preferido (sempre aparece)
      case 26:
        return (
          <div>
            <h2 className={h2Cls}>
              Quando a gente precisar te avisar de algo, qual canal você prefere?
            </h2>
            <OptionPills
              value={state.preferred_channel}
              onChange={(v) => set({ preferred_channel: v })}
              options={[
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'email', label: 'E-mail' },
                { value: 'instagram', label: 'Instagram' },
                { value: 'tanto_faz', label: 'Tanto faz' },
              ]}
            />
          </div>
        )

      // 27 — Opt-in de comunicação (texto congelado; confirma se já respondeu)
      case 27:
        if (isFilled(27)) {
          const cur: YN = state.profile?.marketing ? 'yes' : 'no'
          const opp: YN = cur === 'yes' ? 'no' : 'yes'
          return (
            <div>
              <h2 className={h2Cls}>
                Sua preferência atual: {cur === 'yes' ? 'receber' : 'não receber'}{' '}
                novidades. Continua?
              </h2>
              <OptionPills
                value={state.marketing_opt_in}
                onChange={(v) => set({ marketing_opt_in: v as YN, marketingError: null })}
                options={[
                  { value: cur, label: 'Confirmar' },
                  { value: opp, label: 'Mudar' },
                ]}
              />
              {state.marketingError && <p className={errCls}>{state.marketingError}</p>}
            </div>
          )
        }
        return (
          <div>
            <h2 className={h2Cls}>
              Posso te avisar quando abrir agenda nova, flash drops, ou alguma
              novidade do estúdio?
            </h2>
            <p className={mutedCls}>Você pode mudar isso a qualquer momento.</p>
            <OptionPills
              value={state.marketing_opt_in}
              onChange={(v) => set({ marketing_opt_in: v as YN, marketingError: null })}
              options={[
                { value: 'yes', label: 'Sim, pode' },
                { value: 'no', label: 'Prefiro não' },
              ]}
            />
            {state.marketingError && <p className={errCls}>{state.marketingError}</p>}
          </div>
        )

      // 28 — Estilos / temas (opcional)
      case 28:
        return isFilled(28) ? (
          <ConfirmField
            label={`Da última vez você falou sobre ${state.profile?.extra.interests}. Algo mudou ou quer adicionar?`}
            value={state.interests}
            onChange={(v) => set({ interests: v })}
            confirmLabel="Manter"
            editLabel="Adicionar / atualizar"
            renderEditor={(val, onChange) => (
              <Textarea
                value={val}
                onChange={(e) => onChange(e.target.value)}
                autoFocus
              />
            )}
          />
        ) : (
          <div>
            <h2 className={h2Cls}>Que tipo de tatuagem te atrai mais hoje?</h2>
            <p className={mutedCls}>
              Pode ser estilo (fineline, traço, ornamental, autoral livre), tema
              (natureza, escrita, geometria, retrato), parte do corpo que você ainda
              quer trabalhar, ou só uma vibe que tem rondado.
            </p>
            <Textarea
              className={fieldCls}
              value={state.interests}
              onChange={(e) => set({ interests: e.target.value })}
              placeholder="Solta aí — opcional."
            />
          </div>
        )

      // 29 — Motivação (opcional, por sessão)
      case 29:
        return (
          <div>
            <h2 className={h2Cls}>O que te trouxe pra essa tatuagem?</h2>
            <p className={mutedCls}>
              Pode ser uma fase, uma data, algo que você sempre quis, uma ideia que
              veio agora. Pode ser nada disso e tá tudo bem também. Se quiser contar,
              é uma das partes mais legais do processo pra mim.
            </p>
            <Textarea
              className={fieldCls}
              value={state.motivation}
              onChange={(e) => set({ motivation: e.target.value })}
              placeholder="Opcional."
            />
          </div>
        )

      // 30 — Fechamento (pré-submit)
      case 30:
        return (
          <div>
            <h2 className={h2Cls}>Fechando.</h2>
            <p className={mutedCls}>
              Se quiser mudar alguma coisa, dá pra voltar. Se tá tudo certo, é só
              concluir.
            </p>
            {state.submitError && (
              <Alert variant="warning" title="Não deu pra salvar" className="mt-fh-4">
                {state.submitError}
              </Alert>
            )}
          </div>
        )

      default:
        return null
    }
  }
}
