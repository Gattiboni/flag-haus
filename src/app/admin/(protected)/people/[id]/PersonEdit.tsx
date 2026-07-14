'use client'

import { useState, useTransition } from 'react'
import { updatePerson, unlockField } from '@/app/actions/admin-people'
import type { PersonField } from '@/app/admin/_ui/person-fields'
import { formatDateTimeBR } from '@/app/admin/_ui/format'
import { isEligibleAge } from '@/lib/utils/age'

/**
 * Edição de pessoa com trava por campo (#4c §5-bis). "Admin ganha por padrão":
 * todo campo que muda de valor ganha um cadeado; a próxima submissão do form
 * (depois da migration do Alan) respeita a trava. Destravar é explícito.
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
  const [base, setBase] = useState<Record<PersonField, string>>(initial)
  const [locks, setLocks] = useState<Partial<Record<PersonField, LockInfo>>>(initialLocks)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const changedKeys = FIELDS.filter((f) => values[f.key] !== base[f.key]).map((f) => f.key)
  const dirty = changedKeys.length > 0

  function set(key: PersonField, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  function handleSave() {
    if (!dirty || pending) return
    setError(null)

    if (changedKeys.includes('name')) {
      const n = values.name.trim()
      if (n.length < 1 || n.length > 200) {
        return setError('Nome deve ter entre 1 e 200 caracteres.')
      }
    }
    if (changedKeys.includes('birth_date') && !isEligibleAge(values.birth_date)) {
      return setError('A pessoa precisa ter 18 anos completos.')
    }
    if (changedKeys.includes('phone') && !window.confirm(PHONE_WARNING)) {
      return
    }

    const patch: Record<string, unknown> = {}
    for (const key of changedKeys) {
      const cfg = FIELDS.find((f) => f.key === key)!
      const v = values[key]
      // selects vazios viram null (o enum do server não aceita ''); textos vão
      // como string e o server normaliza vazio → null.
      patch[key] = cfg.kind === 'select' && v === '' ? null : v
    }

    startTransition(async () => {
      const res = await updatePerson({ personId, patch })
      if (res.status === 'ok') {
        setBase({ ...values })
        const now = new Date().toISOString()
        setLocks((prev) => {
          const next = { ...prev }
          for (const key of res.lockedNow) {
            next[key] = { email: operatorEmail, locked_at: now }
          }
          return next
        })
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
        return (
          <div key={f.key} className="flex items-end gap-2">
            <label className="flex-1 min-w-0 block">
              <span className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--granite)]">
                {f.label}
              </span>
              <div className="mt-1">
                {f.kind === 'select' ? (
                  <select
                    value={values[f.key]}
                    disabled={pending}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="w-full border-b border-[color:var(--line)] bg-transparent py-1 focus:outline-none focus:border-[color:var(--onyx)] transition-colors disabled:opacity-50 cursor-pointer"
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
                    value={values[f.key]}
                    disabled={pending}
                    placeholder="—"
                    onChange={(e) => set(f.key, e.target.value)}
                    className="w-full border-b border-[color:var(--line)] bg-transparent py-1 focus:outline-none focus:border-[color:var(--onyx)] transition-colors disabled:opacity-50"
                  />
                )}
              </div>
            </label>

            {lock ? (
              <button
                type="button"
                onClick={() => handleUnlock(f.key)}
                disabled={pending}
                title={`Travado por ${lock.email || '—'} em ${formatDateTimeBR(lock.locked_at)}. Clique para destravar.`}
                aria-label={`Destravar ${f.label}`}
                className="shrink-0 pb-1 text-[color:var(--oxblood)] hover:opacity-70 transition-opacity cursor-pointer disabled:opacity-50"
              >
                🔒
              </button>
            ) : (
              <span
                className="shrink-0 pb-1 text-[color:var(--granite)] opacity-40 select-none"
                title="Sem trava"
                aria-hidden="true"
              >
                🔓
              </span>
            )}
          </div>
        )
      })}

      {(dirty || error) && (
        <div className="flex items-center justify-end gap-4 pt-1">
          {error && (
            <span className="text-xs text-[color:var(--oxblood)]" role="alert">
              {error}
            </span>
          )}
          {dirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="text-sm tracking-[0.04em] px-5 py-2 rounded-full bg-[color:var(--onyx)] text-[color:var(--white)] border border-[color:var(--onyx)] hover:bg-[color:var(--oxblood)] hover:border-[color:var(--oxblood)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              {pending ? 'Salvando…' : 'Salvar'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
