'use client'

import { X } from 'lucide-react'
import { ORPHAN_TOOLTIP, type ResolvedTag } from './tags'
import './tag-badges.css'

/**
 * Badge de tag — vazada: contorno e texto na cor da tag, fundo transparente.
 * Escolha de forma, não de gosto: as cores da paleta têm contraste garantido
 * como TEXTO sobre branco (teste determinístico em `src/lib/tags/palette`), e
 * badge sólida exigiria outra prova de contraste pra cada cor.
 *
 * A cor sai de `style` inline porque ela é DADO (vem de `tags.color`, escolhido
 * pelo Julio), não estilo: não existe classe CSS possível pra um valor que o
 * usuário cria em runtime.
 */

export type TagBadgeProps = {
  tag: ResolvedTag
  /** Handler do ✕. Ausente = badge só de leitura. */
  onRemove?: (slug: string) => void
  disabled?: boolean
}

export function TagBadge({ tag, onRemove, disabled = false }: TagBadgeProps) {
  const title = tag.orphan
    ? ORPHAN_TOOLTIP
    : tag.inactive
      ? 'Tag desativada — não entra em contato novo.'
      : undefined

  return (
    <span
      className="fh-tag"
      data-orphan={tag.orphan || undefined}
      data-inactive={tag.inactive || undefined}
      // Órfã não tem cor própria: o CSS pinta com o cinza neutro do token.
      style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
      title={title}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          className="fh-tag__x"
          onClick={() => onRemove(tag.slug)}
          disabled={disabled}
          aria-label={`Remover a tag ${tag.name}`}
        >
          <X size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </span>
  )
}

export type TagBadgesProps = {
  tags: ResolvedTag[]
  onRemove?: (slug: string) => void
  disabled?: boolean
  /** Texto quando não há tag nenhuma. Ausente = não renderiza nada. */
  emptyText?: string
}

export function TagBadges({ tags, onRemove, disabled, emptyText }: TagBadgesProps) {
  if (tags.length === 0) {
    return emptyText ? <span className="fh-tag-empty">{emptyText}</span> : null
  }

  return (
    <span className="fh-tag-list">
      {tags.map((t) => (
        <TagBadge key={t.slug} tag={t} onRemove={onRemove} disabled={disabled} />
      ))}
    </span>
  )
}
