'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { searchPeople, type PersonOption } from '@/app/actions/calendar'
import { formatPhoneBR } from '@/lib/format'
import { Input } from '@/components/ui'

/**
 * Busca de pessoa — o mesmo componente no formulário de evento (Bloco 3) e na
 * bandeja de vínculo (Bloco 4). Um só, porque vincular pessoa é o MESMO gesto
 * nos dois lugares, e dois campos de busca que se comportam diferente é como o
 * Julio aprende a desconfiar do segundo.
 *
 * Server-side de propósito, como a busca dos cadastros: são ~24 pessoas hoje,
 * mas mandar a lista inteira pro client é a decisão que envelhece mal.
 *
 * O mock usa um `<select>` com todo mundo dentro; aqui é busca porque o select
 * do mock só funciona com sete pessoas de dataset dummy.
 */

const DEBOUNCE_MS = 250
const MIN_CHARS = 2

export type PersonPickerProps = {
  selected: PersonOption | null
  onSelect: (person: PersonOption | null) => void
  label?: string
  helperText?: string
  disabled?: boolean
}

export function PersonPicker({
  selected,
  onSelect,
  label = 'Cliente',
  helperText,
  disabled = false,
}: PersonPickerProps) {
  const [term, setTerm] = useState('')
  /**
   * O resultado carrega o termo que o produziu. É o que permite saber, sem
   * estado extra de "carregando", se o que está na tela corresponde ao que está
   * no campo — e evita o lampejo dos resultados de "marcela" enquanto o Julio
   * já digitou "pedro".
   */
  const [results, setResults] = useState<{ term: string; items: PersonOption[] }>({
    term: '',
    items: [],
  })
  // Cada busca carimba seu número; resposta de busca velha é descartada, senão
  // digitar rápido faz o resultado de "ma" chegar depois do de "marcela".
  const seq = useRef(0)

  const query = term.trim()
  const fresh = results.term === query
  const searching = query.length >= MIN_CHARS && !fresh

  useEffect(() => {
    if (query.length < MIN_CHARS) return

    const mine = ++seq.current
    const timer = setTimeout(async () => {
      const found = await searchPeople(query)
      if (mine !== seq.current) return
      setResults({ term: query, items: found })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

  if (selected) {
    return (
      <div className="fh-field">
        {label && <span className="fh-field__label">{label}</span>}
        <div className="fh-cal-picked">
          <Check size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>
            <strong>{selected.name ?? 'Sem nome'}</strong>
            {selected.phone && ` · ${formatPhoneBR(selected.phone)}`}
          </span>
          <button
            type="button"
            className="fh-cal-iconbtn"
            onClick={() => {
              onSelect(null)
              setTerm('')
            }}
            disabled={disabled}
            aria-label="Trocar de cliente"
          >
            <X size={15} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
        {helperText && <p className="fh-micro mt-fh-1">{helperText}</p>}
      </div>
    )
  }

  return (
    <div className="fh-cal-picker">
      <Input
        label={label}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Nome ou telefone…"
        disabled={disabled}
        autoComplete="off"
        suffix={<Search size={16} strokeWidth={1.5} />}
        helperText={helperText}
      />

      {query.length >= MIN_CHARS && (
        <ul className="fh-cal-results">
          {searching && <li className="fh-cal-results__msg">Buscando…</li>}
          {!searching && results.items.length === 0 && (
            <li className="fh-cal-results__msg">Ninguém com esse nome ou telefone.</li>
          )}
          {!searching &&
            results.items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(p)
                    setTerm('')
                  }}
                >
                  <strong>{p.name ?? 'Sem nome'}</strong>
                  {p.phone && <span>{formatPhoneBR(p.phone)}</span>}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
