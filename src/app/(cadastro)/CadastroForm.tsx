'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { isValidPhoneNumber, type CountryCode } from 'libphonenumber-js/max'
import type {
  GetProfileResult,
  PersonProfile,
  CadastroPayload,
  SubmitCadastroResult,
} from '@/app/actions/people'
import { calculateAge } from '@/lib/utils/age'
import { StepShell } from '@/components/form/StepShell'
import { TerminalScreen } from '@/components/form/TerminalScreen'
import { OptionPills } from '@/components/form/OptionPills'
import { ConfirmField } from '@/components/form/ConfirmField'
import { GeoFields } from '@/components/form/GeoFields'
import { PhoneField } from '@/components/form/PhoneField'
import { Alert, Card, Checkbox, Input, Textarea } from '@/components/ui'

type Props = {
  getProfileAction: (phone: string, country?: string) => Promise<GetProfileResult>
  submitAction: (payload: CadastroPayload) => Promise<SubmitCadastroResult>
}

type FormState = {
  stepIndex: number
  visibleSteps: number[]
  mode: 'new' | 'returning'
  profile: PersonProfile | null

  phone: string
  country: string
  phoneError: string | null

  name: string
  email: string
  emailError: string | null
  birth_date: string
  birthError: string | null
  neighborhood: string
  city: string
  cityError: string | null
  lat: number | null
  lng: number | null
  acquisition_source: string
  is_first_tattoo: string // '' | 'yes' | 'no'
  instagram: string
  occupation: string
  interests: string
  preferred_channel: string
  marketing_opt_in: string // '' | 'yes' | 'no'
  motivation: string
  circulation_areas: string
  lgpd_accepted: boolean
  lgpdError: string | null

  submitError: string | null
  done: boolean
  blocked: boolean // gate de idade: menor de 18 → tela terminal, sem escrita
}

