'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Lock, Pencil } from 'lucide-react'
import { updatePerson, unlockField } from '@/app/actions/admin-people'
import type { PersonField } from '@/app/admin/_ui/person-fields'
import { formatDateBR, formatDateTimeBR } from '@/app/admin/_ui/format'
import { formatPhoneBR } from '@/lib/format'
import { isEligibleAge } from '@/lib/utils/age'
import { Button, Dialog, Input, Select } from '@/components/ui'
import './person-edit.css'

/**
 * Edição de pessoa com trava por campo (#4c §5-bis). "Admin ganha por padrão":
 * todo campo que muda de valor ganha um cadeado; a próxima submissão do form
 * (depois da migration do Alan) respeita a trava. Destravar é explícito.
 *
 * A página abre em LEITURA: 99% das visitas são pra ler a pessoa, não pra
 * editar. Cada campo tem um ✎ que abre edição inline só naquela linha. O 🔒 só
 * aparece em campo realmente travado — se todo campo mostrasse um cadeado
 * (aberto), o cadeado fechado não chamaria atenção nenhuma quando aparecesse.
 */

type LockInfo = { email: string; locked_at: string }

type FieldConfig =
  | { key: PersonField; label: string; kind: 'text' | 'date'; warn?: boolean }
  | {
      key: PersonField
      label: string
      kind: 'select'
      options: ReadonlyArray<readonly [string, string]>
    }

const FIELDS: readonly FieldConfig[] = [
  { key: 'name', label: 'Nome', kind: 'text' },
  { key: 'email', label: 'E-mail', kind: 'text' },
  { key: 'phone', label: 'Telefone', kind: 'text', warn: true },
  { key: 'birth_date', label: 'Nascimento', kind: 'date' },
  {
    key: 'document_type',
    label: 'Tipo de documento',
    kind: 'select',
    options: [
      ['', '—'],
      ['cpf', 'CPF'],
      ['rg', 'RG'],
      ['cnh', 'CNH'],
    ],
  },
  { key: 'document_number', label: 'Nº do documento', kind: 'text' },
  { key: 'neighborhood', label: 'Bairro', kind: 'text' },
  { key: 'city', label: 'Cidade', kind: 'text' },
  { key: 'instagram', label: 'Instagram', kind: 'text' },
  { key: 'occupation', label: 'Profissão', kind: 'text' },
  {
    key: 'preferred_channel',
    label: 'Canal preferido',
    kind: 'select',
    options: [
      ['', '—'],
      ['whatsapp', 'WhatsApp'],
      ['email', 'E-mail'],
      ['instagram', 'Instagram'],
      ['tanto_faz', 'Tanto faz'],
    ],
  },
]

const PHONE_WARNING =
  'Se o cliente repreencher com o telefone antigo, vai criar cadastro novo. Certeza?'

/** Valor cru → o que o Julio lê na linha. Vazio vira "—" em qualquer tipo. */
function displayValue(cfg: FieldConfig, raw: string): string {
  if (cfg.kind === 'select') {
    const label = cfg.options.find(([v]) => v === raw)?.[1]
    return label ?? (raw || '—')
  }
  if (cfg.kind === 'date') return formatDateBR(raw)
  if (cfg.key === 'phone') return formatPhoneBR(raw)
  return raw.trim() || '—'
}

