'use client'

import { useMemo, useState } from 'react'
import { createCalendarEvent, type PersonOption } from '@/app/actions/calendar'
import { buildEventDescription } from '@/app/admin/_ui/calendario'
import { Dialog, Input, RadioGroup, Select, Textarea } from '@/components/ui'
import { PersonPicker } from './PersonPicker'

/**
 * "Novo evento" — o Julio marca sem sair do admin, e o Google continua a fonte
 * da verdade: a action escreve LÁ primeiro e só então espelha aqui.
 *
 * O preview "como vai ficar no Google" existe porque a descrição não é texto
 * livre: ela é a convenção que o matcher vai ler no próximo sync. Mostrar a
 * string montada é o que transforma uma regra invisível em algo que o Julio vê
 * — e ela vem da MESMA função que o servidor usa pra gravar.
 *
 * Artista segue a forma do NewJob: Select com os dois nomes da casa + "Outro",
 * que abre um campo de texto. Escolher é o caminho de 99%; digitar fica
 * visivelmente como exceção (e é o caminho do guest, contrato §13c).
 */

type ArtistChoice = 'julio' | 'lethicia' | 'outro'

const ARTIST_OPTIONS: Array<{ value: ArtistChoice; label: string }> = [
  { value: 'julio', label: 'Julio' },
  { value: 'lethicia', label: 'Lethicia' },
  { value: 'outro', label: 'Outro' },
]

const TYPE_OPTIONS = [
  { value: 'tattoo', label: 'Tatuagem' },
  { value: 'piercing', label: 'Piercing' },
]

export type NewEventModalProps = {
  open: boolean
  onClose: () => void
  /** Dia sugerido (o âncora da vista), em chave de São Paulo. */
  defaultDay: string
  onCreated: (message: string) => void
}

export function NewEventModal({ open, onClose, defaultDay, onCreated }: NewEventModalProps) {
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState(`${defaultDay}T14:00`)
  const [person, setPerson] = useState<PersonOption | null>(null)
  const [serviceType, setServiceType] = useState('tattoo')
  const [artistChoice, setArtistChoice] = useState<ArtistChoice>('julio')
  const [artistOther, setArtistOther] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const preview = useMemo(
    () => buildEventDescription(note, person?.phone ?? null),
    [note, person]
  )

  function reset() {
    setTitle('')
    setWhen(`${defaultDay}T14:00`)
    setPerson(null)
    setServiceType('tattoo')
    setArtistChoice('julio')
    setArtistOther('')
    setNote('')
    setError(null)
  }

  function close() {
    reset()
    onClose()
  }

  async function submit() {
    setError(null)
    const artist = artistChoice === 'outro' ? artistOther : artistChoice
    if (artistChoice === 'outro' && artistOther.trim() === '') {
      setError('Diz quem é o artista, ou escolhe um da casa.')
      return
    }

    setSaving(true)
    const result = await createCalendarEvent({
      title,
      when,
      personId: person?.id ?? null,
      serviceType: serviceType as 'tattoo' | 'piercing',
      artist,
      note,
    })
    setSaving(false)

    if (result.status === 'ok') {
      onCreated('Evento criado na agenda do Google e espelhado aqui.')
      close()
      return
    }
    setError(result.status === 'invalid' ? result.reason : result.message)
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Novo evento"
      confirmLabel="Criar na agenda"
      onConfirm={submit}
      loading={saving}
      confirmDisabled={title.trim() === '' || when === ''}
    >
      <div className="flex flex-col gap-fh-3">
        <Input
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sessão Gabriel — fechamento braço"
          maxLength={300}
        />

        <Input
          label="Data e hora"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          helperText="Horário de São Paulo, sempre."
        />

        <PersonPicker
          selected={person}
          onSelect={setPerson}
          helperText="Vinculando o cliente, a descrição já sai no padrão da agenda."
          disabled={saving}
        />

        {/* Duas opções curtas ficam lado a lado: o empilhamento default do
            componente gastaria duas linhas pra dizer "tatuagem ou piercing".
            Layout é de quem consome (Spec #4c-visual), daí a classe. */}
        <RadioGroup
          legend="Tipo"
          name="fh-cal-type"
          options={TYPE_OPTIONS}
          value={serviceType}
          onChange={setServiceType}
          className="fh-cal-inline-radios"
        />

        <Select
          label="Artista"
          options={ARTIST_OPTIONS}
          value={artistChoice}
          onChange={(e) => setArtistChoice(e.target.value as ArtistChoice)}
        />

        {artistChoice === 'outro' && (
          <Input
            label="Quem é o artista"
            value={artistOther}
            onChange={(e) => setArtistOther(e.target.value)}
            placeholder="nicole"
            maxLength={60}
          />
        )}

        <Textarea
          label="Nota (vai na descrição)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Fechamento do braço, sessão 2 de 3"
          maxLength={2000}
        />

        <div className="fh-field">
          <span className="fh-field__label">Como vai ficar no Google</span>
          <pre className="fh-cal-preview">{preview || '— descrição vazia —'}</pre>
        </div>

        {error && (
          <p className="fh-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  )
}
