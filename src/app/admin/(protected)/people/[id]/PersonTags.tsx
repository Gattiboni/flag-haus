'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Settings2 } from 'lucide-react'
import { applyPersonTag, createTag } from '@/app/actions/tags'
import { TagBadges } from '@/app/admin/_ui/TagBadges'
import { resolveTags, tagIndex, type TagCatalogEntry } from '@/app/admin/_ui/tags'
import { Button, Input } from '@/components/ui'
import { ManageTagsModal } from './ManageTagsModal'
import './person-tags.css'

/**
 * Tags do contato (Bloco 5). Três camadas, na ordem em que o Julio pensa:
 *
 * 1. **Badges** — o que este contato é. Vazadas, na cor da tag.
 * 2. **Editor** — ligar/desligar por toque, criar inline sem sair daqui.
 * 3. **Gerenciar** — o catálogo, atrás de um botão, porque mexer no catálogo é
 *    uma decisão sobre TODOS os contatos e não devia ficar a um clique de
 *    distância de marcar um.
 *
 * O componente é otimista no visual e honesto no erro: a badge aparece na hora
 * e volta atrás se o servidor recusar. Com o cliente na cadeira, esperar o
 * round-trip por toque é o que faz o Julio tocar duas vezes.
 */

export type PersonTagsProps = {
  personId: string
  /** Slugs do contato, como vieram de `people.tags`. */
  initialTags: string[]
  /** Catálogo inteiro (ativas e inativas). */
  catalog: Array<TagCatalogEntry & { id: string }>
}

export function PersonTags({ personId, initialTags, catalog }: PersonTagsProps) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [entries, setEntries] = useState(catalog)
  const [editing, setEditing] = useState(false)
  const [managing, setManaging] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()

  const index = useMemo(() => tagIndex(entries), [entries])
  const resolved = useMemo(() => resolveTags(tags, index), [tags, index])

  const active = useMemo(() => entries.filter((t) => t.is_active), [entries])

  /**
   * "Fora do catálogo ativo": órfãs (tag excluída) e desativadas que o contato
   * ainda carrega. Elas ficam numa linha própria, e não misturadas aos toggles,
   * porque não são escolhas disponíveis — são resíduo, e a única coisa que se
   * faz com elas é remover.
   */
  const stale = useMemo(
    () => resolved.filter((t) => t.orphan || t.inactive),
    [resolved]
  )

  function apply(slug: string, op: 'add' | 'remove') {
    setError(null)
    const before = tags
    setTags((prev) => (op === 'add' ? [...prev, slug] : prev.filter((s) => s !== slug)))

    startTransition(async () => {
      const result = await applyPersonTag({ personId, slug, op })
      if (result.status !== 'ok') {
        setTags(before)
        setError(result.status === 'invalid' ? result.reason : result.message)
      }
    })
  }

  /** Criar inline: cria E aplica, com o slug que o SERVIDOR devolveu. */
  function createAndApply() {
    const name = newName.trim()
    if (name === '') return
    setError(null)

    startTransition(async () => {
      const result = await createTag({ name })
      if (result.status !== 'ok') {
        setError(result.status === 'invalid' ? result.reason : result.message)
        return
      }

      const created = result.tag
      setEntries((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')

      const applied = await applyPersonTag({ personId, slug: created.slug, op: 'add' })
      if (applied.status !== 'ok') {
        // A tag existe no catálogo; só não entrou neste contato. Dizer isso é
        // melhor que sumir com ela e deixar o Julio criando de novo.
        setError('A tag foi criada, mas não entrou neste contato. Tenta aplicar de novo.')
        return
      }
      setTags((prev) => [...prev, created.slug])
    })
  }

  return (
    <div className="fh-ptags">
      <TagBadges
        tags={resolved}
        emptyText="Nenhuma tag ainda."
      />

      <div className="fh-ptags__actions">
        <Button
          size="sm"
          variant="tertiary"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
        >
          {editing ? 'Fechar' : 'Editar tags'}
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          icon={<Settings2 size={15} strokeWidth={1.6} />}
          onClick={() => setManaging(true)}
        >
          Gerenciar tags
        </Button>
      </div>

      {editing && (
        <div className="fh-ptags__editor">
          {active.length === 0 ? (
            <p className="fh-micro">
              O catálogo está vazio. Cria a primeira tag aqui embaixo.
            </p>
          ) : (
            <div className="fh-ptags__toggles">
              {active.map((tag) => {
                const on = tags.includes(tag.slug)
                return (
                  <button
                    key={tag.slug}
                    type="button"
                    className="fh-ptags__toggle"
                    data-on={on || undefined}
                    style={on ? { borderColor: tag.color, color: tag.color } : undefined}
                    onClick={() => apply(tag.slug, on ? 'remove' : 'add')}
                    disabled={busy}
                    aria-pressed={on}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          )}

          {stale.length > 0 && (
            <div className="fh-ptags__stale">
              <p className="fh-micro">Fora do catálogo ativo</p>
              {/* Removível, sempre: é a regra que destrava a saída e evita o
                  contato preso a uma tag que ninguém usa mais. */}
              <TagBadges
                tags={stale}
                onRemove={(slug) => apply(slug, 'remove')}
                disabled={busy}
              />
            </div>
          )}

          <div className="fh-ptags__create">
            <Input
              label="Criar tag nova"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Fechamento"
              maxLength={40}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  createAndApply()
                }
              }}
              helperText="Cria e já aplica neste contato."
            />
            <Button
              size="sm"
              icon={<Plus size={15} strokeWidth={1.6} />}
              onClick={createAndApply}
              disabled={busy || newName.trim() === ''}
            >
              Criar e aplicar
            </Button>
          </div>

          {error && (
            <p className="fh-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      <ManageTagsModal
        open={managing}
        onClose={() => setManaging(false)}
        catalog={entries}
        onCatalogChange={setEntries}
      />
    </div>
  )
}