export function PersonEdit({
  personId,
  operatorEmail,
  initial,
  locks: initialLocks,
}: {
  personId: string
  operatorEmail: string
  initial: Record<PersonField, string>
  locks: Partial<Record<PersonField, LockInfo>>
}) {
  const [values, setValues] = useState<Record<PersonField, string>>(initial)
  const [locks, setLocks] = useState<Partial<Record<PersonField, LockInfo>>>(initialLocks)
  // Um editor por vez: abrir outro ✎ fecha o anterior. Cada edição é de um
  // campo só e dura segundos — vários inputs abertos recriariam a sopa de
  // inputs que essa emenda veio matar.
  const [editing, setEditing] = useState<PersonField | null>(null)
  const [draft, setDraft] = useState('')
  const [menuFor, setMenuFor] = useState<PersonField | null>(null)
  // Campo aguardando confirmação de destravamento no <Dialog>.
  const [unlockFor, setUnlockFor] = useState<PersonField | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const menuRef = useRef<HTMLDivElement | null>(null)

  // Menu do cadeado fecha em clique fora / Esc, como qualquer dropdown.
  useEffect(() => {
    if (!menuFor) return
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuFor(null)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuFor(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuFor])

  function startEdit(key: PersonField) {
    if (pending) return
    setMenuFor(null)
    setError(null)
    setDraft(values[key])
    setEditing(key)
  }

  function cancelEdit() {
    if (pending) return
    setEditing(null)
    setDraft('')
    setError(null)
  }

  function handleSave(key: PersonField) {
    if (pending) return
    const cfg = FIELDS.find((f) => f.key === key)!
    const next = cfg.kind === 'select' ? draft : draft.trim()

    // Sem mudança real: fecha o editor sem gastar round-trip (e sem disparar o
    // confirm do telefone à toa).
    if (next === values[key].trim()) {
      setEditing(null)
      setError(null)
      return
    }

    setError(null)

    if (key === 'name' && (next.length < 1 || next.length > 200)) {
      return setError('Nome deve ter entre 1 e 200 caracteres.')
    }
    if (key === 'birth_date' && !isEligibleAge(next)) {
      return setError('A pessoa precisa ter 18 anos completos.')
    }
    if (key === 'phone' && !window.confirm(PHONE_WARNING)) {
      return
    }

    // Select vazio vira null (o enum do server não aceita ''); texto vai como
    // string e o server normaliza vazio → null.
    const patch: Record<string, unknown> = {
      [key]: cfg.kind === 'select' && next === '' ? null : next,
    }

    startTransition(async () => {
      const res = await updatePerson({ personId, patch })
      if (res.status === 'ok') {
        setValues((prev) => ({ ...prev, [key]: next }))
        const now = new Date().toISOString()
        setLocks((prev) => {
          const nextLocks = { ...prev }
          for (const k of res.lockedNow) {
            nextLocks[k] = { email: operatorEmail, locked_at: now }
          }
          return nextLocks
        })
        setEditing(null)
        setDraft('')
        setError(null)
      } else {
        setError(
          res.status === 'invalid' ? res.reason : 'Não deu pra salvar. Tenta de novo.'
        )
      }
    })
  }

  /** Confirmado no <Dialog>: destrava de fato. */
  function handleUnlock(key: PersonField) {
    if (pending) return
    setUnlockFor(null)
    setError(null)
    startTransition(async () => {
      const res = await unlockField({ personId, field: key })
      if (res.status === 'ok') {
        setLocks((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      } else {
        setError(
          res.status === 'invalid' ? res.reason : 'Não deu pra destravar.'
        )
      }
    })
  }

  const unlockLabel = FIELDS.find((f) => f.key === unlockFor)?.label ?? ''

  return (
    <div className="flex flex-col gap-fh-3">
      {FIELDS.map((f) => {
        const lock = locks[f.key]
        const isEditing = editing === f.key
        const raw = values[f.key]

        return (
          <div key={f.key} className="flex items-end gap-fh-2">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                f.kind === 'select' ? (
                  <Select
                    label={f.label}
                    value={draft}
                    disabled={pending}
                    autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    options={f.options.map(([value, label]) => ({ value, label }))}
                  />
                ) : (
                  <Input
                    label={f.label}
                    type={f.kind === 'date' ? 'date' : 'text'}
                    value={draft}
                    disabled={pending}
                    autoFocus
                    placeholder="—"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(f.key)
                      if (e.key === 'Escape') cancelEdit()
                    }}
                  />
                )
              ) : (
                <>
                  <span className="fh-eyebrow">{f.label}</span>
                  <p
                    className="fh-person-field__read"
                    data-empty={raw.trim() ? undefined : 'true'}
                    title={displayValue(f, raw)}
                  >
                    {displayValue(f, raw)}
                  </p>
                </>
              )}
            </div>

            {isEditing ? (
              <div className="shrink-0 flex items-center gap-fh-2">
                <Button variant="tertiary" size="sm" onClick={cancelEdit} disabled={pending}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={() => handleSave(f.key)} loading={pending}>
                  {pending ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            ) : lock ? (
              <div
                className="shrink-0 relative"
                ref={menuFor === f.key ? menuRef : undefined}
              >
                <Button
                  variant="tertiary"
                  size="sm"
                  className="fh-lock-trigger"
                  onClick={() => setMenuFor((prev) => (prev === f.key ? null : f.key))}
                  disabled={pending}
                  title={`Travado por ${lock.email || '—'} em ${formatDateTimeBR(lock.locked_at)}.`}
                  aria-label={`${f.label}: travado — abrir ações`}
                  aria-haspopup="menu"
                  aria-expanded={menuFor === f.key}
                  icon={<Lock size={18} strokeWidth={1.5} />}
                />

                {menuFor === f.key && (
                  <div role="menu" aria-label={`Ações de ${f.label}`} className="fh-person-menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => startEdit(f.key)}
                      className="fh-person-menu__item"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuFor(null)
                        setUnlockFor(f.key)
                      }}
                      className="fh-person-menu__item fh-person-menu__item--danger"
                    >
                      Destravar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="tertiary"
                size="sm"
                className="shrink-0"
                onClick={() => startEdit(f.key)}
                disabled={pending}
                title={`Editar ${f.label}`}
                aria-label={`Editar ${f.label}`}
                icon={<Pencil size={18} strokeWidth={1.5} />}
              />
            )}
          </div>
        )
      })}

      {error && (
        <div className="flex items-center justify-end">
          <span className="fh-error" role="alert">
            {error}
          </span>
        </div>
      )}

      {/*
        Substitui o window.confirm da #026. O comportamento é o mesmo —
        confirmar chama unlockField(), cancelar não chama nada — só que agora
        o aviso cabe em três linhas legíveis, em vez de um alert do navegador.
      */}
      <Dialog
        open={unlockFor !== null}
        onClose={() => setUnlockFor(null)}
        variant="danger"
        title="Destravar campo?"
        description={`"${unlockLabel}" volta a aceitar o que o cliente enviar: a próxima submissão do formulário poderá sobrescrever o valor atual.`}
        confirmLabel="Destravar"
        cancelLabel="Cancelar"
        loading={pending}
        onConfirm={() => unlockFor && handleUnlock(unlockFor)}
      />
    </div>
  )
}
