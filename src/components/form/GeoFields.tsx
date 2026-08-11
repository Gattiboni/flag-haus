'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { reverseGeocode, searchPlaces, type PlaceSuggestion } from '@/lib/utils/geo'
import { Button, Input } from '@/components/ui'
import './autocomplete.css'

type GeoFieldsProps = {
  neighborhood: string
  city: string
  onNeighborhood: (value: string) => void
  onCity: (value: string) => void
  /** Guarda lat/lng no state do form pai (null se não capturou). */
  onCoords: (lat: number | null, lng: number | null) => void
  /** Coordenadas atuais do state, se houver — usadas como viés do bairro. */
  lat?: number | null
  lng?: number | null
  /** Erro inline da cidade (obrigatória); bairro segue opcional. */
  cityError?: string | null
}

// ─── Input com autocomplete Photon ─────────────────────────
// Digitação livre SEMPRE permitida; sugestões são enhancement, nunca gate.
// Enter: se o dropdown está ABERTO, seleciona e preventDefault (impede o
// handler de avanço do wizard); se fechado, deixa o Enter subir pro step.

type AutocompleteInputProps = {
  label: string
  value: string
  onChange: (v: string) => void
  onSelect: (s: PlaceSuggestion) => void
  kind: 'neighborhood' | 'city'
  bias?: { lat: number; lng: number }
  placeholder?: string
  required?: boolean
  error?: string | null
}

