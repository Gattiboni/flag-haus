'use client'

import { useState } from 'react'
import { Check, Eye, EyeOff, Trash2 } from 'lucide-react'
import { deleteTag, recolorTag, renameTag, setTagActive } from '@/app/actions/tags'
import { TAG_PALETTE } from '@/lib/tags'
import type { TagCatalogEntry } from '@/app/admin/_ui/tags'
import { Button, Dialog, Input } from '@/components/ui'

/**
 * "Gerenciar tags" — o catálogo inteiro, uma linha por tag.
 *
 * Duas regras de forma que não são estética:
 *
 * 1. **Cada linha se salva sozinha.** Daí o `hideConfirm` do Dialog: não existe
 *    um "confirmar" para cinco decisões independentes, e um botão único no
 *    rodapé sugeriria que nada vale até ele ser apertado.
 * 2. **A confirmação de exclusão é EMBUTIDA na linha.** Nunca `confirm()`
 *    nativo (que ignora o design system e não cabe o aviso), nunca modal sobre
 *    modal (que empilha scrim e rouba o foco duas vezes). A linha se transforma
 *    e explica exatamente o que vai acontecer.
 *
 * O slug aparece em cada linha, em cinza: ele é a identidade imutável, e é o
 * que a mensagem de colisão vai citar. Vê-lo aqui é o que torna a mensagem
 * "já existe uma tag com o identificador X" compreensível.
 */

export type ManageTagsModalProps = {
  open: boolean
  onClose: () => void
  catalog: Array<TagCatalogEntry & { id: string }>
  onCatalogChange: (next: Array<TagCatalogEntry & { id: string }>) => void
}

export function ManageTagsModal({
  open,
  onClose,
  catalog,
  onCatalogChange,
}: ManageTagsModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Gerenciar tags"
      description="Renomear e recolorir refletem em todos os contatos na hora — o contato guarda o identificador, não o nome."
      cancelLabel="Fechar"
      hideConfirm
    >
      {catalog.length === 0 ? (
        <p className="fh-micro">Nenhuma tag no catálogo ainda.</p>
      ) : (
        <ul className="fh-mtags">
          {catalog.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              onChanged={(next) =>
                onCatalogChange(catalog.map((t) => (t.id === next.id ? next : t)))
              }
              onDeleted={() => onCatalogChange(catalog.filter((t) => t.id !== tag.id))}
            />
          ))}
        </ul>
      )}
    </Dialog>
  )
}

type TagRowProps = {
  tag: TagCatalogEntry & { id: string }
  onChanged: (next: TagCatalogEntry & { id: string }) => void
  onDeleted: () => void
}

function TagRow({ tag, onChanged, onDeleted }: TagRowProps) {
  const [name, setName] = useState(tag.name)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<{ status: string; reason?: string; message?: string }>) {
    setError(null)
    setBusy(true)
    const result = await fn()
    setBusy(false)
    if (result.status !== 'ok') {
      setError(result.reason ?? result.message ?? 'Não deu.')
      return false
    }
    return true
  }

  async function saveName() {
    if (name.trim() === tag.name) return
    if (await run(() => renameTag({ id: tag.id, name }))) {
      onChanged({ ...tag, name: name.trim().replace(/\s+/g, ' ') })
    }
  }

  async function pickColor(color: string) {
    if (color === tag.color) return
    if (await run(() => recolorTag({ id: tag.id, color }))) {
      onChanged({ ...tag, color })
    }
  }

  async function toggleActive() {
    const next = !tag.is_active
    if (await run(() => setTagActive({ id: tag.id, active: next }))) {
      onChanged({ ...tag, is_active: next })
    }
  }

  async function remove() {
    if (await run(() => deleteTag({ id: tag.id }))) onDeleted()
  }

  if (confirming) {
    return (
      <li className="fh-mtags__row fh-mtags__row--danger">
        {/* O aviso é honesto sobre a consequência real: sem cascata, os
            contatos continuam carregando o identificador, e lá a badge vira
            cinza e removível. Dizer "isso não pode ser desfeito" e parar aí
            esconderia justamente a parte que o Julio vai encontrar depois. */}
        <p className="fh-mtags__warn">
          Excluir <strong>{tag.name}</strong>? Quem já tem essa tag continua com
          ela, mas ela aparece cinza e só dá pra remover. Não dá pra desfazer.
        </p>
        <div className="fh-mtags__confirm">
          <Button size="sm" variant="danger" onClick={remove} loading={busy}>
            Excluir mesmo assim
          </Button>
          <Button size="sm" variant="tertiary" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        </div>
        {error && (
          <p className="fh-error" role="alert">
            {error}
          </p>
        )}
      </li>
    )
  }

  return (
    <li className="fh-mtags__row" data-inactive={!tag.is_active || undefined}>
      <div className="fh-mtags__name">
        <Input
          label=""
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          maxLength={40}
          disabled={busy}
          aria-label={`Nome da tag ${tag.name}`}
        />
        <code className="fh-mtags__slug">{tag.slug}</code>
      </div>

      <div className="fh-mtags__colors" role="group" aria-label={`Cor da tag ${tag.name}`}>
        {TAG_PALETTE.map((color) => (
          <button
            key={color.hex}
            type="button"
            className="fh-mtags__swatch"
            style={{ background: color.hex }}
            data-on={color.hex === tag.color || undefined}
            onClick={() => pickColor(color.hex)}
            disabled={busy}
            title={color.name}
            aria-label={color.name}
            aria-pressed={color.hex === tag.color}
          >
            {color.hex === tag.color && (
              <Check size={12} strokeWidth={2.5} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>

      <div className="fh-mtags__ops">
        <Button
          size="sm"
          variant="tertiary"
          icon={
            tag.is_active ? (
              <EyeOff size={15} strokeWidth={1.6} />
            ) : (
              <Eye size={15} strokeWidth={1.6} />
            )
          }
          onClick={toggleActive}
          disabled={busy}
        >
          {tag.is_active ? 'Desativar' : 'Reativar'}
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          icon={<Trash2 size={15} strokeWidth={1.6} />}
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          Excluir
        </Button>
      </div>

      {!tag.is_active && (
        <p className="fh-micro">
          Desativada: não entra em contato novo, mas quem já tem continua com ela.
        </p>
      )}

      {error && (
        <p className="fh-error" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}
