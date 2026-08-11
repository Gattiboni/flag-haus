'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { MessageCircle, Pencil, Plus, Repeat, Star, TriangleAlert } from 'lucide-react'
import { updateCadastroInline } from '@/app/actions/admin-cadastros'
import {
  OPERATIONAL_STATUS_LABELS,
  PREFERRED_CHANNELS,
  PREFERRED_CHANNEL_LABELS,
  isPreferredChannel,
  type CadastrosQuery,
  type OperationalStatus,
} from '@/app/admin/_ui/cadastros'
import { Button, Checkbox, Input, Select } from '@/components/ui'
import { ColumnHeaderMenu } from './CadastrosMenus'
import './cadastros.css'

/**
 * Lista de cadastros (Bloco 4 §3B). O que chega aqui é só o que a tela mostra:
 * nada de nascimento, e-mail, consentimento ou qualquer dado clínico — bairro
 * vem porque é editável, e só aparece com a edição aberta.
 *
 * O que NÃO é editável aqui, de propósito:
 * - status: é computado pela view, muda pelo Funil/job;
 * - nome, telefone, e-mail, nascimento: só no PersonEdit, que tem o aviso da
 *   troca de telefone e o fluxo de destravar campo.
 *
 * "Última interação" nunca é reescrita pelo client depois de salvar: a fonte é
 * sempre a view. Editar um bairro não é uma interação com a pessoa, e mostrar
 * "agora" ali seria mentir sobre o único número que diz há quanto tempo alguém
 * está esperando.
 */

export type CadastroItem = {
  personId: string
  /** Já resolvido no server: nome, ou telefone formatado se não há nome. */
  displayName: string
  status: OperationalStatus
  /** "Cadastro enviado · há 6 dias" — já montado no server. */
  interactionLabel: string
  /** Data/hora da próxima sessão, ou "—". */
  nextSessionLabel: string
  /** Slug do canal preferido, '' se vazio. */
  channel: string
  /** Só dígitos do E.164 — a base do wa.me. '' quando não há telefone. */
  phoneDigits: string
  neighborhood: string
  isVip: boolean
  isDifficult: boolean
  isReturning: boolean
}

const CHANNEL_OPTIONS = [
  { value: '', label: '—' },
  ...PREFERRED_CHANNELS.map((c) => ({
    value: c,
    label: PREFERRED_CHANNEL_LABELS[c],
  })),
]

type Draft = {
  channel: string
  neighborhood: string
  isVip: boolean
  isDifficult: boolean
}

export function CadastrosList({
  items,
  query,
}: {
  items: CadastroItem[]
  query: CadastrosQuery
}) {
  return (
    <div>
      {/* Deixou de ser `aria-hidden`: depois do Adendo 3 o cabeçalho não é mais
          decoração repetindo o que a linha já diz — é onde moram o filtro e a
          ordenação, e esconder isso do leitor de tela esconderia a barra de
          filtro inteira. "Canal" e a coluna de ações não têm menu.
          Adendo 4 (10/08): os rótulos viraram ícones — o nome por extenso
          continua em `title` + `aria-label`, e o painel do celular
          ("Filtrar/Ordenar") mantém tudo escrito. */}
      <div className="fh-cad-grid fh-eyebrow fh-cad-head hidden md:grid border-b border-fh-subtle px-fh-4 pb-fh-2">
        <div className="fh-cad-grid__nome">
          <ColumnHeaderMenu query={query} column="nome" />
        </div>
        <div className="fh-cad-grid__status">
          <ColumnHeaderMenu query={query} column="status" />
        </div>
        <div className="fh-cad-grid__interacao">
          <ColumnHeaderMenu query={query} column="interacao" />
        </div>
        <div className="fh-cad-grid__sessao">
          <ColumnHeaderMenu query={query} column="sessao" />
        </div>
        {/* Canal não tem menu — é rótulo puro, e depois do Adendo 4 é o mesmo
            balão que abre o WhatsApp na linha. O nome fica no title e no
            sr-only: um ícone sozinho não é rótulo pra leitor de tela. */}
        <span className="fh-cad-grid__canal">
          <span className="fh-cad-head__icon" title="Canal">
            <MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">Canal</span>
          </span>
        </span>
        <span className="fh-cad-grid__acoes" />
      </div>

      <ul>
        {items.map((item) => (
          <Row key={item.personId} item={item} />
        ))}
      </ul>
    </div>
  )
}

