'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlignLeft, Cake, Clock, ExternalLink, Lock, Pencil, User, X } from 'lucide-react'
import {
  linkEventPerson,
  updateCalendarEvent,
  updateEventMeta,
  type PersonOption,
} from '@/app/actions/calendar'
import {
  SERVICE_TYPE_LABELS,
  artistBucket,
  artistLabel,
  formatDayLabel,
  isLocked,
  isServiceType,
  serviceTypeLabel,
  type CalendarEventRow,
} from '@/app/admin/_ui/calendario'
import { spDayKey, spTime } from '@/app/admin/_ui/format'
import { formatPhoneBR } from '@/lib/format'
import { TagBadges } from '@/app/admin/_ui/TagBadges'
import { resolveTags, type TagCatalogEntry } from '@/app/admin/_ui/tags'
import { Button, Input, Select } from '@/components/ui'
import { PersonPicker } from './PersonPicker'

/**
 * "Nenhum" é opção de verdade: o parser deixa `artist` nulo em tudo que não é
 * sessão, e o Julio precisa poder voltar pra esse estado depois de errar o
 * clique — sem ele, um artista escolhido por engano seria permanente.
 */
const ARTIST_CHOICES = [
  { value: 'nenhum', label: 'Sem artista' },
  { value: 'julio', label: 'Julio' },
  { value: 'lethicia', label: 'Lethicia' },
  { value: 'outro', label: 'Outro (guest)' },
]

/** Só o que o CHECK do espelho aceita — `aniversario` nunca é linha. */
const CATEGORY_CHOICES = [
  { value: 'sessao', label: 'Sessão' },
  { value: 'outros', label: 'Outros' },
]

/**
 * "—" é opção de verdade, e é o default de tudo que não é sessão: a coluna é
 * nullable e um evento de férias não é tatuagem nem piercing. Sem essa opção,
 * um tipo escolhido por engano ficaria pra sempre.
 */
const SERVICE_TYPE_CHOICES = [
  { value: 'nenhum', label: '— sem tipo —' },
  { value: 'tattoo', label: SERVICE_TYPE_LABELS.tattoo },
  { value: 'piercing', label: SERVICE_TYPE_LABELS.piercing },
]

/**
 * Detalhe do evento. `position: fixed` + backdrop de propósito (item 14): o
 * grid do mês tem `overflow` nas células, e um painel posicionado por
 * `absolute` dentro dele sairia cortado em metade dos dias.
 */

export type EventDrawerProps = {
  event: CalendarEventRow | null
  tags: TagCatalogEntry[]
  onClose: () => void
  /** Algo mudou no servidor: quem chamou fecha o drawer e recarrega. */
  onChanged: (message: string) => void
}