// Ordem EXPLÍCITA dos steps (não é a ordem numérica). O gate de idade
// (step 6, data de nascimento) é obrigatório e foi movido pra logo após o
// reconhecimento (step 3), antes de qualquer outra pergunta. O antigo step 6
// "opcional" foi removido — migrou pra cá, não duplicou.
const ALL_STEPS = [1, 2, 3, 6, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

/** Lista de steps visíveis: por campo, não por modo (Spec #3b). */
function computeVisible(
  mode: 'new' | 'returning',
  profile: PersonProfile | null
): number[] {
  if (mode === 'new' || !profile) return ALL_STEPS
  return ALL_STEPS.filter((s) => {
    switch (s) {
      case 6:
        // gate de idade: pula só quem já tem nascimento válido de maior de 18.
        // Sem data (ou data inválida/menor) → renderiza (perguntar ou bloquear).
        if (!profile.birth_date) return true
        return (calculateAge(profile.birth_date) ?? -1) < 18
      case 8:
        return !profile.extra.acquisition_source
      case 9:
        return profile.extra.is_first_tattoo === undefined
      case 11:
        return !profile.extra.occupation
      case 16:
        return !profile.extra.circulation_areas
      case 17:
        return !profile.lgpd_valid
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
  name: '',
  email: '',
  emailError: null,
  birth_date: '',
  birthError: null,
  neighborhood: '',
  city: '',
  cityError: null,
  lat: null,
  lng: null,
  acquisition_source: '',
  is_first_tattoo: '',
  instagram: '',
  occupation: '',
  interests: '',
  preferred_channel: '',
  marketing_opt_in: '',
  motivation: '',
  circulation_areas: '',
  lgpd_accepted: false,
  lgpdError: null,
  submitError: null,
  done: false,
  blocked: false,
}

// Só espaçamento: cor, tamanho e peso de h1/h2/p vêm do base.css do padrão.
const h1Cls = 'mb-fh-5'
const h2Cls = 'mb-fh-4'
const mutedCls = 'fh-lead mb-fh-5'
const fieldCls = 'my-fh-6'

export function CadastroForm({ getProfileAction, submitAction }: Props) {
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

  // Guarda contra submit duplo (Enter dobrado / Enter + clique). Ver handleSubmit.
  const submitLockRef = useRef(false)

  // Enter avança o step chamando o MESMO handler do botão. Refs mantêm o handler
  // e as guardas sempre frescos sem re-anexar o listener a cada render.
  const handleNextRef = useRef<() => void>(() => {})
  const guardRef = useRef({ isPending, blocked: state.blocked, done: state.done })
  handleNextRef.current = handleNext
  guardRef.current = { isPending, blocked: state.blocked, done: state.done }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return
      // Dropdown de autocomplete aberto chama preventDefault ao selecionar:
      // nesse caso NÃO avançamos o step (coordenação com o Item 3).
      if (e.defaultPrevented) return
      // <textarea>: Enter é quebra de linha, nunca avanço.
      const t = e.target as HTMLElement | null
      if (t && t.tagName === 'TEXTAREA') return
      const g = guardRef.current
      // Telas terminais (bloqueio/sucesso) e enquanto uma ação está em voo: nada.
      if (g.blocked || g.done || g.isPending) return
      e.preventDefault()
      handleNextRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const set = (patch: Partial<FormState>) =>
    setState((s) => ({ ...s, ...patch }))

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
      case 4:
        return !!p.name
      case 5:
        return !!p.email
      case 7:
        // confirma só quando já temos bairro E cidade. Sem cidade (obrigatória),
        // cai no form completo pra exigir o preenchimento — não pode pular.
        return !!p.extra.neighborhood && !!p.extra.city
      case 10:
        return !!p.extra.instagram
      case 12:
        return !!p.extra.interests
      case 14:
        return p.marketing_opt_in !== null
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
        // gate de idade: returning já cadastrado como menor → bloqueio imediato.
        const age = p.birth_date ? calculateAge(p.birth_date) : null
        const minor = age !== null && age < 18
        setState((s) => ({
          ...s,
          mode: 'returning',
          profile: p,
          visibleSteps: visible,
          stepIndex: visible.indexOf(3),
          blocked: minor,
          name: p.name ?? '',
          email: p.email ?? '',
          birth_date: p.birth_date ?? '',
          neighborhood: p.extra.neighborhood ?? '',
          city: p.extra.city ?? '',
          instagram: p.extra.instagram ?? '',
          interests: p.extra.interests ?? '',
          acquisition_source: p.extra.acquisition_source ?? '',
          occupation: p.extra.occupation ?? '',
          circulation_areas: p.extra.circulation_areas ?? '',
          preferred_channel: p.extra.preferred_channel ?? '',
          is_first_tattoo:
            p.extra.is_first_tattoo === undefined
              ? ''
              : p.extra.is_first_tattoo
                ? 'yes'
                : 'no',
          marketing_opt_in:
            p.marketing_opt_in === null
              ? ''
              : p.marketing_opt_in
                ? 'yes'
                : 'no',
          phoneError: null,
        }))
      } else if (r.status === 'not_found') {
        setState((s) => ({
          ...s,
          mode: 'new',
          profile: null,
          visibleSteps: ALL_STEPS,
          stepIndex: ALL_STEPS.indexOf(3),
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
      // menor de 18: tela terminal, nenhuma escrita (submit é único no final).
      set({ birthError: null, blocked: true })
      return
    }
    set({ birthError: null })
    advance()
  }

  function handleLocationNext() {
    // cidade é obrigatória (unidade analítica mínima da base); bairro é opcional.
    if (!state.city.trim()) {
      set({ cityError: 'Precisa preencher pra seguir.' })
      return
    }
    set({ cityError: null })
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

  function handleLgpdNext() {
    if (!state.lgpd_accepted) {
      set({ lgpdError: 'Precisa concordar pra concluir' })
      return
    }
    set({ lgpdError: null })
    advance()
  }

  function buildPayload(): CadastroPayload {
    const visible = (s: number) => state.visibleSteps.includes(s)
    const extra: Record<string, string | boolean> = {}

    // step 7 (sempre visível): bairro opcional, cidade obrigatória (sempre vai)
    if (state.neighborhood.trim()) extra.neighborhood = state.neighborhood.trim()
    extra.city = state.city.trim()
    // step 8
    if (visible(8) && state.acquisition_source)
      extra.acquisition_source = state.acquisition_source
    // step 9
    if (visible(9) && (state.is_first_tattoo === 'yes' || state.is_first_tattoo === 'no'))
      extra.is_first_tattoo = state.is_first_tattoo === 'yes'
    // step 10 (sempre visível; Remover → "")
    if (visible(10)) {
      const v = state.instagram.trim()
      const had = state.mode === 'returning' && !!state.profile?.extra.instagram
      if (v) extra.instagram = v
      else if (had) extra.instagram = ''
    }
    // step 11
    if (visible(11) && state.occupation.trim())
      extra.occupation = state.occupation.trim()
    // step 12 (sempre visível)
    if (state.interests.trim()) extra.interests = state.interests.trim()
    // step 13 (sempre visível)
    if (state.preferred_channel) extra.preferred_channel = state.preferred_channel
    // step 16
    if (visible(16) && state.circulation_areas.trim())
      extra.circulation_areas = state.circulation_areas.trim()

    return {
      submission_id: submissionId,
      phone: state.phone,
      country: state.country,
      mode: state.mode,
      name: state.name.trim() || null,
      email: state.email.trim() || null,
      // sempre presente e válido ao chegar no submit: o gate obrigatório
      // (step 6) barra o avanço sem data >= 18.
      birth_date: state.birth_date,
      lat: state.lat,
      lng: state.lng,
      extra_data: extra,
      lgpd_accepted: visible(17) ? state.lgpd_accepted : null,
      marketing_opt_in:
        state.marketing_opt_in === 'yes'
          ? true
          : state.marketing_opt_in === 'no'
            ? false
            : null,
      motivation: state.motivation.trim() || null,
    }
  }

  function handleSubmit() {
    // Guarda síncrona contra duplo disparo: dois Enter em sequência (ou Enter +
    // clique) podem cair aqui antes de `isPending` virar no próximo render.
    // O lock fecha na hora e só reabre quando a Server Action responde.
    if (submitLockRef.current) return
    submitLockRef.current = true
    const payload = buildPayload()
    set({ submitError: null })
    startTransition(async () => {
      const r = await submitAction(payload)
      submitLockRef.current = false
      if (r.status === 'ok') {
        setState((s) => ({ ...s, done: true, submitError: null }))
      } else {
        // Mensagem específica da action (Zod → reason; RPC traduzida → message)
        // quando houver; senão o texto genérico.
        set({
          submitError:
            (r.status === 'invalid' ? r.reason : r.message) ||
            'Algo deu errado ao salvar. Suas respostas continuam aqui — tenta de novo?',
        })
      }
    })
  }

  function handleNext() {
    switch (currentStep) {
      case 2:
        return handlePhoneNext()
      case 6:
        return handleGateNext()
      case 7:
        return handleLocationNext()
      case 5:
        return handleEmailNext()
      case 17:
        return handleLgpdNext()
      case 18:
        return handleSubmit()
      default:
        return advance()
    }
  }

  // ── Tela de bloqueio (menor de 18) ──
  // Terminal: sem avançar, sem voltar, NENHUMA escrita (não chama submit,
  // não dispara Server Action, não registra evento).
  if (state.blocked) {
    return (
      <TerminalScreen title="Obrigado pela honestidade.">
        <p>
          Ainda não posso te cadastrar — a gente não tatua menores de 18, sem
          exceção.
        </p>
        <p>Quando você completar 18, a gente vai estar aqui.</p>
      </TerminalScreen>
    )
  }

  // ── Tela de sucesso (substitui o step 18) ──
  if (state.done) {
    return (
      <TerminalScreen title="Pronto. Cadastro atualizado.">
        <p>
          Agora consigo te avisar com mais precisão sobre agenda, retornos e o
          que a gente for soltando por aqui.
        </p>
        <p>Obrigado pelo tempo — significa que a casa continua sua.</p>
      </TerminalScreen>
    )
  }

  const nextLabel =
    currentStep === 1
      ? 'Bora'
      : currentStep === 3
        ? 'Seguir'
        : currentStep === 2
          ? isPending
            ? 'Buscando…'
            : 'Continuar'
          : currentStep === 18
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
      // 1 — Abertura
      case 1:
        return (
          <div>
            <h1 className={h1Cls}>Oi.</h1>
            <p className="mb-fh-4">
              Tô organizando aqui o cadastro de quem já passou pela Flag Haus,
              pra manter teu histórico bem feito e melhorar como a gente conversa
              daqui pra frente.
            </p>
            <p className="mb-fh-4">
              Leva menos de 3 minutos. Tudo que você não quiser preencher pode
              pular.
            </p>
            <p className="fh-lead mt-fh-6">— Julio</p>
          </div>
        )

      // 2 — Telefone
      case 2:
        return (
          <div>
            <h2 className={h2Cls}>
              Pra eu te achar no cadastro: qual o seu WhatsApp?
            </h2>
            <PhoneField
              phone={state.phone}
              country={state.country}
              onPhoneChange={(v) => set({ phone: v, phoneError: null })}
              onCountryChange={(c) => set({ country: c, phoneError: null })}
              error={state.phoneError}
            />
          </div>
        )

      // 3 — Reconhecimento
      case 3:
        return state.mode === 'returning' ? (
          <div>
            <h1 className={h1Cls}>
              {state.profile?.name
                ? `${state.profile.name}, que bom — já te encontrei aqui.`
                : 'Que bom — já te encontrei aqui.'}
            </h1>
            <p className="mb-fh-4">
              Vou confirmar o que tenho e perguntar só o que falta.
            </p>
          </div>
        ) : (
          <div>
            <h1 className={h1Cls}>
              Não te encontrei na base ainda — vamos começar então.
            </h1>
            <p className="mb-fh-4">
              Algumas perguntas rápidas pra te cadastrar direito.
            </p>
          </div>
        )

      // 4 — Nome
      case 4:
        return isFilled(4) ? (
          <ConfirmField
            label={`Você é ${state.profile?.name}, certo?`}
            value={state.name}
            onChange={(v) => set({ name: v })}
            editLabel="Corrigir"
          />
        ) : (
          <div>
            <h2 className={h2Cls}>Como você se chama?</h2>
            <p className={mutedCls}>
              Nome completo, do jeito que aparece no documento.
            </p>
            <Input
              className={fieldCls}
              label="Nome completo"
              type="text"
              value={state.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
        )

      // 5 — E-mail
      case 5:
        return isFilled(5) ? (
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

      // 6 — Gate de idade (obrigatório, logo após o reconhecimento)
      case 6:
        return (
          <div>
            <h2 className={h2Cls}>Sua data de nascimento.</h2>
            <p className={mutedCls}>
              Só tatuamos maiores de 18. Essa é a única que não dá pra pular.
            </p>
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

      // 7 — Bairro
      case 7:
        return isFilled(7) ? (
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
              Se preferir, pode permitir o acesso à localização — assim eu
              preencho o endereço pra você. Sem isso, é só digitar.
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

      // 8 — Como conheceu
      case 8:
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

      // 9 — Primeira tatuagem
      case 9:
        return (
          <div>
            <h2 className={h2Cls}>Essa é sua primeira tatuagem na vida?</h2>
            <OptionPills
              value={state.is_first_tattoo}
              onChange={(v) => set({ is_first_tattoo: v })}
              options={[
                { value: 'yes', label: 'Sim' },
                { value: 'no', label: 'Não' },
              ]}
            />
          </div>
        )

      // 10 — Instagram
      case 10:
        return isFilled(10) ? (
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

      // 11 — Profissão
      case 11:
        return (
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

      // 12 — Estilos / temas
      case 12:
        return isFilled(12) ? (
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
              (natureza, escrita, geometria, retrato), parte do corpo que você
              ainda quer trabalhar, ou só uma vibe que tem rondado.
            </p>
            <Textarea
              className={fieldCls}
              value={state.interests}
              onChange={(e) => set({ interests: e.target.value })}
              placeholder="Solta aí — opcional."
            />
          </div>
        )

      // 13 — Canal preferido
      case 13:
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

      // 14 — Opt-in
      case 14: {
        if (isFilled(14)) {
          const cur = state.profile?.marketing_opt_in ? 'yes' : 'no'
          const opp = cur === 'yes' ? 'no' : 'yes'
          return (
            <div>
              <h2 className={h2Cls}>
                Sua preferência atual:{' '}
                {state.profile?.marketing_opt_in ? 'receber' : 'não receber'}{' '}
                novidades. Continua?
              </h2>
              <OptionPills
                value={state.marketing_opt_in}
                onChange={(v) => set({ marketing_opt_in: v })}
                options={[
                  { value: cur, label: 'Confirmar' },
                  { value: opp, label: 'Mudar' },
                ]}
              />
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
              onChange={(v) => set({ marketing_opt_in: v })}
              options={[
                { value: 'yes', label: 'Sim, pode' },
                { value: 'no', label: 'Prefiro não' },
              ]}
            />
          </div>
        )
      }

      // 15 — Motivação
      case 15:
        return (
          <div>
            <h2 className={h2Cls}>O que te trouxe pra essa tatuagem?</h2>
            <p className={mutedCls}>
              Pode ser uma fase, uma data, algo que você sempre quis, uma ideia
              que veio agora. Pode ser nada disso e tá tudo bem também. Se quiser
              contar, é uma das partes mais legais do processo pra mim.
            </p>
            <Textarea
              className={fieldCls}
              value={state.motivation}
              onChange={(e) => set({ motivation: e.target.value })}
              placeholder="Opcional."
            />
          </div>
        )

      // 16 — Onde circula
      case 16:
        return (
          <div>
            <h2 className={h2Cls}>Por onde você costuma circular em São Paulo?</h2>
            <p className={mutedCls}>
              Bairros, regiões, lugares que você frequenta. Ajuda a entender o
              fluxo de quem chega aqui.
            </p>
            <Textarea
              className={fieldCls}
              value={state.circulation_areas}
              onChange={(e) => set({ circulation_areas: e.target.value })}
              placeholder="Opcional."
            />
          </div>
        )

      // 17 — LGPD (bloqueante)
      case 17:
        return (
          <div>
            <h2 className={h2Cls}>Sobre seus dados.</h2>
            <Card className="my-fh-5">
              <p>
                Eles ficam comigo pra manter seu cadastro, te avisar das coisas
                que você autorizou, e cumprir o que a lei pede. Você pode pedir
                acesso, correção ou apagamento quando quiser.
              </p>
              <div className="mt-fh-4 pt-fh-4 border-t border-fh-subtle">
                <Checkbox
                  label="Entendi e concordo."
                  checked={state.lgpd_accepted}
                  onChange={(e) =>
                    set({ lgpd_accepted: e.target.checked, lgpdError: null })
                  }
                />
              </div>
            </Card>
            {state.lgpdError && (
              <Alert variant="warning">{state.lgpdError}</Alert>
            )}
          </div>
        )

      // 18 — Fechamento (pré-submit)
      case 18:
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