function AutocompleteInput({
  label,
  value,
  onChange,
  onSelect,
  kind,
  bias,
  placeholder,
  required,
  error,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)

  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // limpeza: cancela debounce e requisição pendente ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  // clique fora fecha o dropdown
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  async function runSearch(q: string) {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const results = await searchPlaces(q, kind, bias, ctrl.signal)
    if (ctrl.signal.aborted) return // superseded por busca mais nova
    setLoading(false)
    setSuggestions(results)
    setActiveIndex(results.length ? 0 : -1)
    setOpen(results.length > 0) // zero resultados → não abre
  }

  function scheduleSearch(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 3) {
      abortRef.current?.abort()
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(() => runSearch(q), 300)
  }

  function select(s: PlaceSuggestion) {
    onSelect(s)
    setOpen(false)
    setSuggestions([])
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return // dropdown fechado: Enter sobe pro handler de avanço do wizard
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % suggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
        break
      case 'Enter':
        // dropdown ABERTO: seleciona e barra o avanço do step (Item 2).
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          select(suggestions[activeIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        label={label}
        type="text"
        required={required}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          scheduleSearch(e.target.value)
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        error={error ?? undefined}
        suffix={
          loading ? (
            <span className="fh-micro" aria-live="polite">
              buscando…
            </span>
          ) : undefined
        }
      />

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="fh-suggestions absolute left-0 right-0 top-full z-20"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.label}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              // mousedown (não click) pra selecionar antes do blur fechar o menu
              onMouseDown={(e) => {
                e.preventDefault()
                select(s)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className="fh-suggestions__item"
              data-active={i === activeIndex || undefined}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Bairro/cidade sempre editáveis + botão de geolocalização best-effort.
 * Geoloc é progressive enhancement: negou/falhou → segue manual, lat/lng null,
 * sem sobrescrever o que o usuário já digitou. Bairro/cidade têm autocomplete
 * Photon (independente do reverse geocoding).
 */
export function GeoFields({
  neighborhood,
  city,
  onNeighborhood,
  onCity,
  onCoords,
  lat,
  lng,
  cityError,
}: GeoFieldsProps) {
  const [locating, setLocating] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  // De onde vieram as coords que estão no state do pai, quando vieram de uma
  // sugestão. Guarda o texto exato selecionado pra detectar que o usuário
  // digitou por cima depois — nesse caso a coordenada não vale mais.
  // Fica null quando as coords vieram do GPS: digitar por cima do bairro que o
  // reverse preencheu NÃO invalida uma coordenada real do aparelho.
  const coordOriginRef = useRef<{
    field: 'neighborhood' | 'city'
    text: string
  } | null>(null)

  const bias =
    typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : undefined

  /** Digitação livre sobre o campo que originou as coords → descarta as coords. */
  function invalidateIfTypedOver(field: 'neighborhood' | 'city', value: string) {
    const origin = coordOriginRef.current
    if (origin && origin.field === field && value !== origin.text) {
      coordOriginRef.current = null
      onCoords(null, null)
    }
  }

  function handleNeighborhoodChange(v: string) {
    invalidateIfTypedOver('neighborhood', v)
    onNeighborhood(v)
  }
  function handleCityChange(v: string) {
    invalidateIfTypedOver('city', v)
    onCity(v)
  }

  function handleLocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setHint('Localização indisponível — pode digitar abaixo.')
      return
    }
    setLocating(true)
    setHint(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        // GPS ganha de qualquer sugestão selecionada antes: é a coordenada real.
        coordOriginRef.current = null
        onCoords(latitude, longitude)
        const geo = await reverseGeocode(latitude, longitude)
        // não sobrescreve o que o usuário já digitou
        if (geo.neighborhood && !neighborhood.trim()) onNeighborhood(geo.neighborhood)
        if (geo.city && !city.trim()) onCity(geo.city)
        setLocating(false)
      },
      (err) => {
        // negado / erro / timeout: degrada pra manual, agora com rastro.
        console.warn(
          `[GeoFields] geolocation falhou (code=${err.code}): ${err.message} — segue manual, lat/lng null`
        )
        coordOriginRef.current = null
        onCoords(null, null)
        setLocating(false)
        setHint('Sem problema — é só digitar abaixo.')
      },
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }

  /**
   * Selecionar sugestão carimba o centroide dela em lat/lng — é o caminho que
   * até aqui perdia a coordenada. Sugestão sem geometry → mantém o que havia
   * (não zera à toa) e loga.
   */
  function adoptCoords(s: PlaceSuggestion, field: 'neighborhood' | 'city', text: string) {
    if (s.lat === null || s.lng === null) {
      console.warn(
        `[GeoFields] sugestão "${s.label}" (${field}) veio sem coordenada — lat/lng inalterados`
      )
      return
    }
    coordOriginRef.current = { field, text }
    onCoords(s.lat, s.lng)
  }

  // Bairro: se cidade vazia, preenche com a cidade da sugestão; se já tem, não
  // sobrescreve. Cidade: preenche só a cidade.
  function handleNeighborhoodSelect(s: PlaceSuggestion) {
    if (s.neighborhood) onNeighborhood(s.neighborhood)
    if (s.city && !city.trim()) onCity(s.city)
    if (s.neighborhood) adoptCoords(s, 'neighborhood', s.neighborhood)
  }
  function handleCitySelect(s: PlaceSuggestion) {
    if (!s.city) return
    onCity(s.city)
    // Centroide de cidade é grosseiro: só assume se ainda não há coordenada
    // (GPS ou bairro selecionado são estritamente melhores).
    const hasCoords = typeof lat === 'number' && typeof lng === 'number'
    if (!hasCoords) adoptCoords(s, 'city', s.city)
  }

  return (
    <div className="flex flex-col gap-fh-5 mt-fh-6">
      <div>
        <Button
          variant="secondary"
          onClick={handleLocate}
          disabled={locating}
          loading={locating}
          icon={<MapPin size={18} strokeWidth={1.5} />}
        >
          {locating ? 'Localizando…' : 'Usar minha localização'}
        </Button>
        {hint && <p className="fh-micro mt-fh-2">{hint}</p>}
      </div>

      <AutocompleteInput
        label="Bairro"
        value={neighborhood}
        onChange={handleNeighborhoodChange}
        onSelect={handleNeighborhoodSelect}
        kind="neighborhood"
        bias={bias}
        placeholder="Seu bairro"
      />

      <AutocompleteInput
        label="Cidade"
        value={city}
        onChange={handleCityChange}
        onSelect={handleCitySelect}
        kind="city"
        placeholder="Sua cidade"
        required
        error={cityError}
      />
    </div>
  )
}
