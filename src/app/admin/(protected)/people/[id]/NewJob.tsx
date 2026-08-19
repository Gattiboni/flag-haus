'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { createJob, type CreateJobInput } from '@/app/actions/admin-jobs'
import { Button, Checkbox, Input, RadioGroup, Select, Textarea } from '@/components/ui'

/**
 * Criação manual de job (#4d) — o cliente que chegou pelo WhatsApp, pela
 * indicação ou pela porta da rua, sem passar pelo formulário público.
 *
 * Não há dropdown de status aqui, de propósito: status é consequência, não
 * opinião. O job nasce "A orçar"; marcar "sessão já combinada" (só habilitado
 * com data preenchida) faz nascer "Confirmado". Depois disso quem move status é
 * o Funil, como em qualquer job — este formulário não é um segundo editor.
 *
 * Fecha em Esc como qualquer painel do admin. Ao salvar, o `revalidatePath` do
 * server re-renderiza a ficha: o job aparece em "Jobs ativos" sem que este
 * componente precise saber montar uma linha.
 */

type NumParse = { ok: true; value: number | null } | { ok: false }

function parseNum(raw: string, positive: boolean): NumParse {
  const t = raw.trim()
  if (t === '') return { ok: true, value: null }
  const n = Number(t.replace(',', '.'))
  if (Number.isNaN(n)) return { ok: false }
  if (positive ? n <= 0 : n < 0) return { ok: false }
  return { ok: true, value: n }
}

/**
 * Artista: o valor gravado é string livre em lowercase (guest de temporada não
 * vira enum no banco). A UI não é livre à toa — Select com os dois nomes da
 * casa + "Outro", que abre um campo de texto. Escolher é o caminho de 99% dos
 * jobs; digitar é a exceção, e fica visivelmente como exceção.
 */
type ArtistChoice = 'julio' | 'lethicia' | 'outro'

const ARTIST_OPTIONS: Array<{ value: ArtistChoice; label: string }> = [
  { value: 'julio', label: 'Julio' },
  { value: 'lethicia', label: 'Lethicia' },
  { value: 'outro', label: 'Outro' },
]

const EMPTY = {
  description: '',
  bodyRegion: '',
  style: '',
  sizeCm: '',
  quotedPrice: '',
  scheduledAt: '',
  sessionAgreed: false,
  // Defaults do estúdio: o job comum é tatuagem do Julio. Diferente disso, o
  // Julio troca em dois toques — mas nunca precisa preencher o caso comum.
  serviceType: 'tattoo' as 'tattoo' | 'piercing',
  artistChoice: 'julio' as ArtistChoice,
  artistOther: '',
}

