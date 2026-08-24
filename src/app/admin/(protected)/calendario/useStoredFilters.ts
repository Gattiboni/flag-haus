'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  DEFAULT_FILTERS,
  FILTERS_STORAGE_KEY,
  decodeFilters,
  encodeFilters,
  type CalendarFilters,
} from '@/app/admin/_ui/calendario'

/**
 * Os filtros do calendário, com o localStorage como fonte da verdade.
 *
 * `useSyncExternalStore` e não `useState` + efeito de hidratação: o
 * localStorage é literalmente um "external store", e é para ele que esta API
 * existe. O caminho do `useState` precisaria ler a preferência num efeito pós
 * mount — um render a mais mostrando filtros que não são os do Julio, e um
 * `setState` síncrono dentro de efeito, que a régua de hooks do repo recusa.
 *
 * O snapshot é a STRING crua do storage, não o objeto decodificado: string
 * compara por valor, então o React só re-renderiza quando a preferência muda de
 * verdade. Decodificar a cada snapshot devolveria um objeto novo toda vez e
 * renderizaria em loop.
 */

type Listener = () => void

const listeners = new Set<Listener>()

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  // `storage` cobre a outra aba: o Julio abre o calendário em duas e as duas
  // ficam com o mesmo recorte.
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function getSnapshot(): string | null {
  return window.localStorage.getItem(FILTERS_STORAGE_KEY)
}

/** No servidor não há preferência: o primeiro HTML sai com o default. */
function getServerSnapshot(): string | null {
  return null
}

export function useStoredFilters(): [
  CalendarFilters,
  (next: CalendarFilters | ((prev: CalendarFilters) => CalendarFilters)) => void,
] {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // A decodificação é tolerante a chave nova e a lixo (item 19).
  const filters = useMemo(() => decodeFilters(raw), [raw])

  const setFilters = useCallback(
    (next: CalendarFilters | ((prev: CalendarFilters) => CalendarFilters)) => {
      const current = decodeFilters(window.localStorage.getItem(FILTERS_STORAGE_KEY))
      const value = typeof next === 'function' ? next(current) : next
      window.localStorage.setItem(FILTERS_STORAGE_KEY, encodeFilters(value))
      // `storage` não dispara na aba que escreveu — o aviso é nosso.
      for (const listener of listeners) listener()
    },
    []
  )

  return [filters, setFilters]
}

export { DEFAULT_FILTERS }
