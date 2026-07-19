'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { updatePerson, unlockField } from '@/app/actions/admin-people'
import type { PersonField } from '@/app/admin/_ui/person-fields'
import { formatDateBR, formatDateTimeBR } from '@/app/admin/_ui/format'
import { formatPhoneBR } from '@/lib/format'
import { isEligibleAge } from '@/lib/utils/age'

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

  function handleUnlock(key: PersonField) {
    if (pending) return
    setMenuFor(null)
    if (!window.confirm(`Destravar ${key}? A próxima submissão do formulário poderá sobrescrever.`)) {
      return
    }
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

  return (
    <div className="flex flex-col gap-3">
      {FIELDS.map((f) => {
        const lock = locks[f.key]
        const isEditing = editing === f.key

        return (
          <div key={f.key} className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--granite)]">
                {f.label}
              </span>

              <div className="mt-1">
                {isEditing ? (
                  f.kind === 'select' ? (
                    <select
                      value={draft}
                      disabled={pending}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      aria-label={f.label}
                      className="w-full border-b border-[color:var(--onyx)] bg-transparent py-1 focus:outline-none transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {f.options.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
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
                      aria-label={f.label}
                      className="w-full border-b border-[color:var(--onyx)] bg-transparent py-1 focus:outline-none transition-colors disabled:opacity-50"
                    />
                  )
                ) : (
                  <p
                    className={`w-full border-b border-[color:var(--line)] py-1 truncate ${
                      values[f.key].trim() ? '' : 'text-[color:var(--granite)]'
                    }`}
                    title={displayValue(f, values[f.key])}
                  >
                    {displayValue(f, values[f.key])}
                  </p>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="shrink-0 flex items-center gap-3 pb-1">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={pending}
                  className="text-xs text-[color:var(--granite)] hover:text-[color:var(--onyx)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(f.key)}
                  disabled={pending}
                  className="text-xs tracking-[0.04em] px-4 py-1.5 rounded-full bg-[color:var(--onyx)] text-[color:var(--white)] border border-[color:var(--onyx)] hover:bg-[color:var(--oxblood)] hover:border-[color:var(--oxblood)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
                >
                  {pending ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            ) : lock ? (
              <div
                className="shrink-0 relative pb-1"
                ref={menuFor === f.key ? menuRef : undefined}
              >
                <button
                  type="button"
                  onClick={() => setMenuFor((prev) => (prev === f.key ? null : f.key))}
                  disabled={pending}
                  title={`Travado por ${lock.email || '—'} em ${formatDateTimeBR(lock.locked_at)}.`}
                  aria-label={`${f.label}: travado — abrir ações`}
                  aria-haspopup="menu"
                  aria-expanded={menuFor === f.key}
                  className="text-[color:var(--oxblood)] hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  🔒
                </button>

                {menuFor === f.key && (
                  <div
                    role="menu"
                    aria-label={`Ações de ${f.label}`}
                    className="absolute right-0 top-full z-10 mt-1 w-40 rounded border border-[color:var(--line)] bg-[color:var(--white)] py-1 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => startEdit(f.key)}
                      className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[color:var(--whisper)] transition-colors cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleUnlock(f.key)}
                      className="block w-full px-3 py-1.5 text-left text-xs text-[color:var(--oxblood)] hover:bg-[color:var(--whisper)] transition-colors cursor-pointer"
                    >
                      Destravar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startEdit(f.key)}
                disabled={pending}
                title={`Editar ${f.label}`}
                aria-label={`Editar ${f.label}`}
                className="shrink-0 pb-1 text-[color:var(--granite)] hover:text-[color:var(--onyx)] transition-colors cursor-pointer disabled:opacity-50"
              >
                ✎
              </button>
            )}
          </div>
        )
      })}

      {error && (
        <div className="flex items-center justify-end pt-1">
          <span className="text-xs text-[color:var(--oxblood)]" role="alert">
            {error}
          </span>
        </div>
      )}
    </div>
  )
}