export function EventDrawer({ event, tags, onClose, onChanged }: EventDrawerProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<PersonOption | null>(null)
  const [busy, setBusy] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)

  /**
   * Estado do formulário semeado pelo evento no PRIMEIRO render.
   *
   * Trocar de evento com o editor aberto não pode carregar o formulário do
   * anterior — e quem garante isso é o `key` que o pai passa, remontando o
   * drawer a cada evento. Reset por efeito faria o mesmo com um render a mais e
   * uma janela em que o formulário mostra dados do evento errado.
   */
  const initialBucket = artistBucket(event?.artist)
  const [artistChoice, setArtistChoice] = useState(
    initialBucket === 'outros' ? 'outro' : (initialBucket ?? 'nenhum')
  )
  const [artistOther, setArtistOther] = useState(
    initialBucket === 'outros' ? (event?.artist ?? '') : ''
  )
  const [serviceChoice, setServiceChoice] = useState(
    isServiceType(event?.service_type) ? event.service_type : 'nenhum'
  )

  // Esc fecha. O drawer cobre a tela no celular; sem isso, teclado só sai
  // clicando no ✕, que é o alvo mais longe do polegar.
  useEffect(() => {
    if (!event) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [event, onClose])

  /* --- Vínculo de pessoa (bandeja pelo drawer) --- */

  async function link() {
    if (!event?.event_id || !picked) return
    setMetaError(null)
    setBusy(true)
    const result = await linkEventPerson({ eventId: event.event_id, personId: picked.id })
    setBusy(false)

    if (result.status === 'ok') {
      onChanged(`Vinculado a ${picked.name ?? 'contato'}. O evento no Google não muda.`)
      return
    }
    setMetaError(result.status === 'invalid' ? result.reason : result.message)
  }

  async function unlink() {
    if (!event?.event_id) return
    setMetaError(null)
    setBusy(true)
    const result = await linkEventPerson({ eventId: event.event_id, personId: null })
    setBusy(false)

    if (result.status === 'ok') {
      onChanged('Cliente desvinculado. O evento volta pra bandeja.')
      return
    }
    setMetaError(result.status === 'invalid' ? result.reason : result.message)
  }

  /* --- Correção de artista, tipo e categoria --- */

  async function saveArtist(choice: string, other = '') {
    if (!event?.event_id) return
    setArtistChoice(choice)
    // "Outro" só abre o campo; quem grava é o botão ao lado dele.
    if (choice === 'outro' && other.trim() === '') return

    const artist =
      choice === 'nenhum' ? null : choice === 'outro' ? other.trim().toLowerCase() : choice

    setMetaError(null)
    setBusy(true)
    const result = await updateEventMeta({ eventId: event.event_id, artist })
    setBusy(false)

    if (result.status === 'ok') {
      onChanged('Artista corrigido — o sync não mexe mais nele.')
      return
    }
    setMetaError(result.status === 'invalid' ? result.reason : result.message)
  }

  async function saveServiceType(choice: string) {
    if (!event?.event_id) return
    setServiceChoice(choice)

    setMetaError(null)
    setBusy(true)
    const result = await updateEventMeta({
      eventId: event.event_id,
      // "nenhum" vira NULL de verdade na coluna, não string vazia: o CHECK só
      // aceita tattoo/piercing, e '' seria uma terceira coisa.
      serviceType: choice === 'nenhum' ? null : (choice as 'tattoo' | 'piercing'),
    })
    setBusy(false)

    if (result.status === 'ok') {
      onChanged('Tipo corrigido — o sync não mexe mais nele.')
      return
    }
    setMetaError(result.status === 'invalid' ? result.reason : result.message)
  }

  async function saveCategory(category: string) {
    if (!event?.event_id) return
    setMetaError(null)
    setBusy(true)
    const result = await updateEventMeta({
      eventId: event.event_id,
      category: category as 'sessao' | 'outros',
    })
    setBusy(false)

    if (result.status === 'ok') {
      onChanged('Categoria corrigida — o sync não mexe mais nela.')
      return
    }
    setMetaError(result.status === 'invalid' ? result.reason : result.message)
  }

  async function save() {
    if (!event?.event_id) return
    setError(null)
    setSaving(true)
    const result = await updateCalendarEvent({ eventId: event.event_id, title, when })
    setSaving(false)

    if (result.status === 'ok') {
      onChanged('Evento atualizado aqui e na agenda do Google.')
      return
    }
    setError(result.status === 'invalid' ? result.reason : result.message)
  }

  if (!event) return null

  const locked = isLocked(event)
  const birthday = event.kind === 'birthday'
  const artist = artistLabel(event.artist)
  const serviceLabel = serviceTypeLabel(event.service_type)
  const description = event.meta?.description?.trim()
  const personTags = resolveTags(event.person_tags, new Map(tags.map((t) => [t.slug, t])))

  return (
    <>
      <button
        type="button"
        className="fh-cal-backdrop"
        onClick={onClose}
        aria-label="Fechar detalhe"
      />

      <aside className="fh-cal-drawer" role="dialog" aria-modal="true" aria-label="Detalhe do evento">
        <header className="fh-cal-drawer__head">
          <span className="fh-cal-drawer__dot" data-cat={event.category} aria-hidden="true" />
          <h3>{event.title ?? '(sem título)'}</h3>
          <button
            type="button"
            className="fh-cal-iconbtn"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </header>

        <div className="fh-cal-drawer__body">
          {locked && (
            <p className="fh-cal-note">
              <Lock size={14} strokeWidth={1.7} aria-hidden="true" />
              <span>
                Criado no Google — edição e reagendamento acontecem por lá. O sync
                traz pra cá.
              </span>
            </p>
          )}

          {birthday && (
            <p className="fh-cal-note">
              <Cake size={14} strokeWidth={1.7} aria-hidden="true" />
              <span>Aniversário — vem do cadastro. Manda um parabéns que rende.</span>
            </p>
          )}

          <p className="fh-cal-row">
            <Clock size={14} strokeWidth={1.7} aria-hidden="true" />
            <span>
              {formatDayLabel(spDayKey(event.starts_at))}
              {event.all_day ? ' · dia inteiro' : ` · ${spTime(event.starts_at)}`}
            </span>
          </p>

          {/* Artista e tipo na MESMA linha ("Lethicia · Piercing"): são as duas
              metades da mesma pergunta — quem faz e o quê. Duas linhas com um
              ícone cada dariam a elas um peso que elas não têm.
              Sem artista mas com tipo, a linha vira só o tipo, em vez de
              anunciar "Artista: Piercing". */}
          {(artist || serviceLabel) && (
            <p className="fh-cal-row">
              <User size={14} strokeWidth={1.7} aria-hidden="true" />
              <span>
                {artist ? (
                  <>
                    Artista: <strong>{artist}</strong>
                    {serviceLabel && <> · {serviceLabel}</>}
                  </>
                ) : (
                  <>
                    Tipo: <strong>{serviceLabel}</strong>
                  </>
                )}
              </span>
            </p>
          )}

          {description && (
            <p className="fh-cal-row">
              <AlignLeft size={14} strokeWidth={1.7} aria-hidden="true" />
              <span className="fh-cal-desc">{description}</span>
            </p>
          )}

          {event.person_id ? (
            <div className="fh-cal-row">
              <User size={14} strokeWidth={1.7} aria-hidden="true" />
              <span>
                <strong>{event.person_name ?? 'Contato'}</strong>
                {event.person_phone && ` · ${formatPhoneBR(event.person_phone)}`}
                <span className="fh-cal-drawer__tags">
                  <TagBadges tags={personTags} emptyText="sem tags" />
                </span>
                {event.kind === 'event' && (
                  <button
                    type="button"
                    className="fh-cal-textbtn"
                    onClick={unlink}
                    disabled={busy}
                  >
                    Desvincular
                  </button>
                )}
              </span>
            </div>
          ) : (
            event.kind === 'event' && (
              <div className="fh-cal-row">
                <User size={14} strokeWidth={1.7} aria-hidden="true" />
                <span className="fh-cal-linker">
                  <span className="fh-cal-row--muted">Sem cliente vinculado.</span>
                  <PersonPicker selected={picked} onSelect={setPicked} label="" disabled={busy} />
                  {picked && (
                    <Button size="sm" onClick={link} loading={busy}>
                      Vincular
                    </Button>
                  )}
                </span>
              </div>
            )
          )}

          {/* Metadados do CRM — editáveis em QUALQUER evento, com cadeado ou
              sem (contrato §13b). Eles moram no espelho e nunca sobem pro
              Google, então o cadeado não se aplica a eles. Aniversário fica
              de fora: ele não é linha de tabela, é cálculo da RPC. */}
          {event.kind === 'event' && (
            <div className="fh-cal-meta">
              <p className="fh-micro">Classificação no CRM — não vai pro Google.</p>

              <Select
                label="Artista"
                options={ARTIST_CHOICES}
                value={artistChoice}
                disabled={busy}
                onChange={(e) => saveArtist(e.target.value)}
              />

              {artistChoice === 'outro' && (
                <div className="flex items-end gap-fh-2">
                  <Input
                    label="Quem é o artista"
                    value={artistOther}
                    onChange={(e) => setArtistOther(e.target.value)}
                    placeholder="nicole"
                    maxLength={60}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => saveArtist('outro', artistOther)}
                    loading={busy}
                  >
                    Salvar
                  </Button>
                </div>
              )}

              <Select
                label="Categoria"
                options={CATEGORY_CHOICES}
                value={event.category === 'sessao' ? 'sessao' : 'outros'}
                disabled={busy}
                onChange={(e) => saveCategory(e.target.value)}
              />

              <Select
                label="Tipo"
                options={SERVICE_TYPE_CHOICES}
                value={serviceChoice}
                disabled={busy}
                onChange={(e) => saveServiceType(e.target.value)}
              />

              {metaError && (
                <p className="fh-error" role="alert">
                  {metaError}
                </p>
              )}
            </div>
          )}
        </div>

        {editing && (
          <div className="fh-cal-drawer__edit">
            <Input
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
            />
            <Input
              label="Data e hora"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              helperText="Horário de São Paulo, sempre."
            />
            {error && (
              <p className="fh-error" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-fh-2">
              <Button size="sm" onClick={save} loading={saving}>
                Salvar no Google
              </Button>
              <Button size="sm" variant="tertiary" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <footer className="fh-cal-drawer__actions">
          {event.person_id && (
            <Link href={`/admin/people/${event.person_id}`} className="fh-cal-link">
              <ExternalLink size={15} strokeWidth={1.6} aria-hidden="true" />
              Abrir ficha
            </Link>
          )}

          {/* Editar só existe pra evento do CRM. Pro evento do Google não há
              botão desabilitado: o aviso do cadeado já disse onde se edita, e
              um botão morto só convida a clicar. */}
          {event.kind === 'event' && event.editable && !editing && (
            <Button
              size="sm"
              variant="secondary"
              icon={<Pencil size={15} strokeWidth={1.6} />}
              onClick={() => {
                setTitle(event.title ?? '')
                setWhen(`${spDayKey(event.starts_at)}T${spTime(event.starts_at)}`)
                setError(null)
                setEditing(true)
              }}
            >
              Editar
            </Button>
          )}

          {!event.person_id && !event.editable && (
            <span className="fh-micro">Só leitura por aqui.</span>
          )}
        </footer>
      </aside>
    </>
  )
}