export function NewJob({
  personId,
  defaultOpen = false,
}: {
  personId: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  const panelRef = useRef<HTMLDivElement | null>(null)

  // Aberto por atalho (?novo_job=1 vindo de Cadastros): rola até o formulário,
  // senão o Julio cai numa ficha longa sem sinal de que algo abriu.
  useEffect(() => {
    if (defaultOpen) {
      panelRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [defaultOpen])

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function close() {
    if (saving) return
    setOpen(false)
    setForm(EMPTY)
    setError(null)
  }

  function handleCreate() {
    if (saving) return
    setError(null)

    const size = parseNum(form.sizeCm, true)
    if (!size.ok) return setError('Tamanho inválido (deve ser maior que zero).')

    const price = parseNum(form.quotedPrice, false)
    if (!price.ok) return setError('Preço orçado inválido.')

    // "Outro" sem nome não vira job: o server aplica a mesma regra (artist
    // não-vazio), mas o erro é melhor aqui, ao lado do campo.
    const artist =
      form.artistChoice === 'outro'
        ? form.artistOther.trim().toLowerCase()
        : form.artistChoice
    if (!artist) return setError('Informe quem vai executar o job.')

    const payload: CreateJobInput = {
      personId,
      description: form.description,
      bodyRegion: form.bodyRegion,
      style: form.style,
      sizeCm: size.value,
      quotedPrice: price.value,
      scheduledAt: form.scheduledAt.trim() === '' ? null : form.scheduledAt,
      // Sem data não há sessão combinada — o server aplica a mesma regra.
      sessionAgreed: form.scheduledAt.trim() !== '' && form.sessionAgreed,
      serviceType: form.serviceType,
      artist,
    }

    startSaving(async () => {
      const res = await createJob(payload)
      if (res.status === 'ok') {
        setOpen(false)
        setForm(EMPTY)
        setError(null)
      } else {
        setError(
          res.status === 'invalid' ? res.reason : 'Não deu pra criar. Tenta de novo.'
        )
      }
    })
  }

  if (!open) {
    return (
      <div className="mb-fh-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
          icon={<Plus size={18} strokeWidth={1.5} />}
        >
          Novo job
        </Button>
      </div>
    )
  }

  const hasDate = form.scheduledAt.trim() !== ''

  return (
    <div
      ref={panelRef}
      className="mb-fh-4 flex flex-col gap-fh-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
    >
      <Textarea
        label="Descrição"
        rows={3}
        placeholder="O que o cliente pediu"
        value={form.description}
        disabled={saving}
        maxLength={2000}
        autoFocus
        onChange={(e) => set('description', e.target.value)}
      />

      {/* Tipo e artista logo depois da descrição, antes dos detalhes físicos:
          respondem "o que é" e "de quem é" — e é à luz deles que região,
          tamanho e estilo se leem. Empilhados (não no grid de 2 colunas) porque
          em 390px um RadioGroup e um Select lado a lado ficam ilegíveis. */}
      <RadioGroup
        legend="Tipo"
        name="service-type"
        value={form.serviceType}
        disabled={saving}
        onChange={(v) => set('serviceType', v === 'piercing' ? 'piercing' : 'tattoo')}
        options={[
          { value: 'tattoo', label: 'Tatuagem' },
          { value: 'piercing', label: 'Piercing' },
        ]}
      />

      <Select
        label="Artista"
        value={form.artistChoice}
        disabled={saving}
        options={ARTIST_OPTIONS}
        onChange={(e) => set('artistChoice', e.target.value as ArtistChoice)}
      />

      {form.artistChoice === 'outro' && (
        <Input
          label="Nome do artista"
          type="text"
          placeholder="Quem vai executar"
          maxLength={60}
          helperText="Guest, parceria — fica gravado em minúsculas."
          value={form.artistOther}
          disabled={saving}
          autoFocus
          onChange={(e) => set('artistOther', e.target.value)}
        />
      )}

      <div className="grid grid-cols-2 gap-fh-4">
        <Input
          label="Região do corpo"
          type="text"
          placeholder="—"
          maxLength={200}
          value={form.bodyRegion}
          disabled={saving}
          onChange={(e) => set('bodyRegion', e.target.value)}
        />
        <Input
          label="Tamanho"
          suffix="cm"
          type="text"
          inputMode="decimal"
          placeholder="—"
          value={form.sizeCm}
          disabled={saving}
          onChange={(e) => set('sizeCm', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-fh-4">
        <Input
          label="Estilo"
          type="text"
          placeholder="—"
          maxLength={100}
          value={form.style}
          disabled={saving}
          onChange={(e) => set('style', e.target.value)}
        />
        <Input
          label="Preço orçado"
          prefix="R$"
          type="text"
          inputMode="decimal"
          placeholder="—"
          value={form.quotedPrice}
          disabled={saving}
          onChange={(e) => set('quotedPrice', e.target.value)}
        />
      </div>

      <Input
        label="Data da sessão"
        type="datetime-local"
        optionalText="opcional"
        helperText="Horário de Brasília. Sem data, o job fica esperando agendamento."
        value={form.scheduledAt}
        disabled={saving}
        onChange={(e) => set('scheduledAt', e.target.value)}
      />

      {/* O status nasce daqui, não de um dropdown: com data + confirmação o job
          nasce "Confirmado"; sem uma das duas, "A orçar". */}
      <Checkbox
        label="Sessão já combinada com o cliente"
        description={
          hasDate
            ? 'O job nasce "Confirmado" em vez de "A orçar".'
            : 'Preenche a data da sessão para marcar isto.'
        }
        checked={hasDate && form.sessionAgreed}
        disabled={saving || !hasDate}
        onChange={(e) => set('sessionAgreed', e.target.checked)}
      />

      <div className="flex items-center justify-end gap-fh-3">
        {error && (
          <span className="fh-error" role="alert">
            {error}
          </span>
        )}
        <Button variant="tertiary" size="sm" onClick={close} disabled={saving}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleCreate} loading={saving}>
          {saving ? 'Criando…' : 'Criar job'}
        </Button>
      </div>
    </div>
  )
}