function Row({ item }: { item: CadastroItem }) {
  const initial: Draft = {
    channel: item.channel,
    neighborhood: item.neighborhood,
    isVip: item.isVip,
    isDifficult: item.isDifficult,
  }

  // Baseline = o que está salvo. Sucesso promove o rascunho a baseline; falha
  // devolve o rascunho ao baseline (o valor "volta" na cara do Julio, que é o
  // sinal honesto de que não gravou).
  const [saved, setSaved] = useState<Draft>(initial)
  const [draft, setDraft] = useState<Draft>(initial)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const waHref = item.phoneDigits ? `https://wa.me/${item.phoneDigits}` : null
  const channelLabel = isPreferredChannel(saved.channel)
    ? PREFERRED_CHANNEL_LABELS[saved.channel]
    : '—'

  function openEditor() {
    if (pending) return
    setDraft(saved)
    setError(null)
    setEditing(true)
  }

  function cancelEdit() {
    if (pending) return
    setDraft(saved)
    setError(null)
    setEditing(false)
  }

  function handleSave() {
    if (pending) return

    const patch: {
      preferred_channel?: string | null
      neighborhood?: string | null
      is_vip?: boolean
      is_difficult?: boolean
    } = {}

    if (draft.channel !== saved.channel) {
      patch.preferred_channel = draft.channel === '' ? null : draft.channel
    }
    if (draft.neighborhood.trim() !== saved.neighborhood.trim()) {
      patch.neighborhood = draft.neighborhood.trim()
    }
    if (draft.isVip !== saved.isVip) patch.is_vip = draft.isVip
    if (draft.isDifficult !== saved.isDifficult) patch.is_difficult = draft.isDifficult

    if (Object.keys(patch).length === 0) {
      setEditing(false)
      setError(null)
      return
    }

    setError(null)
    startTransition(async () => {
      const res = await updateCadastroInline({ personId: item.personId, patch })
      if (res.status === 'ok') {
        setSaved({ ...draft, neighborhood: draft.neighborhood.trim() })
        setEditing(false)
        setError(null)
      } else {
        setDraft(saved)
        setError(
          res.status === 'invalid' ? res.reason : 'Não deu pra salvar. Tenta de novo.'
        )
      }
    })
  }

  return (
    <li className="fh-cad-row px-fh-4 py-fh-3" data-saving={pending || undefined}>
      <div className="fh-cad-grid">
        <div className="fh-cad-grid__nome">
          {/* `title` espelhando o valor inteiro (Adendo 4): nome e última
              interação truncam por desenho, e o hover é o que devolve o que a
              coluna cortou. Incondicional, como no PersonEdit — detectar
              truncagem de verdade exigiria medir o nó no client a cada
              render/resize, e um title igual ao texto visível não atrapalha. */}
          <Link
            href={`/admin/people/${item.personId}`}
            className="fh-cad-row__name block truncate"
            title={item.displayName}
          >
            {item.displayName}
          </Link>
        </div>

        <div className="fh-cad-grid__status flex items-center gap-fh-2 justify-end md:justify-start">
          <span
            className={`fh-badge fh-cad-status--${item.status}`}
            title={OPERATIONAL_STATUS_LABELS[item.status]}
          >
            {OPERATIONAL_STATUS_LABELS[item.status]}
          </span>
          <Markers
            isVip={saved.isVip}
            isDifficult={saved.isDifficult}
            isReturning={item.isReturning}
          />
        </div>

        <div
          className="fh-cad-grid__interacao fh-micro truncate"
          title={item.interactionLabel}
        >
          {item.interactionLabel}
        </div>

        <div className="fh-cad-grid__sessao fh-micro fh-tnum whitespace-nowrap text-right md:text-left">
          {item.nextSessionLabel}
        </div>

        <div className="fh-cad-grid__canal">
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="fh-cad-iconlink"
              title={`Abrir WhatsApp — canal preferido: ${channelLabel}`}
            >
              <MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />
              <span className="fh-cad-canal__label">{channelLabel}</span>
              <span className="sr-only">
                Abrir WhatsApp de {item.displayName}
              </span>
            </a>
          ) : (
            // Sem telefone não há link, e a palavra sozinha alargaria a coluna
            // que o Adendo 4 veio estreitar. O canal preferido continua no
            // hover e no editor da linha.
            <span className="fh-micro" title={`Canal preferido: ${channelLabel}`}>
              —
            </span>
          )}
        </div>

        <div className="fh-cad-grid__acoes">
          <Button
            variant="tertiary"
            size="sm"
            onClick={editing ? cancelEdit : openEditor}
            disabled={pending}
            aria-expanded={editing}
            title={`Editar canal, bairro e marcadores de ${item.displayName}`}
            aria-label={`Editar ${item.displayName}`}
            icon={<Pencil size={18} strokeWidth={1.5} />}
          />
        </div>
      </div>

      {editing && (
        <div className="fh-cad-editor mt-fh-3 flex flex-col gap-fh-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-fh-3">
            <Select
              label="Canal preferido"
              value={draft.channel}
              disabled={pending}
              options={CHANNEL_OPTIONS}
              onChange={(e) => setDraft((d) => ({ ...d, channel: e.target.value }))}
            />
            <Input
              label="Bairro"
              value={draft.neighborhood}
              disabled={pending}
              placeholder="—"
              maxLength={100}
              onChange={(e) =>
                setDraft((d) => ({ ...d, neighborhood: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') cancelEdit()
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-fh-5">
            <Checkbox
              label="VIP"
              checked={draft.isVip}
              disabled={pending}
              onChange={(e) => setDraft((d) => ({ ...d, isVip: e.target.checked }))}
            />
            <Checkbox
              label="Atenção"
              checked={draft.isDifficult}
              disabled={pending}
              onChange={(e) =>
                setDraft((d) => ({ ...d, isDifficult: e.target.checked }))
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-fh-3">
            {/* Atalho do #4d: o job não nasce aqui — a lista não é lugar de
                orçar. Leva pra ficha com o formulário já aberto, que é onde a
                descrição, o preço e a data cabem. */}
            <Link
              href={`/admin/people/${item.personId}?novo_job=1`}
              className="fh-cad-iconlink"
              title={`Criar um job para ${item.displayName}`}
            >
              <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
              <span>Novo job</span>
            </Link>

            <div className="flex flex-wrap items-center justify-end gap-fh-3">
              {error && (
                <span className="fh-error" role="alert">
                  {error}
                </span>
              )}
              <Button
                variant="tertiary"
                size="sm"
                onClick={cancelEdit}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} loading={pending}>
                {pending ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Falha com o editor já fechado (ex.: salvou sem mudança e deu erro):
          a mensagem ainda precisa aparecer em algum lugar visível. */}
      {error && !editing && (
        <p className="fh-error mt-fh-2" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}

function Markers({
  isVip,
  isDifficult,
  isReturning,
}: {
  isVip: boolean
  isDifficult: boolean
  isReturning: boolean
}) {
  if (!isVip && !isDifficult && !isReturning) return null

  return (
    <span className="flex items-center gap-fh-1 shrink-0">
      {isVip && (
        <span className="fh-cad-marker fh-cad-marker--vip" title="VIP">
          <Star size={14} strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">VIP</span>
        </span>
      )}
      {isDifficult && (
        <span className="fh-cad-marker fh-cad-marker--atencao" title="Atenção">
          <TriangleAlert size={14} strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">Atenção</span>
        </span>
      )}
      {isReturning && (
        <span className="fh-cad-marker" title="Retornante">
          <Repeat size={14} strokeWidth={1.5} aria-hidden="true" />
          <span className="sr-only">Retornante</span>
        </span>
      )}
    </span>
  )
}
